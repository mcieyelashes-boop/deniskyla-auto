export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { system, userMsg, stream = false } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  if (!userMsg) return res.status(400).json({ error: "userMsg is required" });

  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: stream ? 1024 : 600,
    system: system || "You are a helpful assistant.",
    messages: [{ role: "user", content: userMsg }],
    stream,
  };

  if (!stream) {
    // Non-streaming — existing behavior
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
