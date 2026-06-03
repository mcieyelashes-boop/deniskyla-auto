import { useState, useMemo } from "react";
import { callClaude } from "../lib/claude";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const GOLD = "#F0C040";
const DARK_BG = "#07070f";
const MAX_SUBJECTS = 10;

const KEYFRAMES = `
@keyframes brSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes brSpin {
  to { transform: rotate(360deg); }
}
@keyframes brPop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.18); }
  100% { transform: scale(1); opacity: 1; }
}
`;

// Built-in preset flows mirror the dashboard's ORCHESTRA_FLOWS.
const PRESET_FLOWS = [
  {
    id: "launch",
    name: "🚀 Product Launch",
    desc: "Full campaign dari riset sampai publish",
    chain: ["market", "content", "webdev", "social", "scheduler", "email"],
  },
  {
    id: "growth",
    name: "📈 Growth Sprint",
    desc: "Fokus lead gen + nurture",
    chain: ["market", "leadgen", "email", "social"],
  },
  {
    id: "content_blitz",
    name: "✦ Content Blitz",
    desc: "Produksi & jadwal konten masif",
    chain: ["content", "social", "scheduler"],
  },
];

// Parse a textarea blob into a clean, de-duplicated, capped subject list.
function parseSubjects(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, i, arr) => arr.indexOf(line) === i)
    .slice(0, MAX_SUBJECTS);
}

const STATUS_META = {
  pending: { color: "#ffffff55", label: "PENDING" },
  running: { color: GOLD, label: "RUNNING" },
  done: { color: "#34D399", label: "DONE" },
  error: { color: "#ef4444", label: "ERROR" },
};

export default function BatchRunner({ flows = [], agents: configAgents = [], onClose }) {
  // Merge incoming preset flows with the defaults; incoming take priority by id.
  const allFlows = useMemo(() => {
    const byId = new Map();
    PRESET_FLOWS.forEach((f) => byId.set(f.id, f));
    (flows || []).forEach((f) => {
      if (f && f.id) byId.set(f.id, f);
    });
    return Array.from(byId.values());
  }, [flows]);

  const agentMap = useMemo(() => {
    const m = new Map();
    (configAgents || []).forEach((a) => m.set(a.id, a));
    return m;
  }, [configAgents]);

  const [selectedFlow, setSelectedFlow] = useState(null);
  const [customDesc, setCustomDesc] = useState("");
  const [subjectsText, setSubjectsText] = useState("");
  const [running, setRunning] = useState(false);
  const [batchResults, setBatchResults] = useState([]); // [{subject, status, results}]
  const [expanded, setExpanded] = useState({}); // subjectIndex -> bool
  const [subjectsFocused, setSubjectsFocused] = useState(false);
  const [customFocused, setCustomFocused] = useState(false);

  const subjects = useMemo(() => parseSubjects(subjectsText), [subjectsText]);

  // The flow that will actually run: either a selected preset, or a custom one
  // synthesized from the typed one-line description.
  const effectiveFlow = useMemo(() => {
    if (selectedFlow) return selectedFlow;
    const desc = customDesc.trim();
    if (desc) {
      return {
        id: "custom",
        name: desc,
        desc,
        chain: [],
        custom: true,
      };
    }
    return null;
  }, [selectedFlow, customDesc]);

  // Agents resolved for the active flow's chain (used for the results table header).
  const flowAgents = useMemo(() => {
    if (!effectiveFlow) return [];
    if (effectiveFlow.chain && effectiveFlow.chain.length) {
      return effectiveFlow.chain
        .map((id) => agentMap.get(id))
        .filter(Boolean);
    }
    // Custom one-liner with no chain: fall back to the full roster.
    return configAgents || [];
  }, [effectiveFlow, agentMap, configAgents]);

  const canRun =
    !running && !!effectiveFlow && subjects.length > 0 && flowAgents.length > 0;

  function selectPreset(flow) {
    if (running) return;
    setSelectedFlow(flow);
    setCustomDesc("");
  }

  function onCustomChange(value) {
    setCustomDesc(value);
    if (value.trim()) setSelectedFlow(null);
  }

  function toggleExpanded(i) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  // Run the flow against every subject, sequentially, to avoid rate limits.
  async function runBatch() {
    if (!canRun) return;
    setRunning(true);

    const initial = subjects.map((subject) => ({
      subject,
      status: "pending",
      results: [],
    }));
    setBatchResults(initial);

    for (let s = 0; s < subjects.length; s++) {
      const subject = subjects[s];

      // Mark this subject as running.
      setBatchResults((prev) =>
        prev.map((row, i) => (i === s ? { ...row, status: "running" } : row))
      );

      const subjectResults = [];
      let subjectErrored = false;

      for (const agent of flowAgents) {
        const system =
          agent.systemPrompt ||
          "You are an expert marketing automation agent. Return 4-5 actionable bullet points.";
        const task = agent.defaultTask || effectiveFlow.name;
        const userMsg =
          `Flow: ${effectiveFlow.name}\n` +
          `Subject / target: ${subject}\n` +
          `Your task: ${task}\n\n` +
          `Focus your entire response on the subject "${subject}".`;

        try {
          const text = await callClaude(system, userMsg);
          subjectResults.push({
            agentId: agent.id,
            agentName: agent.name,
            color: agent.color,
            icon: agent.icon,
            output: text,
            status: "done",
          });
        } catch (e) {
          subjectErrored = true;
          subjectResults.push({
            agentId: agent.id,
            agentName: agent.name,
            color: agent.color,
            icon: agent.icon,
            output: e.message || "Request failed",
            status: "error",
          });
        }

        // Push incremental progress for this subject so the UI updates live.
        setBatchResults((prev) =>
          prev.map((row, i) =>
            i === s ? { ...row, results: [...subjectResults] } : row
          )
        );
      }

      setBatchResults((prev) =>
        prev.map((row, i) =>
          i === s
            ? {
                ...row,
                status: subjectErrored ? "error" : "done",
                results: subjectResults,
              }
            : row
        )
      );
    }

    setRunning(false);
  }

  const flowLabel = effectiveFlow ? effectiveFlow.name : "";
  const runCount = subjects.length;

  return (
    <div
      onClick={running ? undefined : onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 340,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <style>{KEYFRAMES}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 600,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          animation: "brSlideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: "26px 28px 18px",
            borderBottom: "1px solid #ffffff0d",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: FONT_HEAD,
                color: GOLD,
                fontSize: 24,
                fontWeight: 800,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              BATCH RUNNER
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Run one flow on multiple inputs
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            style={{
              background: "#ffffff08",
              border: "1px solid #ffffff15",
              borderRadius: 8,
              color: "#ffffff88",
              width: 34,
              height: 34,
              fontSize: 20,
              lineHeight: 1,
              cursor: running ? "not-allowed" : "pointer",
              opacity: running ? 0.4 : 1,
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div
          style={{
            padding: "22px 28px 28px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* STEP 1 — SELECT FLOW */}
          <SectionLabel n="1" text="SELECT FLOW" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {allFlows.map((flow) => {
              const active = selectedFlow && selectedFlow.id === flow.id;
              return (
                <button
                  key={flow.id}
                  onClick={() => selectPreset(flow)}
                  disabled={running}
                  style={{
                    textAlign: "left",
                    background: active ? `${GOLD}14` : "#ffffff06",
                    border: `1px solid ${active ? `${GOLD}66` : "#ffffff15"}`,
                    borderRadius: 14,
                    padding: "13px 14px",
                    cursor: running ? "not-allowed" : "pointer",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_HEAD,
                      color: active ? GOLD : "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      letterSpacing: -0.2,
                    }}
                  >
                    {flow.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_BODY,
                      color: "#ffffff66",
                      fontSize: 11,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {flow.desc}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      color: "#ffffff44",
                      fontSize: 10,
                      marginTop: 6,
                      letterSpacing: 0.5,
                    }}
                  >
                    {(flow.chain || []).length} agents
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              fontFamily: FONT_MONO,
              color: "#ffffff33",
              fontSize: 10,
              letterSpacing: 1,
              textAlign: "center",
              margin: "10px 0",
            }}
          >
            — OR DESCRIBE A CUSTOM ONE —
          </div>

          <input
            value={customDesc}
            onChange={(e) => onCustomChange(e.target.value)}
            onFocus={() => setCustomFocused(true)}
            onBlur={() => setCustomFocused(false)}
            disabled={running}
            placeholder="e.g. Research + write a launch tweet for each"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: DARK_BG,
              border: `1px solid ${customFocused ? `${GOLD}66` : "#ffffff15"}`,
              borderRadius: 12,
              padding: "12px 14px",
              color: "#fff",
              fontFamily: FONT_BODY,
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.15s ease",
              marginBottom: 24,
            }}
          />

          {/* STEP 2 — ADD SUBJECTS */}
          <SectionLabel n="2" text="ADD SUBJECTS" />
          <textarea
            value={subjectsText}
            onChange={(e) => setSubjectsText(e.target.value)}
            onFocus={() => setSubjectsFocused(true)}
            onBlur={() => setSubjectsFocused(false)}
            disabled={running}
            placeholder={"Enter one subject per line\nProduct A\nProduct B\nProduct C"}
            rows={5}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: DARK_BG,
              border: `1px solid ${subjectsFocused ? `${GOLD}66` : "#ffffff15"}`,
              borderRadius: 12,
              padding: "12px 14px",
              color: "#fff",
              fontFamily: FONT_MONO,
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.6,
              transition: "border-color 0.15s ease",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: subjects.length >= MAX_SUBJECTS ? "#ef4444" : GOLD,
                background:
                  subjects.length >= MAX_SUBJECTS ? "#ef444412" : `${GOLD}12`,
                border: `1px solid ${
                  subjects.length >= MAX_SUBJECTS ? "#ef444433" : `${GOLD}33`
                }`,
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              {subjects.length} subject{subjects.length === 1 ? "" : "s"}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#ffffff44",
              }}
            >
              max {MAX_SUBJECTS}
            </span>
          </div>

          {/* STEP 3 — RUN */}
          <SectionLabel n="3" text="RUN" />
          <button
            onClick={runBatch}
            disabled={!canRun}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontFamily: FONT_HEAD,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.5,
              cursor: canRun ? "pointer" : "not-allowed",
              opacity: canRun ? 1 : 0.45,
              background: "linear-gradient(135deg, #F0C040, #F59E0B)",
              color: DARK_BG,
              transition: "opacity 0.15s ease",
            }}
          >
            {running
              ? "⏳ RUNNING BATCH…"
              : `▶ RUN BATCH (${runCount} flow${runCount === 1 ? "" : "s"})`}
          </button>

          {!effectiveFlow && (
            <Hint text="Pick a flow or describe a custom one to begin." />
          )}
          {effectiveFlow && subjects.length === 0 && (
            <Hint text="Add at least one subject (one per line)." />
          )}

          {/* ── PROGRESS ROWS ── */}
          {batchResults.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  color: "#ffffff44",
                  fontSize: 10,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                PROGRESS · {flowLabel}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {batchResults.map((row, i) => {
                  const meta = STATUS_META[row.status] || STATUS_META.pending;
                  const isDone = row.status === "done" || row.status === "error";
                  return (
                    <div
                      key={i}
                      style={{
                        background: "#ffffff05",
                        border: `1px solid ${meta.color}33`,
                        borderRadius: 12,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <StatusIndicator status={row.status} color={meta.color} />
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontFamily: FONT_BODY,
                            color: "#fff",
                            fontSize: 13,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.subject}
                        </div>
                        <span
                          style={{
                            fontFamily: FONT_MONO,
                            color: meta.color,
                            fontSize: 10,
                            letterSpacing: 0.5,
                            flexShrink: 0,
                          }}
                        >
                          {meta.label}
                        </span>
                        {isDone && (
                          <button
                            onClick={() => toggleExpanded(i)}
                            style={{
                              flexShrink: 0,
                              background: `${GOLD}12`,
                              border: `1px solid ${GOLD}33`,
                              borderRadius: 8,
                              color: GOLD,
                              padding: "5px 10px",
                              fontSize: 10,
                              fontFamily: FONT_MONO,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {expanded[i] ? "▲ HIDE" : "View Results"}
                          </button>
                        )}
                      </div>

                      {/* Expandable per-agent output */}
                      {isDone && expanded[i] && (
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {row.results.map((r, ri) => (
                            <div
                              key={ri}
                              style={{
                                background: DARK_BG,
                                border: `1px solid ${(r.color || GOLD)}2a`,
                                borderRadius: 10,
                                padding: "10px 12px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginBottom: 6,
                                }}
                              >
                                <span style={{ color: r.color || GOLD, fontSize: 12 }}>
                                  {r.icon}
                                </span>
                                <span
                                  style={{
                                    fontFamily: FONT_MONO,
                                    color: r.color || GOLD,
                                    fontSize: 11,
                                    letterSpacing: 0.3,
                                  }}
                                >
                                  {r.agentName}
                                </span>
                                {r.status === "error" && (
                                  <span
                                    style={{
                                      fontFamily: FONT_MONO,
                                      color: "#ef4444",
                                      fontSize: 9,
                                      marginLeft: "auto",
                                    }}
                                  >
                                    ⚠ ERROR
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontFamily: FONT_BODY,
                                  color: r.status === "error" ? "#ef4444" : "#ffffffcc",
                                  fontSize: 12,
                                  lineHeight: 1.55,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {r.output}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── SUMMARY TABLE (when whole batch is finished) ── */}
              {!running && batchResults.every((r) => r.status === "done" || r.status === "error") && (
                <SummaryTable
                  rows={batchResults}
                  flowAgents={flowAgents}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SectionLabel({ n, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: `${GOLD}14`,
          border: `1px solid ${GOLD}44`,
          color: GOLD,
          fontFamily: FONT_MONO,
          fontSize: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: FONT_HEAD,
          color: "#fff",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function Hint({ text }) {
  return (
    <div
      style={{
        marginTop: 10,
        fontFamily: FONT_MONO,
        color: "#ffffff44",
        fontSize: 11,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function StatusIndicator({ status, color }) {
  if (status === "running") {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${color}33`,
          borderTopColor: color,
          animation: "brSpin 0.8s linear infinite",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
    );
  }
  if (status === "done") {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: color,
          color: "#07070f",
          fontSize: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          animation: "brPop 0.3s ease",
        }}
      >
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: color,
          color: "#07070f",
          fontSize: 11,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          animation: "brPop 0.3s ease",
        }}
      >
        !
      </span>
    );
  }
  // pending
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        flexShrink: 0,
        display: "inline-block",
        opacity: 0.5,
      }}
    />
  );
}

// Compact matrix: subjects (rows) × agents (columns) with done/error markers.
function SummaryTable({ rows, flowAgents, expanded, onToggle }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          color: "#ffffff44",
          fontSize: 10,
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        SUMMARY
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: FONT_MONO,
            fontSize: 11,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  color: "#ffffff66",
                  borderBottom: "1px solid #ffffff15",
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                }}
              >
                Subject
              </th>
              {flowAgents.map((a) => (
                <th
                  key={a.id}
                  style={{
                    textAlign: "center",
                    padding: "8px 10px",
                    color: a.color,
                    borderBottom: "1px solid #ffffff15",
                    fontWeight: 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.icon} {a.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: "8px 10px",
                    color: "#fff",
                    borderBottom: "1px solid #ffffff0a",
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <button
                    onClick={() => onToggle(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: expanded[i] ? "#F0C040" : "#fff",
                      cursor: "pointer",
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      padding: 0,
                      textAlign: "left",
                    }}
                  >
                    {row.subject}
                  </button>
                </td>
                {flowAgents.map((a) => {
                  const r = row.results.find((x) => x.agentId === a.id);
                  const ok = r && r.status === "done";
                  const err = r && r.status === "error";
                  return (
                    <td
                      key={a.id}
                      style={{
                        textAlign: "center",
                        padding: "8px 10px",
                        borderBottom: "1px solid #ffffff0a",
                        color: ok ? "#34D399" : err ? "#ef4444" : "#ffffff33",
                      }}
                    >
                      {ok ? "✓" : err ? "✕" : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
