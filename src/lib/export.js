// Export all agent results to JSON file
export function exportJSON(results) {
  const data = {
    exportedAt: new Date().toISOString(),
    session: results.map((r) => ({
      agent: r.agentName,
      task: r.task,
      output: r.output,
      timestamp: new Date(r.timestamp).toISOString(),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deniskyla-auto-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Escape user-provided strings before injecting into print HTML
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Export to PDF using browser print
export function exportPDF(results) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Denis's Command Center — Export</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 8px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 32px; }
        .agent-block { margin-bottom: 28px; border-left: 3px solid #ccc; padding-left: 16px; }
        .agent-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
        .agent-task { color: #666; font-size: 12px; margin-bottom: 10px; }
        .output { font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>Denis's Command Center</h1>
      <div class="meta">Exported ${escapeHtml(new Date().toLocaleString())}</div>
      ${results
        .map(
          (r) => `
        <div class="agent-block">
          <div class="agent-name">${escapeHtml(r.agentIcon)} ${escapeHtml(
            r.agentName
          )}</div>
          <div class="agent-task">Task: ${escapeHtml(r.task)}</div>
          <div class="output">${escapeHtml(r.output)}</div>
        </div>
      `
        )
        .join("")}
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow popups for this site to export PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.print();
}
