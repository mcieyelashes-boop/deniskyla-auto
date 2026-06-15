// Generative-engine adapters for the GEO agent. Each engine answers a prompt
// the way a real AI answer engine would, so the GEO agent can check whether a
// brand is actually mentioned/cited. Extensible: each engine is gated behind
// its own API key, so the audit runs with whatever engines are configured.

import { callClaudeServer } from "./claudeServer.js";

// Shared instruction so every engine answers like a real answer engine — naming
// specific brands/sources — which is exactly what we want to probe for GEO.
const ENGINE_SYSTEM =
  "You are a search/answer engine. Answer the user's question concisely and " +
  "factually, naming specific brands, companies, tools, or sources where " +
  "relevant — as you would in a real answer.";

// Per-call timeout so one slow engine can't blow the overall ~60s budget.
const ENGINE_TIMEOUT_MS = 9000;

// Small fetch wrapper with an AbortController timeout. Returns parsed JSON or
// null on any failure (network, non-2xx, abort, bad body). Never throws.
async function postJson(url, headers, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ENGINE_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Pull the assistant text out of an OpenAI-shaped chat-completions response.
function chatText(data) {
  return (data && data.choices?.[0]?.message?.content) || "";
}

// --- Engines: async (prompt, { apiKey }) => { engine, answer } ---
// Each is defensive: any failure resolves to an empty answer, never throws.

async function claudeEngine(prompt, { apiKey }) {
  try {
    const answer = await callClaudeServer({
      system: ENGINE_SYSTEM,
      userMsg: prompt,
      apiKey,
      maxTokens: 500,
    });
    return { engine: "claude", answer: answer || "" };
  } catch {
    return { engine: "claude", answer: "" };
  }
}

// Perplexity — real answer engine with live web grounding. Gated on env key.
async function perplexityEngine(prompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { engine: "perplexity", answer: "" };
  const data = await postJson(
    "https://api.perplexity.ai/chat/completions",
    { authorization: `Bearer ${key}` },
    {
      model: "sonar",
      max_tokens: 500,
      messages: [
        { role: "system", content: ENGINE_SYSTEM },
        { role: "user", content: prompt },
      ],
    }
  );
  return { engine: "perplexity", answer: chatText(data) };
}

// OpenAI (ChatGPT) — gated on env key.
async function openaiEngine(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { engine: "openai", answer: "" };
  const data = await postJson(
    "https://api.openai.com/v1/chat/completions",
    { authorization: `Bearer ${key}` },
    {
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: [
        { role: "system", content: ENGINE_SYSTEM },
        { role: "user", content: prompt },
      ],
    }
  );
  return { engine: "openai", answer: chatText(data) };
}

export const GEO_ENGINES = {
  claude: claudeEngine,
  perplexity: perplexityEngine,
  openai: openaiEngine,
};

export function enabledEngines() {
  // claude always available via BYOK; others gated on their env keys.
  const engines = ["claude"];
  if (process.env.PERPLEXITY_API_KEY) engines.push("perplexity");
  if (process.env.OPENAI_API_KEY) engines.push("openai");
  return engines;
}
