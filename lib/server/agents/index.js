// Agent registry — the contract another orchestrator agent imports.
//
// REAL implementations: leadgen, research (mapped from "market" + "research"),
// content. Everything else (webdev, email, social, scheduler) uses a generic
// Claude fallback until its real implementation lands in a later phase.

import { leadgen } from "./leadgen.js";
import { research } from "./research.js";
import { content } from "./content.js";
import { scheduler } from "./scheduler.js";
import { seo } from "./seo.js";
import { geo } from "./geo.js";
import { callClaudeServer } from "../claudeServer.js";

// Generic Claude fallback for agents without a real implementation yet.
async function genericClaude({ task, userApiKey, agentId }) {
  const output = await callClaudeServer({
    system: `You are the ${agentId} agent. Complete the task with concrete, actionable output.`,
    userMsg: task || "Do your standard task.",
    apiKey: userApiKey,
  });
  return { output };
}

export const AGENT_HANDLERS = {
  leadgen,
  market: research,
  research,
  content,
  scheduler,
  seo,
  geo,
  // webdev, email, social -> generic for now (real impls are later phases)
};

export function getHandler(agentId) {
  return AGENT_HANDLERS[agentId] || ((ctx) => genericClaude({ ...ctx, agentId }));
}
