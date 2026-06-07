// Scheduler agent — turns a natural-language task into a persistent schedule.
//
// Parses the task with Claude into a schedule intent (flowName, interval, time,
// chain of agent ids), then inserts a row into the `schedules` table so the
// server-side worker (api/worker.js) will pick it up at next_run.

import { callClaudeJSON } from "../claudeServer.js";
import { getAdmin, HAS_DB } from "../supabaseAdmin.js";
import { computeNextRun } from "../enqueue.js";

const VALID_AGENTS = ["webdev", "market", "leadgen", "email", "social", "content"];
const VALID_INTERVALS = ["hourly", "daily", "weekly"];
const DEFAULT_CHAIN = ["content", "social"];

export async function scheduler({ task, clerkUserId, userApiKey }) {
  // 1. Parse the task into a structured schedule intent.
  let intent = {
    flowName: "Scheduled Flow",
    interval: "daily",
    time: "09:00",
    chain: DEFAULT_CHAIN,
  };

  try {
    const parsed = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 400,
      system:
        "You convert a scheduling request into JSON. Output ONLY JSON: " +
        '{"flowName": "<short name for the scheduled flow>", ' +
        '"interval": "daily"|"weekly"|"hourly", ' +
        '"time": "HH:MM" (24h, used for daily/weekly), ' +
        '"chain": ["<agent ids in run order>"]}. ' +
        `Available agent ids: ${VALID_AGENTS.join(", ")}. ` +
        "Pick only relevant agents. If you cannot determine a chain, omit it.",
      userMsg: `Scheduling request: ${task || ""}`,
    });

    if (parsed && typeof parsed === "object") {
      if (parsed.flowName) intent.flowName = String(parsed.flowName).slice(0, 120);
      if (VALID_INTERVALS.includes(parsed.interval)) intent.interval = parsed.interval;
      if (/^\d{1,2}:\d{2}$/.test(parsed.time || "")) intent.time = parsed.time;
      const chain = Array.isArray(parsed.chain)
        ? parsed.chain.filter((a) => VALID_AGENTS.includes(a))
        : [];
      if (chain.length) intent.chain = chain;
    }
  } catch {
    // Fall back to defaults defined above.
  }

  const nextRun = computeNextRun(intent.interval, intent.time);

  // 2. Persist the schedule.
  let schedule = {
    clerk_user_id: clerkUserId || null,
    flow_name: intent.flowName,
    chain: intent.chain,
    interval: intent.interval,
    time: intent.time,
    enabled: true,
    next_run: nextRun,
  };

  if (HAS_DB && clerkUserId) {
    const admin = getAdmin();
    if (admin) {
      const { data, error } = await admin
        .from("schedules")
        .insert({
          clerk_user_id: clerkUserId,
          flow_name: intent.flowName,
          chain: intent.chain,
          interval: intent.interval,
          time: intent.time,
          enabled: true,
          next_run: nextRun,
          last_run: null,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) {
        console.error("[scheduler] insert error:", error.message);
      } else if (data) {
        schedule = data;
      }
    }
  }

  const nextRunHuman = new Date(nextRun).toLocaleString();
  const output =
    `Scheduled '${intent.flowName}' to run ${intent.interval} at ${intent.time}. ` +
    `Chain: ${intent.chain.join(" → ")}. Next run: ${nextRunHuman}.`;

  return { output, outputData: { schedule } };
}
