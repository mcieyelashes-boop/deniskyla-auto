// GEO agent — Generative Engine Optimization. REAL work:
//   1. Parse the task into { brand, domain?, queries[] } via Claude.
//   2. Citability check: run each query through each enabled engine and check
//      whether the brand (or domain) is actually mentioned in the answer.
//   3. Compute a visibility score = % of (query x engine) checks that mention.
//   4. If a domain is given, fetch it and have Claude assess citability factors.
//   5. Have Claude produce prioritized GEO recommendations.
//
// Time budget ~60s: queries capped at 5, engines currently = [claude].
// Never throws — degrades gracefully.

import { callClaudeJSON } from "../claudeServer.js";
import { fetchPage, extractText } from "../scraper.js";
import { GEO_ENGINES, enabledEngines } from "../geoEngines.js";

const MAX_QUERIES = 5;

export async function geo({ task, userApiKey }) {
  // 1. Parse the task into brand + natural queries.
  let parsed = { brand: "", domain: "", queries: [] };
  try {
    parsed = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 500,
      system:
        "You set up a Generative Engine Optimization audit. From the task, " +
        "identify the brand/company and (if present) its domain, then write " +
        "3-5 natural questions a real user would ask an AI assistant where " +
        "this brand SHOULD ideally appear in the answer. Output ONLY JSON: " +
        '{"brand": "<brand name>", "domain": "<bare domain or empty>", ' +
        '"queries": ["<natural question>", ...]}',
      userMsg: `Task: ${task}`,
    });
  } catch {
    /* fall through to defaults below */
  }
  const brand = (parsed.brand || "").trim() || (task || "").trim();
  const domain = (parsed.domain || "").trim();
  let queries = Array.isArray(parsed.queries)
    ? parsed.queries.filter(Boolean).slice(0, MAX_QUERIES)
    : [];
  if (!queries.length) queries = [task].filter(Boolean);

  const engines = enabledEngines();
  const brandLc = brand.toLowerCase();
  const domainLc = domain.toLowerCase().replace(/^www\./, "");

  // 2. Citability check across queries x engines.
  const checks = [];
  let totalChecks = 0;
  let mentionedCount = 0;

  for (const query of queries) {
    const engineResults = [];
    await Promise.all(
      engines.map(async (name) => {
        const engineFn = GEO_ENGINES[name];
        if (!engineFn) return;
        let answer = "";
        try {
          const r = await engineFn(query, { apiKey: userApiKey });
          answer = (r && r.answer) || "";
        } catch {
          answer = "";
        }
        const ansLc = answer.toLowerCase();
        const mentioned =
          (!!brandLc && ansLc.includes(brandLc)) ||
          (!!domainLc && ansLc.includes(domainLc));
        engineResults.push({
          engine: name,
          mentioned,
          snippet: snippetAround(answer, brandLc || domainLc) || answer.slice(0, 200),
        });
      })
    );
    for (const er of engineResults) {
      totalChecks++;
      if (er.mentioned) mentionedCount++;
    }
    checks.push({ query, engines: engineResults });
  }

  const score =
    totalChecks > 0 ? Math.round((mentionedCount / totalChecks) * 100) : 0;

  // 3. Optional on-page citability factors if a domain was provided.
  let factors = null;
  const fetchTarget = domain
    ? domain.startsWith("http")
      ? domain
      : `https://${domain}`
    : "";
  if (fetchTarget) {
    const res = await fetchPage(fetchTarget, { timeoutMs: 10000 });
    if (res.ok && res.html) {
      const text = extractText(res.html).slice(0, 4000);
      const hasFaqSchema = /faqpage|"@type"\s*:\s*"question"/i.test(res.html);
      const hasLdJson = /application\/ld\+json/i.test(res.html);
      try {
        factors = await callClaudeJSON({
          apiKey: userApiKey,
          maxTokens: 700,
          system:
            "You assess a page's citability by AI answer engines (GEO). Rate " +
            "each factor 0-100 and note evidence. Output ONLY JSON: " +
            '{"clearAnswers":<0-100>,"faqStructure":<0-100>,"statistics":<0-100>,' +
            '"authoritySignals":<0-100>,"structuredData":<0-100>,"entityClarity":<0-100>,' +
            '"notes":"<one short paragraph>"}',
          userMsg:
            `Brand: ${brand}\nDomain: ${domain}\n` +
            `Detected FAQ schema: ${hasFaqSchema}\nDetected JSON-LD: ${hasLdJson}\n\n` +
            `Page text (truncated):\n${text}`,
        });
      } catch {
        factors = {
          faqStructure: hasFaqSchema ? 70 : 20,
          structuredData: hasLdJson ? 70 : 20,
          notes: "Heuristic only — Claude assessment unavailable.",
        };
      }
    }
  }

  // 4. Prioritized GEO recommendations.
  let recommendations = [];
  try {
    const out = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 800,
      system:
        "You are a Generative Engine Optimization expert. Given a brand's AI " +
        "visibility results, output prioritized recommendations to get the " +
        "brand cited more often in AI answers (FAQ schema, quotable stats, " +
        "clear entity definitions, authoritative sourcing, etc.). Output ONLY " +
        'JSON: {"recommendations": [{"priority":"high"|"medium"|"low","action":"...","why":"..."}]}',
      userMsg:
        `Brand: ${brand}\nDomain: ${domain || "n/a"}\nVisibility score: ${score}%\n` +
        `Engines: ${engines.join(", ")}\n\n` +
        `Per-query results:\n${JSON.stringify(checks, null, 2)}\n\n` +
        (factors ? `On-page citability factors:\n${JSON.stringify(factors)}` : ""),
    });
    recommendations = Array.isArray(out.recommendations)
      ? out.recommendations
      : [];
  } catch {
    recommendations = [];
  }

  // 5. Human-readable report.
  const appeared = checks
    .filter((c) => c.engines.some((e) => e.mentioned))
    .map((c) => c.query);
  const missing = checks
    .filter((c) => !c.engines.some((e) => e.mentioned))
    .map((c) => c.query);

  const output =
    `GEO visibility for "${brand}"${domain ? ` (${domain})` : ""}\n` +
    `Visibility score: ${score}% (${mentionedCount}/${totalChecks} engine checks mentioned the brand)\n` +
    `Engines: ${engines.join(", ")}\n\n` +
    (appeared.length
      ? `Appeared in answers for:\n${appeared.map((q) => `• ${q}`).join("\n")}\n\n`
      : "") +
    (missing.length
      ? `Did NOT appear for:\n${missing.map((q) => `• ${q}`).join("\n")}\n\n`
      : "") +
    (recommendations.length
      ? `Recommendations:\n${recommendations
          .slice(0, 8)
          .map((r) => `• [${(r.priority || "med").toUpperCase()}] ${r.action || ""}${r.why ? ` — ${r.why}` : ""}`)
          .join("\n")}`
      : "");

  return {
    output: output.trim() || `Could not assess GEO visibility for "${brand}".`,
    outputData: {
      kind: "geo",
      brand,
      domain: domain || null,
      score,
      checks,
      factors,
      recommendations,
      engines,
    },
  };
}

// Return a short window of text around the first occurrence of `needle`.
function snippetAround(text, needle) {
  if (!text || !needle) return "";
  const idx = text.toLowerCase().indexOf(needle);
  if (idx === -1) return "";
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + needle.length + 100);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}
