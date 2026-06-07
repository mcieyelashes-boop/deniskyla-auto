// Lead-generation agent — REAL work: searches the web, scrapes pages, extracts
// + verifies emails, scores leads with Claude, and persists to the `leads` table.
//
// Time budget: serverless 60s. We cap fetches (<=8) and email verifies (<=15).

import { callClaudeJSON } from "../claudeServer.js";
import { getAdmin } from "../supabaseAdmin.js";
import {
  searchWeb,
  fetchPage,
  extractEmails,
  extractText,
} from "../scraper.js";
import { verifyEmail } from "../emailVerify.js";

const MAX_FETCHES = 8;
const MAX_VERIFIES = 15;

export async function leadgen({ task, userApiKey, clerkUserId, runId }) {
  // 1. Turn the task into a structured search plan.
  let plan = { queries: [], targetCriteria: task || "" };
  try {
    plan = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 500,
      system:
        "You are a lead-generation strategist. Output ONLY JSON: " +
        '{"queries": ["...up to 4 web search queries that surface pages likely to list company/contact emails..."], ' +
        '"targetCriteria": "one sentence describing the ideal lead"}',
      userMsg: `Task: ${task}`,
    });
  } catch {
    plan.queries = [task].filter(Boolean);
  }
  const queries = (plan.queries || []).slice(0, 4);
  const targetCriteria = plan.targetCriteria || task || "";

  // 2. Search + collect candidate pages.
  const candidatePages = [];
  const seenUrls = new Set();
  for (const q of queries) {
    const results = await searchWeb(q, { limit: 6 });
    for (const r of results) {
      if (candidatePages.length >= MAX_FETCHES) break;
      if (!r.url || seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      candidatePages.push(r);
    }
    if (candidatePages.length >= MAX_FETCHES) break;
  }

  // 3. Fetch pages, extract emails + context.
  const rawLeads = [];
  const seenEmails = new Set();
  for (const page of candidatePages) {
    const res = await fetchPage(page.url, { timeoutMs: 9000 });
    if (!res.ok || !res.html) continue;
    const emails = extractEmails(res.html);
    if (!emails.length) continue;
    const text = extractText(res.html).slice(0, 1500);
    const title = extractTitle(res.html) || page.title || "";
    let domain = "";
    try {
      domain = new URL(res.finalUrl).hostname.replace(/^www\./, "");
    } catch {
      /* ignore */
    }
    for (const email of emails) {
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);
      rawLeads.push({
        email,
        domain: email.split("@")[1] || domain,
        source_url: res.finalUrl,
        title,
        company: domain,
        _context: text,
      });
      if (rawLeads.length >= 25) break;
    }
    if (rawLeads.length >= 25) break;
  }

  // 4. Verify emails (capped).
  let validCount = 0;
  const toVerify = rawLeads.slice(0, MAX_VERIFIES);
  await Promise.all(
    toVerify.map(async (lead) => {
      const v = await verifyEmail(lead.email).catch(() => null);
      lead.email_status = v?.status || "unknown";
      lead.meta = { verify: v?.meta || {}, mx: v?.mx };
      if (lead.email_status === "valid") validCount++;
    })
  );
  for (const lead of rawLeads.slice(MAX_VERIFIES)) {
    lead.email_status = "unknown";
    lead.meta = { verify: { note: "not verified (cap reached)" } };
  }

  // 5. Score leads against targetCriteria (single batched Claude call).
  await scoreLeads(rawLeads, targetCriteria, userApiKey);

  // 6. Persist.
  const admin = getAdmin();
  const rows = rawLeads.map((l) => ({
    clerk_user_id: clerkUserId,
    run_id: runId,
    name: l.name || null,
    email: l.email,
    domain: l.domain || null,
    source_url: l.source_url || null,
    title: l.title || null,
    company: l.company || null,
    email_status: l.email_status || "unknown",
    score: typeof l.score === "number" ? l.score : 0,
    meta: l.meta || {},
  }));
  if (admin && rows.length) {
    await admin
      .from("leads")
      .insert(rows)
      .then(({ error }) => {
        if (error) console.error("[leadgen] insert error:", error.message);
      });
  }

  const summary =
    `Found ${rows.length} qualified lead${rows.length === 1 ? "" : "s"} ` +
    `(${validCount} with valid/deliverable emails) across ${candidatePages.length} ` +
    `scraped pages.\nTarget: ${targetCriteria}\n` +
    rows
      .slice(0, 10)
      .map(
        (l) =>
          `• ${l.email} [${l.email_status}, score ${l.score}] — ${l.company || l.domain || ""}`
      )
      .join("\n");

  return {
    output: summary,
    outputData: { leads: rows, count: rows.length, validEmails: validCount },
  };
}

function extractTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html || "");
  return m ? extractText(m[1]).trim().slice(0, 200) : "";
}

async function scoreLeads(leads, targetCriteria, apiKey) {
  if (!leads.length) return;
  const compact = leads.map((l, i) => ({
    i,
    email: l.email,
    company: l.company || l.domain,
    context: (l._context || "").slice(0, 300),
  }));
  try {
    const scored = await callClaudeJSON({
      apiKey,
      maxTokens: 800,
      system:
        "You score sales leads 0-100 against a target profile. " +
        'Output ONLY a JSON array: [{"i": <index>, "score": <0-100>, "name": "<person name if evident else empty>"}]',
      userMsg:
        `Target profile: ${targetCriteria}\n\nLeads:\n` +
        JSON.stringify(compact),
    });
    const byIdx = new Map(
      (Array.isArray(scored) ? scored : []).map((s) => [s.i, s])
    );
    leads.forEach((l, i) => {
      const s = byIdx.get(i);
      l.score = s && typeof s.score === "number" ? clamp(s.score) : 50;
      if (s?.name) l.name = s.name;
      delete l._context;
    });
  } catch {
    leads.forEach((l) => {
      l.score = 50;
      delete l._context;
    });
  }
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
