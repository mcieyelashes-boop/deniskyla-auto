// Secret keys for authentication: stored in env as TRIGGER_KEYS="key1,key2"
// Usage: GET /api/trigger?flow=launch&key=your_secret
//        POST /api/trigger with body { flow, key, context? }

const PRESET_FLOWS = {
  launch: { name: "🚀 Product Launch", chain: ["market", "content", "webdev", "social", "scheduler", "email"] },
  growth: { name: "📈 Growth Sprint", chain: ["market", "leadgen", "email", "social"] },
  content_blitz: { name: "✦ Content Blitz", chain: ["content", "social", "scheduler"] },
};

// Store pending triggers — client polls this
const pendingTriggers = [];
const completedTriggers = new Map();

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app", "http://localhost:5173", "http://localhost:5174"];
  if (origin && !allowed.includes(origin)) {
    // Allow non-browser callers (Zapier, Make, curl) but not unknown browser origins
    const isBrowser = !!origin;
    if (isBrowser && !allowed.includes(origin)) return res.status(403).json({ error: "Forbidden" });
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-trigger-key");
    return res.status(200).end();
  }

  // Auth
  const key = req.method === "GET" ? req.query.key : (req.body?.key || req.headers["x-trigger-key"]);
  const validKeys = (process.env.TRIGGER_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
  if (validKeys.length > 0 && !validKeys.includes(key)) {
    return res.status(401).json({ error: "Invalid trigger key" });
  }

  if (req.method === "GET" || req.method === "POST") {
    const flowId = req.method === "GET" ? req.query.flow : req.body?.flow;
    const context = req.body?.context || req.query.context || "";

    if (req.query.action === "poll") {
      // Client polls for pending triggers
      const trigger = pendingTriggers.shift();
      if (!trigger) return res.json({ trigger: null });
      return res.json({ trigger });
    }

    if (req.query.action === "complete") {
      // Client marks trigger as complete
      const { triggerId, results } = req.body || {};
      if (triggerId) completedTriggers.set(triggerId, { results, completedAt: Date.now() });
      return res.json({ ok: true });
    }

    if (req.query.action === "status") {
      const { triggerId } = req.query;
      const result = completedTriggers.get(triggerId);
      return res.json({ completed: !!result, result: result || null });
    }

    // Queue a new trigger
    if (!flowId || !PRESET_FLOWS[flowId]) {
      return res.status(400).json({
        error: "Invalid flow",
        availableFlows: Object.keys(PRESET_FLOWS),
        usage: "GET /api/trigger?flow=launch&key=your_key"
      });
    }

    const trigger = {
      id: Date.now().toString(),
      flowId,
      flowName: PRESET_FLOWS[flowId].name,
      chain: PRESET_FLOWS[flowId].chain,
      context,
      triggeredAt: Date.now(),
      source: req.headers["user-agent"] || "external",
    };
    pendingTriggers.push(trigger);

    return res.json({
      ok: true,
      message: `Flow "${trigger.flowName}" queued`,
      triggerId: trigger.id,
      statusUrl: `/api/trigger?action=status&triggerId=${trigger.id}&key=${key}`,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
