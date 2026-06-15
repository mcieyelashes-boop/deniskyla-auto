import { exportAuditReport } from "../lib/export";

// DataPanel — renders structured agent output (leads / research) from a server run.
// Props: { runOutputs, onClose, site? }
//   runOutputs: array of output_data objects collected during a server run.
//     - { leads: [{ name, email, company, emailStatus, score }] }
//     - { insights: [...], sources: [...], summary }

const GOLD = "#F0C040";
const BG = "#07070f";
const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

function emailStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "valid") return "#34D399";
  if (s === "risky") return "#FBBF24";
  // invalid / unknown / empty
  return "#ffffff55";
}

function scoreColor(score) {
  if (score >= 70) return "#34D399";
  if (score >= 40) return "#FBBF24";
  return "#ef4444";
}

// Flatten all leads across the collected output_data objects.
function collectLeads(runOutputs) {
  const leads = [];
  for (const od of runOutputs || []) {
    if (od && Array.isArray(od.leads)) {
      for (const l of od.leads) leads.push(l);
    }
  }
  return leads;
}

// Collect research-style objects (insights + sources + summary).
function collectResearch(runOutputs) {
  const research = [];
  for (const od of runOutputs || []) {
    if (!od) continue;
    const hasInsights = Array.isArray(od.insights) && od.insights.length > 0;
    const hasSources = Array.isArray(od.sources) && od.sources.length > 0;
    if (hasInsights || hasSources || od.summary) {
      research.push({
        summary: od.summary || "",
        insights: Array.isArray(od.insights) ? od.insights : [],
        sources: Array.isArray(od.sources) ? od.sources : [],
      });
    }
  }
  return research;
}

// Collect SEO outputs (kind === "seo").
function collectSeo(runOutputs) {
  const out = [];
  for (const od of runOutputs || []) {
    if (od && od.kind === "seo") out.push(od);
  }
  return out;
}

// Collect GEO outputs (kind === "geo").
function collectGeo(runOutputs) {
  const out = [];
  for (const od of runOutputs || []) {
    if (od && od.kind === "geo") out.push(od);
  }
  return out;
}

function scoreColorGrad(score) {
  if (score >= 70) return "#34D399";
  if (score >= 40) return "#FBBF24";
  return "#ef4444";
}

function priorityColor(p) {
  const s = (p || "").toLowerCase();
  if (s === "high") return "#ef4444";
  if (s === "medium" || s === "med") return "#FBBF24";
  return "#34D399";
}

// Small badge marking demo/sample audit data (client/simulation path).
function SampleBadge() {
  return (
    <span
      title="Illustrative sample data — connect a backend with an API key for real audits"
      style={{
        background: "#FBBF2418", border: "1px solid #FBBF2455", color: "#FBBF24",
        padding: "1px 7px", borderRadius: 999, fontFamily: FONT_MONO, fontSize: 9,
        letterSpacing: 1, textTransform: "uppercase", flexShrink: 0,
      }}
    >
      Sample
    </span>
  );
}

// Build pass/fail chips from the SEO agent's technical{} block. Null-safe:
// any missing field is simply skipped, so older audits without technical data
// render nothing here.
function techChips(t) {
  if (!t) return [];
  const chips = [];
  chips.push({ label: t.https ? "HTTPS" : "no HTTPS", ok: !!t.https });
  if (t.robotsTxt) chips.push({ label: t.robotsTxt.present ? "robots.txt" : "no robots.txt", ok: !!t.robotsTxt.present });
  if (t.sitemapXml) chips.push({ label: t.sitemapXml.present ? `sitemap (${t.sitemapXml.urlCount || 0})` : "no sitemap", ok: !!t.sitemapXml.present });
  chips.push({ label: t.langAttr ? `lang=${t.langAttr}` : "no lang", ok: !!t.langAttr });
  if (typeof t.hreflangCount === "number") chips.push({ label: `hreflang ${t.hreflangCount}`, ok: t.hreflangCount > 0 });
  chips.push({ label: t.favicon ? "favicon" : "no favicon", ok: !!t.favicon });
  if (Array.isArray(t.schemaTypes)) chips.push({ label: t.schemaTypes.length ? `schema: ${t.schemaTypes.slice(0, 3).join(", ")}` : "no schema", ok: t.schemaTypes.length > 0 });
  if (t.renderBlocking) {
    const total = (t.renderBlocking.scripts || 0) + (t.renderBlocking.stylesheets || 0);
    chips.push({ label: `${t.renderBlocking.scripts || 0}js/${t.renderBlocking.stylesheets || 0}css blocking`, ok: total <= 10 });
  }
  if (typeof t.htmlBytes === "number") chips.push({ label: `${Math.round(t.htmlBytes / 1024)}KB html`, ok: t.htmlBytes < 150000 });
  return chips;
}

function buildLeadsCsv(leads) {
  const header = ["Name", "Email", "Company", "Email Status", "Score"];
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = leads.map((l) =>
    [l.name, l.email, l.company, l.email_status ?? l.emailStatus, l.score].map(escape).join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function downloadCsv(leads) {
  const csv = buildLeadsCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DataPanel({ runOutputs = [], onClose, site = null }) {
  const leads = collectLeads(runOutputs);
  const research = collectResearch(runOutputs);
  const seoReports = collectSeo(runOutputs);
  const geoReports = collectGeo(runOutputs);
  const hasAudit = seoReports.length > 0 || geoReports.length > 0;
  const isEmpty =
    leads.length === 0 &&
    research.length === 0 &&
    seoReports.length === 0 &&
    geoReports.length === 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG,
          border: `1px solid ${GOLD}33`,
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 820,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div>
            <div style={{ color: "#fff", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 19 }}>
              📊 Structured Data
            </div>
            <div style={{ color: "#ffffff55", fontSize: 11, fontFamily: FONT_MONO }}>
              Leads, research &amp; SEO/GEO audit from this run
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hasAudit && (
              <button
                onClick={() => exportAuditReport(runOutputs, { brand: site?.brand, site: site?.url })}
                style={{
                  background: `${GOLD}18`,
                  border: `1px solid ${GOLD}44`,
                  color: GOLD,
                  padding: "7px 14px",
                  borderRadius: 9,
                  cursor: "pointer",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                }}
              >
                ⬇ EXPORT REPORT
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff66",
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#ffffff55",
              fontFamily: FONT_BODY,
              fontSize: 13,
            }}
          >
            No structured data found in this run yet.
            <div style={{ marginTop: 6, fontSize: 11, fontFamily: FONT_MONO, color: "#ffffff33" }}>
              Run an SEO Audit, GEO Visibility, Lead Gen, or Research flow to populate this panel.
            </div>
          </div>
        )}

        {/* Leads table */}
        {leads.length > 0 && (
          <div style={{ marginBottom: research.length > 0 ? 28 : 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  color: "#ffffff55",
                  fontSize: 10,
                  fontFamily: FONT_MONO,
                  letterSpacing: 1.5,
                }}
              >
                LEADS — {leads.length}
              </div>
              <button
                onClick={() => downloadCsv(leads)}
                style={{
                  background: `${GOLD}18`,
                  border: `1px solid ${GOLD}44`,
                  color: GOLD,
                  padding: "6px 14px",
                  borderRadius: 9,
                  cursor: "pointer",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                }}
              >
                ⬇ EXPORT CSV
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: FONT_BODY,
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {["Name", "Email", "Company", "Email status", "Score"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          color: "#ffffff44",
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          letterSpacing: 1,
                          borderBottom: "1px solid #ffffff15",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => {
                    const score = Number.isFinite(+l.score) ? Math.max(0, Math.min(100, +l.score)) : 0;
                    return (
                      <tr key={`${l.email || l.name || "lead"}-${i}`}>
                        <td style={{ padding: "9px 10px", color: "#fff", borderBottom: "1px solid #ffffff0a" }}>
                          {l.name || "—"}
                        </td>
                        <td style={{ padding: "9px 10px", color: "#ffffffcc", borderBottom: "1px solid #ffffff0a", fontFamily: FONT_MONO, fontSize: 11 }}>
                          {l.email || "—"}
                        </td>
                        <td style={{ padding: "9px 10px", color: "#ffffffaa", borderBottom: "1px solid #ffffff0a" }}>
                          {l.company || "—"}
                        </td>
                        <td style={{ padding: "9px 10px", borderBottom: "1px solid #ffffff0a" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              color: emailStatusColor(l.email_status ?? l.emailStatus),
                              fontFamily: FONT_MONO,
                              fontSize: 11,
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: emailStatusColor(l.email_status ?? l.emailStatus),
                              }}
                            />
                            {((l.email_status ?? l.emailStatus) || "unknown").toLowerCase()}
                          </span>
                        </td>
                        <td style={{ padding: "9px 10px", borderBottom: "1px solid #ffffff0a", minWidth: 120 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 6,
                                background: "#ffffff10",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${score}%`,
                                  background: scoreColor(score),
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                            <span style={{ color: scoreColor(score), fontFamily: FONT_MONO, fontSize: 11, minWidth: 24, textAlign: "right" }}>
                              {score}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Research section */}
        {research.length > 0 && (
          <div>
            <div
              style={{
                color: "#ffffff55",
                fontSize: 10,
                fontFamily: FONT_MONO,
                letterSpacing: 1.5,
                marginBottom: 12,
              }}
            >
              RESEARCH
            </div>
            {research.map((r, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff06",
                  border: "1px solid #ffffff10",
                  borderRadius: 12,
                  padding: "16px 18px",
                  marginBottom: 12,
                }}
              >
                {r.summary && (
                  <div
                    style={{
                      color: "#ffffffdd",
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      lineHeight: 1.5,
                      marginBottom: r.insights.length || r.sources.length ? 14 : 0,
                    }}
                  >
                    {r.summary}
                  </div>
                )}

                {r.insights.length > 0 && (
                  <div style={{ marginBottom: r.sources.length ? 14 : 0 }}>
                    <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>
                      INSIGHTS
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {r.insights.map((ins, k) => (
                        <li
                          key={k}
                          style={{
                            color: "#ffffffcc",
                            fontFamily: FONT_BODY,
                            fontSize: 12,
                            lineHeight: 1.5,
                            marginBottom: 5,
                          }}
                        >
                          {typeof ins === "string" ? ins : ins?.text || JSON.stringify(ins)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.sources.length > 0 && (
                  <div>
                    <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>
                      SOURCES
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {r.sources.map((src, k) => {
                        const url = typeof src === "string" ? src : src?.url || "";
                        const title = typeof src === "string" ? src : src?.title || src?.url || "Source";
                        return url ? (
                          <a
                            key={k}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#38BDF8", fontFamily: FONT_MONO, fontSize: 11, textDecoration: "none", wordBreak: "break-all" }}
                          >
                            ↗ {title}
                          </a>
                        ) : (
                          <span key={k} style={{ color: "#ffffff66", fontFamily: FONT_MONO, fontSize: 11 }}>
                            {title}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SEO section */}
        {seoReports.length > 0 && (
          <div style={{ marginTop: research.length > 0 || leads.length > 0 ? 28 : 0 }}>
            <div style={{ color: "#ffffff55", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, marginBottom: 12 }}>
              SEO
            </div>
            {seoReports.map((r, i) => {
              const score = Number.isFinite(+r.score) ? Math.max(0, Math.min(100, +r.score)) : 0;
              const s = r.signals || {};
              const recs = Array.isArray(r.recommendations) ? r.recommendations : [];
              const signalRows =
                r.mode === "audit" && s.title
                  ? [
                      ["Title", `${s.title.text ? "✓" : "✗"} ${s.title.length || 0} chars`],
                      ["Meta description", `${s.metaDescription?.length ? "✓" : "✗"} ${s.metaDescription?.length || 0} chars`],
                      ["H1 / H2 / H3", `${s.headings?.h1Count ?? 0} / ${s.headings?.h2Count ?? 0} / ${s.headings?.h3Count ?? 0}`],
                      ["Word count", `${s.wordCount ?? 0}`],
                      ["Images (missing alt)", `${s.images?.total ?? 0} (${s.images?.missingAlt ?? 0})`],
                      ["Links int/ext", `${s.links?.internal ?? 0} / ${s.links?.external ?? 0}`],
                      ["Canonical / Viewport", `${s.canonical ? "✓" : "✗"} / ${s.viewport ? "✓" : "✗"}`],
                      ["Structured data", s.structuredData?.ldJson ? "JSON-LD" : s.structuredData?.microdataOrSchema ? "schema.org" : "none"],
                      ["Open Graph tags", `${s.openGraphTags ?? 0}`],
                    ]
                  : [];
              return (
                <div key={i} style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ color: "#ffffffdd", fontFamily: FONT_MONO, fontSize: 11, wordBreak: "break-all", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {r.mode === "serp" ? `SERP: "${r.keyword || ""}"` : r.url || "audit"}
                      {r.sample && <SampleBadge />}
                    </div>
                    <div style={{ color: scoreColorGrad(score), fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 22 }}>
                      {score}<span style={{ fontSize: 12, color: "#ffffff44" }}>/100</span>
                    </div>
                  </div>

                  {signalRows.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: 12, marginBottom: recs.length ? 14 : 0 }}>
                      <tbody>
                        {signalRows.map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ padding: "5px 10px", color: "#ffffff77", borderBottom: "1px solid #ffffff0a", fontFamily: FONT_MONO, fontSize: 11 }}>{k}</td>
                            <td style={{ padding: "5px 10px", color: "#ffffffcc", borderBottom: "1px solid #ffffff0a", textAlign: "right", fontFamily: FONT_MONO, fontSize: 11 }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {Array.isArray(r.pages) && r.pages.length > 1 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>
                        PAGES AUDITED — {r.pages.length}{Number.isFinite(+r.siteScore) ? ` · site ${Math.round(r.siteScore)}/100` : ""}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {r.pages.map((p, j) => {
                          const ps = Number.isFinite(+p.score) ? Math.max(0, Math.min(100, +p.score)) : 0;
                          return (
                            <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: scoreColorGrad(ps), fontFamily: FONT_MONO, fontSize: 11, minWidth: 30, textAlign: "right" }}>{ps}</span>
                              <span style={{ color: "#ffffffaa", fontFamily: FONT_MONO, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {(p.url || "").replace(/^https?:\/\//, "")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {r.technical && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>TECHNICAL</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {techChips(r.technical).map((t, j) => (
                          <span key={j} style={{
                            background: t.ok ? "#34D39915" : "#ef444415",
                            border: `1px solid ${t.ok ? "#34D39940" : "#ef444440"}`,
                            color: t.ok ? "#34D399" : "#ef8888",
                            padding: "3px 9px", borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11,
                          }}>{t.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(r.brokenLinks) && r.brokenLinks.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ color: "#ef4444", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>BROKEN LINKS — {r.brokenLinks.length}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {r.brokenLinks.slice(0, 8).map((b, j) => (
                          <div key={j} style={{ color: "#ffffff99", fontFamily: FONT_MONO, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ color: "#ef4444" }}>{b.status || "ERR"}</span> {(b.url || "").replace(/^https?:\/\//, "")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.mode === "serp" && Array.isArray(r.keywords) && r.keywords.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 6 }}>TARGET KEYWORDS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.keywords.map((k, j) => (
                          <span key={j} style={{ background: "#22D3EE18", border: "1px solid #22D3EE44", color: "#22D3EE", padding: "3px 9px", borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11 }}>
                            {typeof k === "string" ? k : JSON.stringify(k)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {recs.length > 0 && (
                    <div>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>RECOMMENDATIONS</div>
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                        {recs.map((rec, j) => (
                          <li key={j} style={{ display: "flex", gap: 8, marginBottom: 6, color: "#ffffffcc", fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.45 }}>
                            <span style={{ color: priorityColor(rec.priority), fontFamily: FONT_MONO, fontSize: 10, minWidth: 52 }}>
                              [{(rec.priority || "med").toUpperCase()}]
                            </span>
                            <span>{typeof rec === "string" ? rec : `${rec.issue || ""}${rec.fix ? ` → ${rec.fix}` : ""}`}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* GEO section */}
        {geoReports.length > 0 && (
          <div style={{ marginTop: seoReports.length || research.length || leads.length ? 28 : 0 }}>
            <div style={{ color: "#ffffff55", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, marginBottom: 12 }}>
              GEO — AI VISIBILITY
            </div>
            {geoReports.map((r, i) => {
              const score = Number.isFinite(+r.score) ? Math.max(0, Math.min(100, +r.score)) : 0;
              const checks = Array.isArray(r.checks) ? r.checks : [];
              const recs = Array.isArray(r.recommendations) ? r.recommendations : [];
              return (
                <div key={i} style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ color: "#ffffffdd", fontFamily: FONT_MONO, fontSize: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{r.brand || "brand"}{r.domain ? ` · ${r.domain}` : ""}
                      {Array.isArray(r.engines) && r.engines.length ? (
                        <span style={{ color: "#ffffff44", fontSize: 10 }}> · {r.engines.join(", ")}</span>
                      ) : null}</span>
                      {r.sample && <SampleBadge />}
                    </div>
                    <div style={{ color: scoreColorGrad(score), fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 22 }}>
                      {score}<span style={{ fontSize: 12, color: "#ffffff44" }}>%</span>
                    </div>
                  </div>

                  {checks.length > 0 && (
                    <div style={{ marginBottom: recs.length ? 14 : 0 }}>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>CITATION CHECKS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {checks.map((c, j) => {
                          const mentioned = Array.isArray(c.engines) && c.engines.some((e) => e.mentioned);
                          return (
                            <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ color: mentioned ? "#34D399" : "#ef4444", fontFamily: FONT_MONO, fontSize: 12, minWidth: 16 }}>
                                {mentioned ? "✓" : "✗"}
                              </span>
                              <span style={{ color: "#ffffffcc", fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.4 }}>
                                {c.query}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Array.isArray(r.engineBreakdown) && r.engineBreakdown.length > 0 && (
                    <div style={{ marginBottom: recs.length || (r.competitors && r.competitors.length) ? 14 : 0 }}>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>BY ENGINE</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.engineBreakdown.map((e, j) => {
                          const rate = Math.max(0, Math.min(100, Math.round(+e.rate || 0)));
                          return (
                            <span key={j} style={{ background: "#ffffff08", border: "1px solid #ffffff15", color: "#ffffffcc", padding: "3px 9px", borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11 }}>
                              {e.engine}: <span style={{ color: scoreColorGrad(rate) }}>{rate}%</span> <span style={{ color: "#ffffff55" }}>({e.mentions ?? 0}/{e.checks ?? 0})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Array.isArray(r.competitors) && r.competitors.length > 0 && (
                    <div style={{ marginBottom: recs.length ? 14 : 0 }}>
                      <div style={{ color: "#FBBF24", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>COMPETITORS CITED INSTEAD</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.competitors.map((c, j) => {
                          const name = typeof c === "string" ? c : (c.name || c.brand || "");
                          const count = typeof c === "object" && c.mentions != null ? ` ×${c.mentions}` : "";
                          return (
                            <span key={j} style={{ background: "#FBBF2415", border: "1px solid #FBBF2440", color: "#FBBF24", padding: "3px 9px", borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11 }}>
                              {name}{count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {recs.length > 0 && (
                    <div>
                      <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 8 }}>RECOMMENDATIONS</div>
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                        {recs.map((rec, j) => (
                          <li key={j} style={{ display: "flex", gap: 8, marginBottom: 6, color: "#ffffffcc", fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.45 }}>
                            <span style={{ color: priorityColor(rec.priority), fontFamily: FONT_MONO, fontSize: 10, minWidth: 52 }}>
                              [{(rec.priority || "med").toUpperCase()}]
                            </span>
                            <span>{typeof rec === "string" ? rec : `${rec.action || ""}${rec.why ? ` — ${rec.why}` : ""}`}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
