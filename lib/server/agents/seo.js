// SEO agent — REAL work. Two modes:
//   1. On-page audit (task contains a URL): fetch the page, extract real
//      on-page signals from the HTML, compute a 0-100 score, and have Claude
//      turn the findings into prioritized recommendations.
//   2. Keyword/SERP analysis (no URL): derive seed keyword(s) via Claude,
//      search the web, collect the top ranking URLs + titles, and have Claude
//      analyze the competitive landscape, content gaps, and a content outline.
//
// Time budget: serverless ~60s. Audit fetches a single page; SERP mode fetches
// none beyond the search. Never throws on a failed fetch — degrades gracefully.

import { callClaudeJSON } from "../claudeServer.js";
import { fetchPage, extractText, extractLinks, searchWeb } from "../scraper.js";

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/i;

export async function seo({ task, userApiKey }) {
  const urlMatch = (task || "").match(URL_RE);
  if (urlMatch) {
    return auditMode(urlMatch[0].replace(/[.,;]+$/, ""), task, userApiKey);
  }
  return serpMode(task, userApiKey);
}

// ─────────────────────────────────────────────────────────────────────────
// MODE 1: On-page audit
// ─────────────────────────────────────────────────────────────────────────
async function auditMode(url, task, userApiKey) {
  const res = await fetchPage(url, { timeoutMs: 12000 });
  if (!res.ok || !res.html) {
    const note = `Could not fetch ${url} (${res.error || res.status}). Unable to run on-page audit.`;
    return {
      output: note,
      outputData: {
        kind: "seo",
        mode: "audit",
        url,
        score: 0,
        signals: {},
        recommendations: [],
        error: res.error || `HTTP ${res.status}`,
      },
    };
  }

  const signals = extractSignals(res.html, res.finalUrl);
  const score = scoreSignals(signals);

  // Ask Claude to prioritize fixes from the concrete findings.
  let recommendations = [];
  try {
    const out = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 900,
      system:
        "You are an expert technical SEO auditor. Given concrete on-page " +
        "signals extracted from a real page, output prioritized, specific " +
        "recommendations. Output ONLY JSON: " +
        '{"recommendations": [{"priority": "high"|"medium"|"low", "issue": "<what is wrong>", "fix": "<concrete action>"}]}',
      userMsg:
        `URL: ${res.finalUrl}\nComputed SEO score: ${score}/100\n\n` +
        `Extracted signals:\n${JSON.stringify(signals, null, 2)}`,
    });
    recommendations = Array.isArray(out.recommendations)
      ? out.recommendations
      : [];
  } catch {
    recommendations = deriveLocalRecs(signals);
  }
  if (!recommendations.length) recommendations = deriveLocalRecs(signals);

  const output = buildAuditReport(res.finalUrl, score, signals, recommendations);

  return {
    output,
    outputData: {
      kind: "seo",
      mode: "audit",
      url: res.finalUrl,
      score,
      signals,
      recommendations,
    },
  };
}

// Extract REAL on-page SEO signals from raw HTML.
function extractSignals(html, baseUrl) {
  const title = matchOne(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
  const metaDesc = metaContent(html, "description");
  const metaRobots = metaContent(html, "robots");
  const canonical = matchAttr(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    html
  );
  const viewport = !!metaContent(html, "viewport");

  const h1s = headings(html, 1);
  const h2s = headings(html, 2);
  const h3s = headings(html, 3);

  const text = extractText(html);
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  // Images + missing alt.
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imageCount = imgTags.length;
  const imagesMissingAlt = imgTags.filter(
    (t) => !/\balt\s*=\s*["'][^"']*\S[^"']*["']/i.test(t)
  ).length;

  // Internal vs external links.
  let host = "";
  try {
    host = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const links = extractLinks(html, baseUrl);
  let internalLinks = 0;
  let externalLinks = 0;
  for (const l of links) {
    try {
      const h = new URL(l).hostname.replace(/^www\./, "");
      if (host && h === host) internalLinks++;
      else externalLinks++;
    } catch {
      /* skip */
    }
  }

  // Structured data + Open Graph.
  const hasLdJson = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);
  const hasMicrodata = /\bitemscope\b/i.test(html) || /schema\.org/i.test(html);
  const ogTags = (html.match(/<meta[^>]*property=["']og:[^"']+["']/gi) || [])
    .length;

  return {
    title: { text: title, length: title.length },
    metaDescription: { text: metaDesc, length: metaDesc.length },
    metaRobots: metaRobots || null,
    canonical: canonical || null,
    viewport,
    headings: {
      h1Count: h1s.length,
      h2Count: h2s.length,
      h3Count: h3s.length,
      h1: h1s.slice(0, 3),
      h2: h2s.slice(0, 6),
    },
    wordCount,
    images: { total: imageCount, missingAlt: imagesMissingAlt },
    links: { internal: internalLinks, external: externalLinks },
    structuredData: { ldJson: hasLdJson, microdataOrSchema: hasMicrodata },
    openGraphTags: ogTags,
  };
}

// Simple weighted 0-100 SEO score from extracted signals.
function scoreSignals(s) {
  let score = 0;
  // Title (20)
  if (s.title.length > 0) score += 10;
  if (s.title.length >= 30 && s.title.length <= 60) score += 10;
  // Meta description (15)
  if (s.metaDescription.length > 0) score += 7;
  if (s.metaDescription.length >= 120 && s.metaDescription.length <= 160)
    score += 8;
  // Exactly one H1 (12)
  if (s.headings.h1Count === 1) score += 12;
  else if (s.headings.h1Count > 1) score += 4;
  // Subheadings present (6)
  if (s.headings.h2Count >= 1) score += 6;
  // Word count > 300 (12)
  if (s.wordCount > 300) score += 12;
  else if (s.wordCount > 150) score += 6;
  // Canonical (8)
  if (s.canonical) score += 8;
  // Viewport (5)
  if (s.viewport) score += 5;
  // Structured data (10)
  if (s.structuredData.ldJson) score += 7;
  else if (s.structuredData.microdataOrSchema) score += 4;
  // Open Graph (5)
  if (s.openGraphTags >= 3) score += 5;
  else if (s.openGraphTags >= 1) score += 2;
  // Images have alt (7)
  if (s.images.total === 0) score += 4;
  else if (s.images.missingAlt === 0) score += 7;
  else if (s.images.missingAlt / s.images.total <= 0.25) score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Fallback recommendations derived purely from signals (no Claude).
function deriveLocalRecs(s) {
  const recs = [];
  if (!s.title.length)
    recs.push({ priority: "high", issue: "Missing <title>", fix: "Add a descriptive 30-60 char title tag." });
  else if (s.title.length < 30 || s.title.length > 60)
    recs.push({ priority: "medium", issue: `Title length ${s.title.length} chars`, fix: "Aim for 30-60 characters." });
  if (!s.metaDescription.length)
    recs.push({ priority: "high", issue: "Missing meta description", fix: "Add a 120-160 char meta description." });
  if (s.headings.h1Count !== 1)
    recs.push({ priority: "high", issue: `${s.headings.h1Count} H1 tags`, fix: "Use exactly one H1 per page." });
  if (s.wordCount <= 300)
    recs.push({ priority: "medium", issue: `Thin content (${s.wordCount} words)`, fix: "Expand to 300+ words of useful content." });
  if (!s.canonical)
    recs.push({ priority: "medium", issue: "No canonical tag", fix: "Add a rel=canonical link." });
  if (!s.structuredData.ldJson && !s.structuredData.microdataOrSchema)
    recs.push({ priority: "medium", issue: "No structured data", fix: "Add JSON-LD schema.org markup." });
  if (s.images.total && s.images.missingAlt)
    recs.push({ priority: "low", issue: `${s.images.missingAlt}/${s.images.total} images missing alt`, fix: "Add descriptive alt text to all images." });
  return recs;
}

function buildAuditReport(url, score, s, recs) {
  const findings = [
    `Title: ${s.title.text ? `"${truncate(s.title.text, 70)}" (${s.title.length} chars)` : "MISSING"}`,
    `Meta description: ${s.metaDescription.length ? `${s.metaDescription.length} chars` : "MISSING"}`,
    `H1: ${s.headings.h1Count} • H2: ${s.headings.h2Count} • H3: ${s.headings.h3Count}`,
    `Word count: ${s.wordCount}`,
    `Images: ${s.images.total} (${s.images.missingAlt} missing alt)`,
    `Links: ${s.links.internal} internal / ${s.links.external} external`,
    `Canonical: ${s.canonical ? "yes" : "no"} • Viewport: ${s.viewport ? "yes" : "no"}`,
    `Structured data: ${s.structuredData.ldJson ? "JSON-LD" : s.structuredData.microdataOrSchema ? "schema.org" : "none"} • OG tags: ${s.openGraphTags}`,
  ];
  const recLines = recs
    .slice(0, 8)
    .map((r) => `• [${(r.priority || "med").toUpperCase()}] ${r.issue || ""}${r.fix ? ` → ${r.fix}` : ""}`);
  return (
    `SEO on-page audit — ${url}\nScore: ${score}/100\n\n` +
    `Findings:\n${findings.map((f) => `• ${f}`).join("\n")}\n\n` +
    `Top recommendations:\n${recLines.join("\n")}`
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MODE 2: Keyword / SERP analysis
// ─────────────────────────────────────────────────────────────────────────
async function serpMode(task, userApiKey) {
  // 1. Derive the seed keyword from the task.
  let keyword = (task || "").trim();
  try {
    const plan = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 200,
      system:
        "You extract the primary SEO target keyword from a task. Output ONLY " +
        'JSON: {"keyword": "<the single best seed search keyword>"}',
      userMsg: `Task: ${task}`,
    });
    if (plan.keyword) keyword = String(plan.keyword).trim();
  } catch {
    /* keep raw task as keyword */
  }
  if (!keyword) keyword = task || "";

  // 2. Pull the SERP for the main keyword.
  const results = await searchWeb(keyword, { limit: 10 });
  const serp = results.slice(0, 10).map((r, i) => ({
    rank: i + 1,
    url: r.url,
    title: r.title || "",
    snippet: r.snippet || "",
  }));

  // 3. Analyze the competitive landscape.
  let analysis = {
    keywords: [],
    contentGaps: [],
    outline: [],
    recommendations: [],
  };
  try {
    analysis = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 1100,
      system:
        "You are an SEO strategist analyzing a SERP. Output ONLY JSON: " +
        '{"keywords": ["<5-8 target keywords incl. long-tail>"], ' +
        '"contentGaps": ["<gaps the ranking pages miss>"], ' +
        '"outline": ["<H2/H3 outline items for a piece that could outrank>"], ' +
        '"recommendations": [{"priority":"high"|"medium"|"low","issue":"...","fix":"..."}]}',
      userMsg:
        `Seed keyword: ${keyword}\n\nTop ranking results:\n` +
        serp.map((r) => `${r.rank}. ${r.title} — ${r.url}\n   ${r.snippet}`).join("\n"),
    });
  } catch {
    /* leave defaults */
  }

  const keywords = Array.isArray(analysis.keywords) ? analysis.keywords : [];
  const contentGaps = Array.isArray(analysis.contentGaps)
    ? analysis.contentGaps
    : [];
  const outline = Array.isArray(analysis.outline) ? analysis.outline : [];
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations
    : [];

  const output =
    `SEO keyword/SERP analysis — "${keyword}"\n` +
    `Analyzed top ${serp.length} ranking pages.\n\n` +
    (keywords.length
      ? `Target keywords:\n${keywords.map((k) => `• ${k}`).join("\n")}\n\n`
      : "") +
    (contentGaps.length
      ? `Content gaps:\n${contentGaps.map((g) => `• ${g}`).join("\n")}\n\n`
      : "") +
    (outline.length
      ? `Suggested outline:\n${outline.map((o) => `• ${o}`).join("\n")}\n\n`
      : "") +
    (recommendations.length
      ? `Recommendations:\n${recommendations
          .slice(0, 8)
          .map((r) => `• [${(r.priority || "med").toUpperCase()}] ${r.issue || ""}${r.fix ? ` → ${r.fix}` : ""}`)
          .join("\n")}`
      : "");

  return {
    output: output.trim() || `No SERP data retrieved for "${keyword}".`,
    outputData: {
      kind: "seo",
      mode: "serp",
      keyword,
      serp,
      keywords,
      contentGaps,
      outline,
      recommendations,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────
function matchOne(re, html) {
  const m = re.exec(html || "");
  return m ? extractText(m[1]).trim().slice(0, 300) : "";
}

function matchAttr(re, html) {
  const m = re.exec(html || "");
  return m ? m[1].trim() : "";
}

// <meta name="X" content="..."> OR <meta property="X" content="..."> in any order.
function metaContent(html, name) {
  if (!html) return "";
  const re = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*>`,
    "i"
  );
  const tag = re.exec(html);
  if (!tag) return "";
  const c = /content\s*=\s*["']([\s\S]*?)["']/i.exec(tag[0]);
  return c ? extractText(c[1]).trim() : "";
}

function headings(html, level) {
  const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(html || "")) !== null) {
    const t = extractText(m[1]).trim();
    if (t) out.push(t.slice(0, 120));
  }
  return out;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
