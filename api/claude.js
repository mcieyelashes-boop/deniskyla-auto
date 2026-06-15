import { rateLimit } from "../lib/server/rateLimit.js";

// Best-effort client IP from Vercel's proxy headers (for abuse rate-limiting).
function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

// Allow a request origin if it matches the configured origin(s), localhost,
// or any *.vercel.app deploy (preview + production). ALLOWED_ORIGIN may be a
// comma-separated list.
function isOriginAllowed(origin) {
  if (!origin) return true; // same-origin / server-to-server requests have no Origin header
  const configured = (process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const staticAllowed = [
    ...configured,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
  ];
  if (staticAllowed.includes(origin)) return true;
  // Allow Vercel preview/production deploys
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host.endsWith(".vercel.app")) return true;
  } catch {
    return false;
  }
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = isOriginAllowed(origin);

  if (req.method === "OPTIONS") {
    if (origin && allowed) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-user-api-key");
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // CORS guard
  if (origin && !allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);

  const { system, userMsg, stream = false } = req.body;

  // BYOK: use user's key if provided, fall back to env key
  const userApiKey = req.headers["x-user-api-key"] || "";
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "No API key configured. Please add your Anthropic API key in Settings.",
    });
  }

  if (!userMsg) return res.status(400).json({ error: "userMsg is required" });

  // Input validation
  if (typeof userMsg !== "string" || userMsg.length > 8000) {
    return res.status(400).json({ error: "userMsg too long or invalid" });
  }
  if (system && (typeof system !== "string" || system.length > 4000)) {
    return res.status(400).json({ error: "system too long or invalid" });
  }

  // Abuse guard: per-IP rate limit. This endpoint is unauthenticated (so the
  // no-login demo works) and can fall back to the server ANTHROPIC_API_KEY, so
  // cap calls per IP to prevent a spoofed-Origin client from draining the key.
  // DB-backed; if no DB is configured the limiter fails open (demo mode).
  try {
    const ip = clientIp(req);
    const { allowed, resetAt } = await rateLimit({
      clerkUserId: `ip:${ip}`,
      bucket: "claude",
      max: 40,
      windowSec: 60,
    });
    if (!allowed) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Rate limit exceeded. Try again shortly.", resetAt });
    }
  } catch {
    /* limiter failure must never block legitimate traffic */
  }

  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: stream ? 1024 : 600,
    system: system || "You are a helpful assistant.",
    messages: [{ role: "user", content: userMsg }],
    stream,
  };

  if (!stream) {
    // Non-streaming — existing behavior
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return res.status(resp.status).json({ error: err.error?.message || "API error" });
      }
      const data = await resp.json();
      return res.json({ text: data.content[0].text });
    } catch (e) {
      return res.status(502).json({ error: "Upstream API unavailable" });
    }
  }

  // Streaming — pipe SSE from Anthropic to client
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    res.write(`data: ${JSON.stringify({ error: err.error?.message || "API error" })}\n\n`);
    return res.end();
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Forward relevant SSE events containing text deltas
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const rawData = line.slice(6).trim();
        if (rawData === "[DONE]" || !rawData) continue;
        try {
          const parsed = JSON.parse(rawData);
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            res.write(`data: ${JSON.stringify({ delta: { text: parsed.delta.text } })}\n\n`);
          }
        } catch {}
      }
    }
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
