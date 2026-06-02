import { useState, useEffect } from "react";

const DEFAULT_INTEGRATIONS = {
  slack: { enabled: false, webhookUrl: "", channel: "#general", notifyOnComplete: true, notifyOnError: true },
  notion: { enabled: false, apiKey: "", databaseId: "", saveResults: true },
  sheets: { enabled: false, webhookUrl: "", spreadsheetId: "", sheetName: "Agent Results" },
};

export function useIntegrations() {
  const [integrations, setIntegrations] = useState(() => {
    try { return { ...DEFAULT_INTEGRATIONS, ...JSON.parse(localStorage.getItem("deniskyla_integrations") || "{}") }; }
    catch { return DEFAULT_INTEGRATIONS; }
  });

  useEffect(() => {
    try { localStorage.setItem("deniskyla_integrations", JSON.stringify(integrations)); }
    catch (e) { console.warn("Storage write failed:", e); }
  }, [integrations]);

  const updateIntegration = (key, updates) =>
    setIntegrations(prev => ({ ...prev, [key]: { ...prev[key], ...updates } }));

  const toggleIntegration = (key) =>
    setIntegrations(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));

  // Send to Slack
  const sendToSlack = async (payload) => {
    const cfg = integrations.slack;
    if (!cfg.enabled || !cfg.webhookUrl) return;
    const text = `*${payload.flowName}* completed ✓\n${payload.agentCount} agents ran\n${payload.results?.map(r => `• *${r.agentName}*: ${r.output?.slice(0, 100)}...`).join("\n") || ""}`;
    try {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, channel: cfg.channel }),
      });
    } catch (e) { console.warn("Slack send failed:", e); }
  };

  // Save to Notion (via Notion API)
  const saveToNotion = async (payload) => {
    const cfg = integrations.notion;
    if (!cfg.enabled || !cfg.apiKey || !cfg.databaseId) return;
    try {
      await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cfg.apiKey}`,
          "Notion-Version": "2022-06-28",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: cfg.databaseId },
          properties: {
            Name: { title: [{ text: { content: `${payload.flowName} — ${new Date().toLocaleDateString()}` } }] },
            Flow: { rich_text: [{ text: { content: payload.flowName } }] },
            Agents: { number: payload.agentCount },
            Status: { select: { name: "Completed" } },
          },
          children: payload.results?.map(r => ({
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: `**${r.agentName}**: ${r.output?.slice(0, 500) || ""}` } }],
            },
          })) || [],
        }),
      });
    } catch (e) { console.warn("Notion save failed:", e); }
  };

  // Save to Google Sheets (via Apps Script webhook)
  const saveToSheets = async (payload) => {
    const cfg = integrations.sheets;
    if (!cfg.enabled || !cfg.webhookUrl) return;
    try {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sheetName: cfg.sheetName,
          timestamp: new Date().toISOString(),
          flowName: payload.flowName,
          agentCount: payload.agentCount,
          results: payload.results?.map(r => ({ agent: r.agentName, output: r.output?.slice(0, 500) })),
        }),
      });
    } catch (e) { console.warn("Sheets save failed:", e); }
  };

  // Fire all enabled integrations
  const fireIntegrations = async (payload) => {
    await Promise.allSettled([
      sendToSlack(payload),
      saveToNotion(payload),
      saveToSheets(payload),
    ]);
  };

  return { integrations, updateIntegration, toggleIntegration, fireIntegrations, sendToSlack, saveToNotion, saveToSheets };
}
