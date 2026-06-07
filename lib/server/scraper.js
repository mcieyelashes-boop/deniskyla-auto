// Real web-scraping toolkit. Zero npm deps — pure Node built-ins (global fetch,
// AbortController) + regex-based HTML extraction. Designed for serverless (Vercel).
//
// Everything here is DEFENSIVE: a single failed fetch or parse never throws out
// of the public functions — callers get a structured result or an empty list so
// agents can collect whatever they can within their time budget.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetch a page with a realistic User-Agent and an AbortController timeout.
 * Never throws — returns { ok, status, html, finalUrl, error? }.
 */
export async function fetchPage(url, { timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await resp.text().catch(() => "");
    return {
      ok: resp.ok,
      status: resp.status,
      html,
      finalUrl: resp.url || url,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      html: "",
      finalUrl: url,
      error: e?.name === "AbortError" ? "timeout" : String(e?.message || e),
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
  // Also catch obfuscated "name [at] domain.com"
  const deobf = input.replace(/\s*\[?\(?\s*at\s*\)?\]?\s*/gi, "@");
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
  const res = await fetchPage(`https://www.bing.com/search?q=${q}`, {
    timeoutMs: 9000,
  });
  if (!res.ok || !res.html) return [];
  const out = [];
  // Bing organic results: <li class="b_algo"> <h2><a href="...">title</a></h2> ...
  const blockRe = /<li class="b_algo">([\s\S]*?)<\/li>/gi;
  let bm;
  while ((bm = blockRe.exec(res.html)) !== null && out.length < limit) {
    const block = bm[1];
    const a = /<h2>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(
      block
    );
    if (!a) continue;
    const url = decodeEntities(a[1]);
    const title = extractText(a[2]).trim();
    const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
    const snippet = p ? extractText(p[1]).trim() : "";
    if (url && url.startsWith("http")) out.push({ url, title, snippet });
  }
  return out;
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
