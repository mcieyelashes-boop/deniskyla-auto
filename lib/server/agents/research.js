// Research agent — REAL work: derives search angles via Claude, scrapes real
// sources, synthesizes a summary + insights with Claude, persists to
// `research_results`.

import { callClaudeJSON } from "../claudeServer.js";
import { getAdmin } from "../supabaseAdmin.js";
import { searchWeb, fetchPage, extractText } from "../scraper.js";

const MAX_FETCHES = 8;
const SOURCE_CHARS = 2000;

export async function research({ task, userApiKey, clerkUserId, runId }) {
  // 1. Derive 3-4 search angles (topic, competitors, trends, ...).
  let queries = [];
  try {
    const plan = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 400,
      system:
        "You are a market/competitive research planner. Output ONLY JSON: " +
        '{"queries": ["3-4 distinct web search queries covering the topic, ' +
        'competitors, market trends, and recent developments"]}',
      userMsg: `Research task: ${task}`,
    });
    queries = (plan.queries || []).slice(0, 4);
  } catch {
    queries = [task].filter(Boolean);
  }
  if (!queries.length) queries = [task].filter(Boolean);

  // 2. Search + scrape real sources.
  const sources = [];
  const seen = new Set();
  for (const q of queries) {
    const results = await searchWeb(q, { limit: 5 });
    for (const r of results) {
      if (sources.length >= MAX_FETCHES) break;
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      const res = await fetchPage(r.url, { timeoutMs: 9000 });
      if (!res.ok || !res.html) continue;
      const text = extractText(res.html).slice(0, SOURCE_CHARS);
      if (text.length < 100) continue;
      sources.push({
        url: res.finalUrl,
        title: r.title || "",
        snippet: r.snippet || "",
        text,
      });
    }
    if (sources.length >= MAX_FETCHES) break;
  }

  // 3. Synthesize.
  let summary = "";
  let insights = [];
  try {
    const synth = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 1200,
      system:
        "You are a research analyst. Synthesize the provided sources into a " +
        "concise briefing. Output ONLY JSON: " +
        '{"summary": "<2-4 paragraph briefing>", "insights": ["<key actionable insight>", ...]}',
      userMsg:
        `Research task: ${task}\n\nSources:\n` +
        sources
          .map(
            (s, i) =>
              `[${i + 1}] ${s.title} (${s.url})\n${s.text.slice(0, 1500)}`
          )
          .join("\n\n"),
    });
    summary = synth.summary || "";
    insights = Array.isArray(synth.insights) ? synth.insights : [];
  } catch {
    summary =
      sources.length > 0
        ? `Collected ${sources.length} sources on "${task}" but synthesis failed.`
        : `No sources could be retrieved for "${task}".`;
  }

  // 4. Persist.
  const admin = getAdmin();
  if (admin) {
    await admin
      .from("research_results")
      .insert({
        clerk_user_id: clerkUserId,
        run_id: runId,
        query: task,
        sources: sources.map(({ url, title, snippet }) => ({
          url,
          title,
          snippet,
        })),
        summary,
        insights,
      })
      .then(({ error }) => {
        if (error) console.error("[research] insert error:", error.message);
      });
  }

  const output =
    summary +
    (insights.length
      ? "\n\nKey insights:\n" + insights.map((i) => `• ${i}`).join("\n")
      : "") +
    `\n\nSources analyzed: ${sources.length}`;

  return {
    output,
    outputData: {
      sources: sources.map(({ url, title, snippet }) => ({
        url,
        title,
        snippet,
      })),
      insights,
      summary,
    },
  };
}
