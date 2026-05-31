// In production (Vercel), always use the /api/claude proxy (key stays server-side).
// In local dev, if VITE_ANTHROPIC_API_KEY is set, the proxy path is also enabled.
// HAS_API_KEY signals whether we expect the proxy to work.

// Never put the real API key in VITE_ vars — use VITE_HAS_API_KEY=true as a boolean flag only
export const HAS_API_KEY = import.meta.env.VITE_HAS_API_KEY === "true" || import.meta.env.PROD;

// Always use /api/claude proxy (key stays server-side)
const API_ENDPOINT = "/api/claude";

// Non-streaming call (used for CEO orchestration — needs full JSON response)
export async function callClaude(system, userMsg) {
  const resp = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, userMsg, stream: false }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  return data.text;
}

// Streaming call — calls onChunk(text) as tokens arrive, returns full text
export async function callClaudeStream(system, userMsg, onChunk) {
  const resp = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, userMsg, stream: true }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // Parse SSE lines
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.delta?.text || parsed.text || "";
          if (token) {
            fullText += token;
            onChunk(token);
          }
        } catch {}
      }
    }
  }

  return fullText;
}
