// DataPanel — renders structured agent output (leads / research) from a server run.
// Props: { runOutputs, onClose }
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

export default function DataPanel({ runOutputs = [], onClose }) {
  const leads = collectLeads(runOutputs);
  const research = collectResearch(runOutputs);
  const isEmpty = leads.length === 0 && research.length === 0;

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
              Leads &amp; research extracted from this run
            </div>
          </div>
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
              Run a lead-gen or research flow to populate this panel.
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
      </div>
    </div>
  );
}
