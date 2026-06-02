// In-memory store (resets on cold start — good enough for MVP)
// For production, would use Vercel KV or a database
const scheduledFlows = new Map();

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "";
  const allowed = [process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app", "http://localhost:5173", "http://localhost:5174"];
  if (origin && !allowed.includes(origin)) return res.status(403).json({ error: "Forbidden" });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(200).end();
  }

  if (req.method === "POST") {
    // Register a new scheduled flow
    const { id, flowName, chain, interval, time, agentTasks } = req.body;
    if (!id || !chain?.length) return res.status(400).json({ error: "id and chain required" });
    scheduledFlows.set(id, { id, flowName, chain, interval, time, agentTasks: agentTasks || {}, createdAt: Date.now(), nextRun: computeNextRun(interval, time) });
    return res.json({ ok: true, schedule: scheduledFlows.get(id) });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    scheduledFlows.delete(id);
    return res.json({ ok: true });
  }

  // GET — list all schedules
  return res.json({ schedules: Array.from(scheduledFlows.values()) });
}

function computeNextRun(interval, time = "09:00") {
  const now = new Date();
  const [h, m] = (time || "09:00").split(":").map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (interval === "daily" && next <= now) next.setDate(next.getDate() + 1);
  else if (interval === "weekly" && next <= now) next.setDate(next.getDate() + 7);
  else if (interval === "hourly") next.setTime(now.getTime() + 3600000);
  return next.getTime();
}
