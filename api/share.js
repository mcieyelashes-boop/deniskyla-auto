// In-memory store for shared snapshots (resets on cold start — acceptable for MVP)
const shares = new Map();

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [
    process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  if (origin && !allowed.includes(origin)) return res.status(403).json({ error: "Forbidden" });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(200).end();
  }

  if (req.method === "POST") {
    // Create a new share
    const { title, flowName, results, createdBy } = req.body || {};
    if (!results?.length) return res.status(400).json({ error: "results required" });

    // Generate short ID
    const id = Math.random().toString(36).slice(2, 10);
    const share = {
      id,
      title: title || flowName || "Shared Flow Results",
      flowName,
      results,
      createdBy: createdBy || "Denis",
      createdAt: Date.now(),
      views: 0,
    };
    shares.set(id, share);

    const shareUrl = `${req.headers.host ? `https://${req.headers.host}` : ""}/share/${id}`;
    return res.json({ ok: true, id, shareUrl, share });
  }

  if (req.method === "GET") {
    const { id } = req.query;
    if (!id) return res.json({ shares: Array.from(shares.values()) });

    const share = shares.get(id);
    if (!share) return res.status(404).json({ error: "Share not found" });

    // Increment views
    shares.set(id, { ...share, views: share.views + 1 });
    return res.json({ share: shares.get(id) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
