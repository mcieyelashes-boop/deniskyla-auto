// Server-Sent Events broadcast endpoint for real-time dashboard updates.
// Viewers open a GET (SSE) connection on a shareId channel; the dashboard
// owner POSTs events that fan out to all connected viewers.
//
// NOTE: In-memory channels reset on cold start and are not shared across
// serverless instances — acceptable for the MVP single-instance case.
const channels = new Map(); // shareId -> Set of res objects

export default function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [
    process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  if (origin && !allowed.includes(origin)) return res.status(403).json({ error: "Forbidden" });
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
  }
  if (req.method === "OPTIONS") return res.status(200).end();

  const { shareId, action } = req.query;
  if (!shareId) return res.status(400).json({ error: "shareId required" });

  if (req.method === "GET") {
    // SSE connection for viewers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (!channels.has(shareId)) channels.set(shareId, new Set());
    channels.get(shareId).add(res);

    // Send heartbeat every 30s to keep the connection alive through proxies.
    const heartbeat = setInterval(() => {
      try {
        res.write("event: ping\ndata: {}\n\n");
      } catch {
        clearInterval(heartbeat);
        channels.get(shareId)?.delete(res);
      }
    }, 30000);

    // Send welcome event
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        shareId,
        viewers: channels.get(shareId).size,
      })}\n\n`
    );

    req.on("close", () => {
      clearInterval(heartbeat);
      const subs = channels.get(shareId);
      if (subs) {
        subs.delete(res);
        if (subs.size === 0) channels.delete(shareId);
      }
    });
    return;
  }

  if (req.method === "POST") {
    // Dashboard owner broadcasts an update to all viewers
    const { event, data } = req.body || {};
    const subs = channels.get(shareId);
    if (!subs?.size) return res.json({ ok: true, viewers: 0 });

    const payload = `event: ${event || "update"}\ndata: ${JSON.stringify(data || {})}\n\n`;
    let sent = 0;
    subs.forEach((sub) => {
      try {
        sub.write(payload);
        sent++;
      } catch {
        subs.delete(sub);
      }
    });
    if (subs.size === 0) channels.delete(shareId);
    return res.json({ ok: true, viewers: sent });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
