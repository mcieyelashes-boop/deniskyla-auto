// Real web-scraping toolkit. Zero npm deps — pure Node built-ins (global fetch,
// AbortController) + regex-based HTML extraction. Designed for serverless (Vercel).
//
// Everything here is DEFENSIVE: a single failed fetch or parse never throws out
// of the public functions — callers get a structured result or an empty list so
// agents can collect whatever they can within their time budget.

import dns from "node:dns/promises";
import net from "node:net";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── SSRF protection ─────────────────────────────────────────────────────────
// The SEO/GEO agents fetch user-supplied URLs server-side, so every outbound
// request must be restricted to public http(s) hosts. We resolve DNS and reject
// any private/loopback/link-local/reserved IP (defeats DNS-rebinding), and we
// follow redirects manually so each hop is re-validated (defeats redirect-SSRF).

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;        // this-host / private / loopback
    if (p[0] === 169 && p[1] === 254) return true;                      // link-local + cloud metadata (169.254.169.254)
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;          // private
    if (p[0] === 192 && p[1] === 168) return true;                      // private
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;         // CGNAT
    if (p[0] >= 224) return true;                                       // multicast / reserved
    return false;
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;                           // loopback / unspecified
  if (v.startsWith("fe80")) return true;                                // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true;            // unique-local
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));          // IPv4-mapped IPv6
  return false;
}

// Returns { ok } or { ok:false, reason }. Never throws.
async function assertPublicUrl(url) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, reason: "invalid URL" }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, reason: `blocked scheme ${u.protocol}` };
  if (u.username || u.password) return { ok: false, reason: "credentials in URL" };
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(host)) {
    return { ok: false, reason: "blocked host" };
  }
  let addrs;
  if (net.isIP(host)) {
    addrs = [host];
  } else {
    try { addrs = (await dns.lookup(host, { all: true })).map((a) => a.address); }
    catch { return { ok: false, reason: "DNS resolution failed" }; }
  }
  if (!addrs || !addrs.length) return { ok: false, reason: "no address" };
  for (const a of addrs) {
    if (isPrivateIp(a)) return { ok: false, reason: `private address (${a})` };
  }
  return { ok: true };
}

// fetch() with SSRF validation on every redirect hop. Throws an Error with
// `.ssrf = true` if any hop is blocked. Returns { resp, finalUrl }.
async function safeFetch(url, opts = {}, { maxRedirects = 4 } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const guard = await assertPublicUrl(current);
    if (!guard.ok) {
      const e = new Error(`SSRF blocked: ${guard.reason}`);
      e.ssrf = true;
      throw e;
    }
    const resp = await fetch(current, { ...opts, redirect: "manual" });
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (loc) {
        current = new URL(loc, current).toString();
        continue;
      }
    }
    return { resp, finalUrl: current };
  }
  const e = new Error("too many redirects");
  e.ssrf = true;
  throw e;
}

// DoS defense: never buffer more than this from a single page. Agents only need
// the head + visible text, so 2 MB is ample; a malicious/huge page is truncated.
const MAX_HTML_BYTES = 2_000_000;

// Read a response body up to maxBytes, streaming so we never buffer a giant
// payload. Cancels the stream once the cap is hit. Never throws.
async function readCappedText(resp, maxBytes = MAX_HTML_BYTES) {
  const declared = Number(resp.headers.get("content-length") || 0);
  const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
  if (!reader) {
    const t = await resp.text().catch(() => "");
    return t.length > maxBytes ? t.slice(0, maxBytes) : t;
  }
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      total += value.length;
      if (total >= maxBytes) {
        try { await reader.cancel(); } catch { /* ignore */ }
        break;
      }
    }
  } catch {
    /* return whatever we collected */
  }
  // declared length is advisory only; the streamed cap above is authoritative.
  void declared;
  return Buffer.concat(chunks).toString("utf-8").slice(0, maxBytes);
}

/**
 * Fetch a page with a realistic User-Agent and an AbortController timeout.
 * Body is capped at MAX_HTML_BYTES to bound memory (DoS defense).
 * Never throws — returns { ok, status, html, finalUrl, error? }.
 */
export async function fetchPage(url, { timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { resp, finalUrl } = await safeFetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await readCappedText(resp);
    return {
      ok: resp.ok,
      status: resp.status,
      html,
      finalUrl: finalUrl || url,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      html: "",
      finalUrl: url,
      error: e?.ssrf
        ? "blocked (ssrf)"
        : e?.name === "AbortError"
        ? "timeout"
        : String(e?.message || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Strip scripts/styles/tags and decode common entities → visible text. */
export function extractText(html) {
  if (!html || typeof html !== "string") return "";
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|br|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  t = decodeEntities(t);
  return t.replace(/[ \t\f\v]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return " ";
      }
    });
}

const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;

const JUNK_EMAIL_RE =
  /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?)$/i;

const JUNK_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "domain.com",
  "email.com",
  "yourdomain.com",
  "sentry.io",
  "wixpress.com",
  "godaddy.com",
]);

/** Unique, de-junked email addresses found in html or plain text. */
export function extractEmails(input) {
  if (!input || typeof input !== "string") return [];
  // Also catch obfuscated "name [at] domain.com" / "name (at) domain".
  // IMPORTANT: only de-obfuscate when "at" is wrapped in brackets/parens —
  // a bare "at" must NOT match (otherwise "whatsapp" -> "wh@sapp").
  const deobf = input.replace(/\s*[\[(]\s*at\s*[\])]\s*/gi, "@");
  const found = (deobf.match(EMAIL_RE) || []).map((e) => e.toLowerCase());
  const out = new Set();
  for (const e of found) {
    if (JUNK_EMAIL_RE.test(e)) continue;
    const domain = e.split("@")[1] || "";
    if (!domain.includes(".")) continue;
    if (JUNK_DOMAINS.has(domain)) continue;
    if (/^[0-9a-f]{8,}@/.test(e)) continue; // hash-looking locals (sentry etc.)
    out.add(e);
  }
  return [...out];
}

/** Absolute URLs from <a href> resolved against baseUrl. */
export function extractLinks(html, baseUrl) {
  if (!html || typeof html !== "string") return [];
  const out = new Set();
  const re = /<a\b[^>]*?href\s*=\s*["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("mailto:"))
      continue;
    try {
      out.add(new URL(raw, baseUrl).toString());
    } catch {
      /* skip malformed */
    }
  }
  return [...out];
}

/**
 * SERP search without any API key. Tries DuckDuckGo HTML, falls back to Bing.
 * Returns [{ url, title, snippet }]. Always returns an array (possibly empty).
 */
export async function searchWeb(query, { limit = 10 } = {}) {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return [];

  let results = await ddgSearch(q, limit).catch(() => []);
  if (!results.length) {
    results = await bingSearch(q, limit).catch(() => []);
  }
  return results.slice(0, limit);
}

async function ddgSearch(q, limit) {
  const res = await fetchPage(`https://html.duckduckgo.com/html/?q=${q}`, {
    timeoutMs: 9000,
  });
  if (!res.ok || !res.html) return [];
  const out = [];
  // DDG result anchors carry class result__a; href is often a /l/?uddg= redirect.
  const re =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(res.html)) !== null && out.length < limit) {
    const url = unwrapDdg(decodeEntities(m[1]));
    const title = extractText(m[2]).trim();
    if (url) out.push({ url, title, snippet: "" });
  }
  // Attach snippets best-effort.
  const snippets = [];
  const sre =
    /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let sm;
  while ((sm = sre.exec(res.html)) !== null) {
    snippets.push(extractText(sm[1]).trim());
  }
  out.forEach((r, i) => {
    if (snippets[i]) r.snippet = snippets[i];
  });
  return out;
}

function unwrapDdg(href) {
  try {
    if (href.startsWith("//")) href = "https:" + href;
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return u.toString();
  } catch {
    return href.startsWith("http") ? href : "";
  }
}

async function bingSearch(q, limit) {
  const res = await fetchPage(`https://www.bing.com/search?q=${q}&setlang=en`, {
    timeoutMs: 9000,
  });
  if (!res.ok || !res.html) return [];
  const out = [];
  const seen = new Set();
  // Current Bing markup: organic title links are
  //   <h2 ...><a href="...bing.com/ck/a?...&u=a1<base64>..." h="ID=SERP,N.M">title</a>
  // Requiring the h="ID=SERP attribute filters out Bing's app/suggestion chrome
  // (WhatsApp Web, Google, etc.) and keeps only real organic results.
  const titleRe =
    /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*\sh="ID=SERP[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = titleRe.exec(res.html)) !== null && out.length < limit) {
    const url = unwrapBing(decodeEntities(m[1]));
    const title = extractText(m[2]).trim();
    if (url && url.startsWith("http") && !seen.has(url)) {
      seen.add(url);
      out.push({ url, title, snippet: "" });
    }
  }
  return out;
}

// Bing wraps result links in a /ck/a redirect with the real URL base64-encoded
// in the `u` param (prefixed "a1"). Unwrap it back to the destination URL.
function unwrapBing(href) {
  try {
    const u = new URL(href, "https://www.bing.com");
    if (/\/ck\/a/i.test(u.pathname)) {
      const enc = u.searchParams.get("u");
      if (enc && enc.startsWith("a1")) {
        let b64 = enc.slice(2).replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const real = Buffer.from(b64, "base64").toString("utf8");
        if (real.startsWith("http")) return real;
      }
      return ""; // unresolvable redirect — skip
    }
    return u.toString();
  } catch {
    return "";
  }
}

/** Best-effort list of URLs from a domain's /sitemap.xml (and sitemap index). */
export async function crawlSitemap(domain) {
  if (!domain) return [];
  let base;
  try {
    base = new URL(
      domain.startsWith("http") ? domain : `https://${domain}`
    );
  } catch {
    return [];
  }
  const root = `${base.protocol}//${base.host}`;
  const seen = new Set();

  async function readSitemap(url, depth = 0) {
    if (depth > 2 || seen.has(url)) return [];
    seen.add(url);
    const res = await fetchPage(url, { timeoutMs: 8000 });
    if (!res.ok || !res.html) return [];
    const locs = [...res.html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(
      (m) => decodeEntities(m[1])
    );
    // If this is a sitemap index, locs point to nested sitemaps.
    if (/<sitemapindex/i.test(res.html)) {
      const nested = [];
      for (const loc of locs.slice(0, 5)) {
        nested.push(...(await readSitemap(loc, depth + 1)));
      }
      return nested;
    }
    return locs;
  }

  const urls = await readSitemap(`${root}/sitemap.xml`).catch(() => []);
  return [...new Set(urls)];
}

/**
 * Lightweight HEAD request to check whether a URL resolves OK. Never throws —
 * returns { url, ok, status }. Falls back to a ranged GET when a server rejects
 * HEAD (405/501) so we don't false-flag links that simply disallow HEAD.
 */
export async function headStatus(url, { timeoutMs = 7000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let { resp } = await safeFetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*" },
    });
    // Some servers refuse HEAD — retry once with a tiny ranged GET.
    if (resp.status === 405 || resp.status === 501) {
      ({ resp } = await safeFetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "*/*", Range: "bytes=0-0" },
      }));
    }
    return { url, ok: resp.ok, status: resp.status };
  } catch (e) {
    return {
      url,
      ok: false,
      status: 0,
      error: e?.ssrf ? "blocked (ssrf)" : e?.name === "AbortError" ? "timeout" : String(e?.message || e),
    };
  } finally {
    clearTimeout(timer);
  }
}
