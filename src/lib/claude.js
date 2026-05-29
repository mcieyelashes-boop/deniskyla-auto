// In production (Vercel), always use the /api/claude proxy (key stays server-side).
// In local dev, if VITE_ANTHROPIC_API_KEY is set, the proxy path is also enabled.
// HAS_API_KEY signals whether we expect the proxy to work.

export const HAS_API_KEY = Boolean(
  import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.PROD
);

export async function callClaude(system, userMsg) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, userMsg }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}
