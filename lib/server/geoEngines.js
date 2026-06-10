// Generative-engine adapters for the GEO agent. Each engine answers a prompt
// the way a real AI answer engine would, so the GEO agent can check whether a
// brand is actually mentioned/cited. Extensible: add Perplexity / Gemini later
// behind their own API keys.

import { callClaudeServer } from "./claudeServer.js";

// Each engine: async (prompt, { apiKey }) => { engine, answer } | null
async function claudeEngine(prompt, { apiKey }) {
  const answer = await callClaudeServer({
    system:
      "You are a search/answer engine. Answer the user's question concisely " +
      "and factually, naming specific brands, companies, tools, or sources " +
      "where relevant — as you would in a real answer.",
    userMsg: prompt,
    apiKey,
    maxTokens: 500,
  });
  return { engine: "claude", answer };
}

// Future: perplexityEngine, geminiEngine (need their API keys) — add here.
export const GEO_ENGINES = { claude: claudeEngine };

export function enabledEngines() {
  // claude always available via BYOK; others gated on their env keys later.
  return ["claude"];
}
