// Store results in memory (accessible via /api/cron-results)
export const cronResults = [];

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (in production)
  const authHeader = req.headers["authorization"];
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  // Get due schedules from schedule store
  // In production these would come from a database
  // For now, we accept the schedule payload directly in the cron request body (for testing)
  // OR Vercel calls this endpoint and we look up from the in-memory store

  // Import scheduledFlows from schedule.js isn't possible in serverless
  // So this endpoint accepts a direct payload for testing,
  // and in production is called with the schedule data in the body
  const { scheduleId, flowName, chain, agentTasks = {} } = req.body || {};

  if (!chain?.length) {
    return res.json({ ok: true, message: "No flows to run", ran: 0 });
  }

  const results = [];
  for (const agentId of chain) {
    const task = agentTasks[agentId] || `Run ${agentId} agent task`;
    const systemPrompt = getSystemPrompt(agentId);

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: "user", content: task }],
        }),
      });
      const data = await resp.json();
      const output = data.content?.[0]?.text || "No output";
      results.push({ agentId, task, output, status: "done" });
    } catch (e) {
      results.push({ agentId, task, output: e.message, status: "error" });
    }
  }

  const entry = {
    id: Date.now().toString(),
    scheduleId,
    flowName: flowName || "Scheduled Flow",
    ranAt: Date.now(),
    results,
  };
  cronResults.push(entry);
  // Keep last 20 results
  if (cronResults.length > 20) cronResults.splice(0, cronResults.length - 20);

  return res.json({ ok: true, ran: results.length, entry });
}

function getSystemPrompt(agentId) {
  const prompts = {
    webdev: "You are a website developer agent. Return 4-5 actionable bullet points.",
    market: "You are a market research agent. Return 4-5 bullet points with market insights.",
    leadgen: "You are a lead generation agent. Return 4-5 bullet points about lead sources.",
    email: "You are an email campaign agent. Return 4-5 bullet points with email strategy.",
    social: "You are a social media agent. Return 4-5 bullet points with platform strategy.",
    content: "You are a content creation agent. Return 4-5 bullet points with content plan.",
    scheduler: "You are a content scheduler agent. Return 4-5 bullet points with schedule.",
  };
  return prompts[agentId] || "You are a helpful agent. Return 4-5 bullet points.";
}
