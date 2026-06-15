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

// ── Branded SEO/GEO audit report (client deliverable) ──────────────────────
// Renders the rich outputData from the SEO + GEO agents into a clean, printable
// report and opens the browser print dialog (Save as PDF). Alerts if empty.
export function exportAuditReport(runOutputs = [], { brand = "", site = "" } = {}) {
  const seo = runOutputs.filter((o) => o && o.kind === "seo");
  const geo = runOutputs.filter((o) => o && o.kind === "geo");
  if (!seo.length && !geo.length) {
    alert("No SEO/GEO audit data to export yet. Run an SEO or GEO flow first.");
    return;
  }
  const isSample = [...seo, ...geo].some((o) => o.sample);
  const title = brand || site || (geo[0] && geo[0].brand) || "SEO & GEO Audit";

  const scoreColor = (n) => (n >= 70 ? "#15803d" : n >= 40 ? "#b45309" : "#b91c1c");
  const recRows = (recs = []) =>
    recs
      .map((r) => {
        const p = (r.priority || "med").toUpperCase();
        const body =
          typeof r === "string"
            ? escapeHtml(r)
            : `${escapeHtml(r.issue || r.action || "")}${r.fix || r.why ? ` — ${escapeHtml(r.fix || r.why)}` : ""}`;
        return `<tr><td class="pri pri-${(r.priority || "med").toLowerCase()}">${escapeHtml(p)}</td><td>${body}</td></tr>`;
      })
      .join("");

  const seoBlock = (r) => {
    const s = r.signals || {};
    const t = r.technical || {};
    const pages = Array.isArray(r.pages) ? r.pages : [];
    const broken = Array.isArray(r.brokenLinks) ? r.brokenLinks : [];
    const tech = [];
    if (t.https != null) tech.push(`HTTPS: ${t.https ? "yes" : "no"}`);
    if (t.robotsTxt) tech.push(`robots.txt: ${t.robotsTxt.present ? "yes" : "no"}`);
    if (t.sitemapXml) tech.push(`sitemap: ${t.sitemapXml.present ? `${t.sitemapXml.urlCount || 0} urls` : "no"}`);
    if (t.langAttr != null) tech.push(`lang: ${escapeHtml(t.langAttr || "—")}`);
    if (t.hreflangCount != null) tech.push(`hreflang: ${t.hreflangCount}`);
    if (Array.isArray(t.schemaTypes)) tech.push(`schema: ${t.schemaTypes.length ? escapeHtml(t.schemaTypes.join(", ")) : "none"}`);
    if (t.renderBlocking) tech.push(`render-blocking: ${t.renderBlocking.scripts || 0} js / ${t.renderBlocking.stylesheets || 0} css`);
    return `
      <div class="card">
        <div class="card-head">
          <div class="card-url">${escapeHtml(r.url || (r.mode === "serp" ? `SERP: ${r.keyword || ""}` : "audit"))}</div>
          <div class="score" style="color:${scoreColor(r.score || 0)}">${r.score || 0}<span>/100</span></div>
        </div>
        <table class="kv">
          <tr><td>Title</td><td>${s.title ? `${escapeHtml(s.title.text || "")} (${s.title.length || 0} chars)` : "—"}</td></tr>
          <tr><td>Meta description</td><td>${s.metaDescription ? `${s.metaDescription.length || 0} chars` : "—"}</td></tr>
          <tr><td>Headings H1/H2/H3</td><td>${s.headings ? `${s.headings.h1Count ?? 0} / ${s.headings.h2Count ?? 0} / ${s.headings.h3Count ?? 0}` : "—"}</td></tr>
          <tr><td>Word count</td><td>${s.wordCount ?? "—"}</td></tr>
          <tr><td>Images (missing alt)</td><td>${s.images ? `${s.images.total ?? 0} (${s.images.missingAlt ?? 0})` : "—"}</td></tr>
        </table>
        ${Number.isFinite(+r.siteScore) ? `<p class="sub">Site-wide score: <b style="color:${scoreColor(r.siteScore)}">${Math.round(r.siteScore)}/100</b> across ${pages.length || 1} page(s)</p>` : ""}
        ${pages.length > 1 ? `<table class="kv">${pages.map((p) => `<tr><td>${escapeHtml((p.url || "").replace(/^https?:\/\//, ""))}</td><td style="text-align:right;color:${scoreColor(p.score || 0)}">${p.score || 0}</td></tr>`).join("")}</table>` : ""}
        ${tech.length ? `<p class="sub">Technical</p><ul class="chips">${tech.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
        ${broken.length ? `<p class="sub" style="color:#b91c1c">Broken links (${broken.length})</p><ul>${broken.slice(0, 10).map((b) => `<li>${b.status || "ERR"} — ${escapeHtml((b.url || "").replace(/^https?:\/\//, ""))}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(r.recommendations) && r.recommendations.length ? `<p class="sub">Recommendations</p><table class="recs">${recRows(r.recommendations)}</table>` : ""}
      </div>`;
  };

  const geoBlock = (r) => {
    const eb = Array.isArray(r.engineBreakdown) ? r.engineBreakdown : [];
    const comp = Array.isArray(r.competitors) ? r.competitors : [];
    return `
      <div class="card">
        <div class="card-head">
          <div class="card-url">${escapeHtml(r.brand || "brand")}${r.domain ? ` · ${escapeHtml(r.domain)}` : ""}</div>
          <div class="score" style="color:${scoreColor(r.score || 0)}">${r.score || 0}<span>%</span></div>
        </div>
        <p class="sub">AI visibility across: ${escapeHtml((r.engines || []).join(", ") || "—")}</p>
        ${eb.length ? `<table class="kv">${eb.map((e) => `<tr><td>${escapeHtml(e.engine)}</td><td style="text-align:right;color:${scoreColor(e.rate || 0)}">${e.rate || 0}% (${e.mentions ?? 0}/${e.checks ?? 0})</td></tr>`).join("")}</table>` : ""}
        ${comp.length ? `<p class="sub">Competitors cited instead</p><ul class="chips">${comp.map((c) => `<li>${escapeHtml(typeof c === "string" ? c : c.name || "")}${typeof c === "object" && c.mentions != null ? ` ×${c.mentions}` : ""}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(r.recommendations) && r.recommendations.length ? `<p class="sub">Recommendations</p><table class="recs">${recRows(r.recommendations)}</table>` : ""}
      </div>`;
  };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — Search Presence Report</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #18181b; margin: 0; padding: 40px; }
    .head { border-bottom: 3px solid #F0C040; padding-bottom: 16px; margin-bottom: 28px; }
    .head h1 { font-size: 24px; margin: 0 0 4px; }
    .head .meta { color: #71717a; font-size: 12px; }
    .sample { display:inline-block; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:99px; padding:2px 10px; font-size:10px; letter-spacing:1px; text-transform:uppercase; margin-left:8px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #52525b; margin: 28px 0 12px; }
    .card { border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px 18px; margin-bottom: 16px; page-break-inside: avoid; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .card-url { font-family: ui-monospace, monospace; font-size: 12px; word-break: break-all; }
    .score { font-size: 22px; font-weight: 800; } .score span { font-size: 12px; color:#a1a1aa; }
    table.kv { width: 100%; border-collapse: collapse; font-size: 12px; margin: 6px 0 10px; }
    table.kv td { padding: 4px 8px; border-bottom: 1px solid #f4f4f5; }
    table.kv td:first-child { color: #71717a; }
    .sub { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #71717a; margin: 12px 0 6px; }
    ul { margin: 4px 0; padding-left: 18px; font-size: 12px; } ul.chips { list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:6px; }
    ul.chips li { background:#f4f4f5; border:1px solid #e4e4e7; border-radius:8px; padding:2px 8px; }
    table.recs { width:100%; border-collapse:collapse; font-size:12px; }
    table.recs td { padding: 5px 8px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
    td.pri { font-weight:700; white-space:nowrap; width:60px; } .pri-high{color:#b91c1c} .pri-medium,.pri-med{color:#b45309} .pri-low{color:#15803d}
    .foot { margin-top: 32px; color:#a1a1aa; font-size: 11px; border-top:1px solid #e4e4e7; padding-top:12px; }
  </style></head><body>
    <div class="head">
      <h1>Search Presence Report${isSample ? '<span class="sample">Sample</span>' : ""}</h1>
      <div class="meta">${escapeHtml(title)} · Generated ${escapeHtml(new Date().toLocaleString())} · deniskyla.auto</div>
    </div>
    ${seo.length ? `<h2>🔍 SEO Audit</h2>${seo.map(seoBlock).join("")}` : ""}
    ${geo.length ? `<h2>🤖 GEO — AI Visibility</h2>${geo.map(geoBlock).join("")}` : ""}
    <div class="foot">Generated by deniskyla.auto — AI agent orchestration for SEO &amp; GEO.${isSample ? " Sample data shown; connect a backend with an API key for live audits." : ""}</div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow popups for this site to export the report.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
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
