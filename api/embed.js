// Serves a self-contained embeddable widget showing live agent status.
//
// Usage:
//   <script src="https://deniskyla-auto.vercel.app/api/embed?shareId=xxx"></script>
//   <iframe src="https://deniskyla-auto.vercel.app/api/embed?shareId=xxx&theme=dark"></iframe>
//
// The widget opens an SSE connection to /api/broadcast on the given shareId
// channel and re-renders the agent list whenever an update/agent-update event
// arrives. All styling is inline so the page is fully self-contained.

export default function handler(req, res) {
  const { shareId, theme = "dark", compact = "false" } = req.query;
  const isCompact = compact === "true";
  const isDark = theme !== "light";

  const bg = isDark ? "#07070f" : "#f8f8ff";
  const text = isDark ? "#ffffff" : "#0a0a14";
  const border = isDark ? "#ffffff15" : "#00000015";
  const gold = isDark ? "#F0C040" : "#d4a017";
  const cardBg = isDark ? "rgba(12,12,22,0.8)" : "rgba(255,255,255,0.9)";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: ${bg}; color: ${text}; padding: ${isCompact ? "8px" : "16px"}; }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: ${isCompact ? "8px" : "14px"}; }
    .logo { color: ${gold}; font-weight: 800; font-size: ${isCompact ? "11px" : "13px"}; letter-spacing: 2px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; box-shadow: 0 0 6px #34D399; }
    .agents { display: flex; flex-direction: column; gap: 6px; }
    .agent { background: ${cardBg}; border: 1px solid ${border}; border-radius: 8px; padding: ${isCompact ? "6px 10px" : "10px 12px"}; display: flex; align-items: center; gap: 8px; }
    .agent-icon { font-size: ${isCompact ? "14px" : "16px"}; }
    .agent-name { font-weight: 600; font-size: ${isCompact ? "11px" : "13px"}; flex: 1; }
    .agent-status { font-size: 10px; letter-spacing: 1px; font-family: monospace; }
    .status-running { color: #34D399; }
    .status-done { color: #38BDF8; }
    .status-idle { color: ${isDark ? "#ffffff33" : "#00000033"}; }
    .status-error { color: #ef4444; }
    .footer { margin-top: 10px; text-align: right; font-size: 10px; color: ${isDark ? "#ffffff33" : "#00000033"}; }
    .footer a { color: ${gold}; text-decoration: none; }
    .progress { height: 2px; background: ${isDark ? "#ffffff0f" : "#00000010"}; border-radius: 1px; margin-top: 4px; overflow: hidden; }
    .progress-bar { height: 100%; background: ${gold}; border-radius: 1px; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="header">
    <div class="status-dot"></div>
    <div class="logo">◈ AGENTIC OS</div>
  </div>
  <div class="agents" id="agents">
    <div style="text-align:center;padding:16px;color:${isDark ? "#ffffff33" : "#00000033"};font-size:12px">
      Connecting to share ${shareId || "(no shareId)"}...
    </div>
  </div>
  <div class="footer">Powered by <a href="https://deniskyla-auto.vercel.app" target="_blank">AgenticOS</a></div>

  <script>
    const shareId = ${JSON.stringify(shareId || "")};
    const baseUrl = ${JSON.stringify(req.headers.host ? `https://${req.headers.host}` : "")};

    if (shareId) {
      // Subscribe to broadcasts
      const es = new EventSource(baseUrl + '/api/broadcast?shareId=' + shareId);
      es.addEventListener('update', (e) => {
        const data = JSON.parse(e.data);
        if (data.agents) renderAgents(data.agents);
      });
      es.addEventListener('agent-update', (e) => {
        const data = JSON.parse(e.data);
        if (data.agents) renderAgents(data.agents);
      });
    }

    function renderAgents(agents) {
      const container = document.getElementById('agents');
      container.innerHTML = agents.map(a => \`
        <div class="agent">
          <div class="agent-icon">\${a.icon || '◎'}</div>
          <div style="flex:1">
            <div class="agent-name">\${a.name}</div>
            \${a.progress > 0 ? \`<div class="progress"><div class="progress-bar" style="width:\${a.progress}%"></div></div>\` : ''}
          </div>
          <div class="agent-status status-\${a.status}">\${a.status.toUpperCase()}</div>
        </div>
      \`).join('');
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  return res.send(html);
}
