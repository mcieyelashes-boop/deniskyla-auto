// Server-side Claude call helper (non-streaming). Used by agent handlers.
// Accepts an explicit apiKey (the user's BYOK key) and falls back to env.
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export async function callClaudeServer({ system, userMsg, apiKey, maxTokens = 700, model = DEFAULT_MODEL }) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No Anthropic API key");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: system || "You are a helpful assistant.",
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API ${resp.status}`);
  }
  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

// Ask Claude for strict JSON and parse it (strips markdown fences).
export async function callClaudeJSON(opts) {
  const raw = await callClaudeServer(opts);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const startA = cleaned.indexOf("[");
  const s = startA !== -1 && (startA < start || start === -1) ? startA : start;
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (s === -1 || end === -1) throw new Error("No JSON in Claude response");
  return JSON.parse(cleaned.slice(s, end + 1));
}
