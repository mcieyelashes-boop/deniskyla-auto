import { useState, useMemo } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";
const GOLD = "#F0C040";

// ─── UTILS ─────────────────────────────────────────────────────────────────

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms) {
  if (ms == null) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function agentsList(version) {
  return Array.isArray(version?.agents) ? version.agents : [];
}

function hadErrors(version) {
  return agentsList(version).some((a) => a.status === "error");
}

// ─── COMPARE OVERLAY ─────────────────────────────────────────────────────────

function CompareOverlay({ older, newer, onClose }) {
  // Build a unified agent list keyed by id, preserving newer order then older extras
  const merged = useMemo(() => {
    const olderAgents = agentsList(older);
    const newerAgents = agentsList(newer);
    const byIdOlder = new Map(olderAgents.map((a) => [a.id, a]));
    const byIdNewer = new Map(newerAgents.map((a) => [a.id, a]));

    const order = [];
    const seen = new Set();
    newerAgents.forEach((a) => {
      order.push(a.id);
      seen.add(a.id);
    });
    olderAgents.forEach((a) => {
      if (!seen.has(a.id)) {
        order.push(a.id);
        seen.add(a.id);
      }
    });

    return order.map((id) => {
      const o = byIdOlder.get(id);
      const n = byIdNewer.get(id);
      const oOut = (o?.output || "").trim();
      const nOut = (n?.output || "").trim();
      return {
        id,
        name: n?.name || o?.name || id,
        olderOutput: o ? oOut : null,
        newerOutput: n ? nOut : null,
        changed: oOut !== nOut,
      };
    });
  }, [older, newer]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,4,10,0.92)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 400,
        display: "flex",
        padding: 24,
        boxSizing: "border-box",
        animation: "fadeSlideIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: "auto",
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          background: "#07070f",
          border: "1px solid #ffffff15",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid #ffffff0f",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_HEAD,
                color: "#fff",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              Compare Runs
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                color: "#ffffff44",
                fontSize: 10,
                marginTop: 3,
              }}
            >
              {older?.flowName || "Flow"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#ffffff08",
              border: "1px solid #ffffff15",
              borderRadius: 8,
              color: "#ffffff88",
              width: 32,
              height: 32,
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
              fontFamily: FONT_BODY,
            }}
          >
            ×
          </button>
        </div>

        {/* Column labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            padding: "12px 22px",
            borderBottom: "1px solid #ffffff0a",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_MONO,
                color: "#ffffff66",
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              OLDER
            </div>
            <div style={{ fontFamily: FONT_MONO, color: "#ffffff44", fontSize: 10, marginTop: 2 }}>
              {formatDateTime(older?.ranAt || older?.savedAt)} · {formatDuration(older?.duration)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: FONT_MONO,
                color: GOLD,
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              NEWER
            </div>
            <div style={{ fontFamily: FONT_MONO, color: GOLD + "99", fontSize: 10, marginTop: 2 }}>
              {formatDateTime(newer?.ranAt || newer?.savedAt)} · {formatDuration(newer?.duration)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {merged.length === 0 ? (
            <div
              style={{
                color: "#ffffff44",
                fontFamily: FONT_BODY,
                fontSize: 13,
                textAlign: "center",
                padding: 40,
              }}
            >
              No agent outputs to compare.
            </div>
          ) : (
            merged.map((m) => (
              <div key={m.id} style={{ marginBottom: 22 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_HEAD,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {m.name}
                  </span>
                  {m.changed ? (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: GOLD + "18",
                        border: "1px solid " + GOLD + "44",
                        color: GOLD,
                        fontSize: 9,
                        fontFamily: FONT_MONO,
                        letterSpacing: 0.5,
                      }}
                    >
                      CHANGED
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "#ffffff08",
                        border: "1px solid #ffffff15",
                        color: "#ffffff55",
                        fontSize: 9,
                        fontFamily: FONT_MONO,
                        letterSpacing: 0.5,
                      }}
                    >
                      SAME
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      background: "#0c0c16",
                      border: "1px solid #ffffff0f",
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: m.olderOutput == null ? "#ffffff33" : "#ffffff99",
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 320,
                      overflowY: "auto",
                    }}
                  >
                    {m.olderOutput == null
                      ? "(agent not present in this run)"
                      : m.olderOutput || "(empty output)"}
                  </pre>
                  <pre
                    style={{
                      margin: 0,
                      background: m.changed ? GOLD + "0d" : "#0c0c16",
                      border: `1px solid ${m.changed ? GOLD + "33" : "#ffffff0f"}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      color:
                        m.newerOutput == null
                          ? "#ffffff33"
                          : m.changed
                          ? GOLD
                          : "#ffffff99",
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 320,
                      overflowY: "auto",
                    }}
                  >
                    {m.newerOutput == null
                      ? "(agent not present in this run)"
                      : m.newerOutput || "(empty output)"}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VERSION CARD ──────────────────────────────────────────────────────────

function VersionCard({ version, runIndex, selected, onToggleSelect, onReplay, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const errored = hadErrors(version);
  const statusDot = errored ? "#ef4444" : "#34D399";
  const statusLabel = errored ? "had errors" : "all done";
  const ts = version.ranAt || version.savedAt;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected
          ? GOLD + "10"
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "rgba(12,12,22,0.6)",
        border: `1px solid ${selected ? GOLD + "55" : hovered ? "#ffffff22" : "#ffffff0f"}`,
        borderRadius: 12,
        padding: "11px 13px",
        marginBottom: 9,
        transition: "all 0.18s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 9,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: statusDot,
                boxShadow: `0 0 8px ${statusDot}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "#fff",
                fontFamily: FONT_HEAD,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Run #{runIndex}
            </span>
            <span
              style={{
                color: errored ? "#ef444499" : "#34D39999",
                fontFamily: FONT_MONO,
                fontSize: 9,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: FONT_MONO }}>
            {formatDateTime(ts)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span
            style={{
              padding: "2px 9px",
              borderRadius: 20,
              background: GOLD + "18",
              border: "1px solid " + GOLD + "33",
              color: GOLD,
              fontSize: 9,
              fontFamily: FONT_MONO,
              whiteSpace: "nowrap",
            }}
          >
            {formatDuration(version.duration)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 7 }}>
        <button
          onClick={() => onToggleSelect(version.id)}
          style={{
            flex: 1,
            background: selected ? GOLD : GOLD + "18",
            border: "1px solid " + GOLD + "44",
            borderRadius: 9,
            padding: "6px 10px",
            color: selected ? "#07070f" : GOLD,
            fontFamily: FONT_HEAD,
            fontWeight: 700,
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: 0.3,
            transition: "all 0.15s",
          }}
        >
          {selected ? "✓ SELECTED" : "COMPARE"}
        </button>
        <button
          onClick={() => onReplay(version)}
          style={{
            flex: 1,
            background: "#ffffff08",
            border: "1px solid #ffffff1f",
            borderRadius: 9,
            padding: "6px 10px",
            color: "#ffffffcc",
            fontFamily: FONT_HEAD,
            fontWeight: 700,
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          ▶ REPLAY
        </button>
        <button
          onClick={() => onDelete(version.id)}
          title="Delete version"
          style={{
            background: "#ef444412",
            border: "1px solid #ef444433",
            borderRadius: 9,
            padding: "6px 10px",
            color: "#ef4444",
            fontFamily: FONT_MONO,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── FLOW GROUP (accordion) ──────────────────────────────────────────────────

function FlowGroup({
  flowName,
  versions,
  expanded,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  onReplay,
  onDelete,
}) {
  // Oldest run = #1. versions arrive newest-first, so index from the end.
  const count = versions.length;

  return (
    <div
      style={{
        background: "rgba(10,10,20,0.5)",
        border: "1px solid #ffffff0f",
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span
            style={{
              color: "#ffffff55",
              fontSize: 12,
              fontFamily: FONT_MONO,
              transition: "transform 0.2s",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ›
          </span>
          <span
            style={{
              color: "#fff",
              fontFamily: FONT_HEAD,
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {flowName}
          </span>
        </div>
        <span
          style={{
            padding: "2px 9px",
            borderRadius: 20,
            background: "#ffffff0a",
            border: "1px solid #ffffff15",
            color: "#ffffff88",
            fontSize: 9,
            fontFamily: FONT_MONO,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {count} {count === 1 ? "run" : "runs"}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px" }}>
          {versions.map((v, i) => (
            <VersionCard
              key={v.id}
              version={v}
              runIndex={count - i}
              selected={selectedIds.includes(v.id)}
              onToggleSelect={onToggleSelect}
              onReplay={onReplay}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PANEL ───────────────────────────────────────────────────────────────────

export default function FlowVersionsPanel({
  versions,
  versionsByFlow,
  onDelete,
  onClear,
  onClose,
  onReplay,
}) {
  const groups = versionsByFlow && typeof versionsByFlow === "object" ? versionsByFlow : {};
  const flowNames = Object.keys(groups);
  const totalCount = Array.isArray(versions) ? versions.length : 0;

  const [expandedFlows, setExpandedFlows] = useState(() => new Set(flowNames));
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparing, setComparing] = useState(false);

  const toggleExpand = (name) =>
    setExpandedFlows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // Selecting a 3rd version drops the oldest selection (keep max 2).
  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = [...prev, id];
      return next.slice(-2);
    });

  const selectedVersions = useMemo(() => {
    const all = Array.isArray(versions) ? versions : [];
    return selectedIds
      .map((id) => all.find((v) => v.id === id))
      .filter(Boolean);
  }, [selectedIds, versions]);

  const canCompare = selectedVersions.length === 2;

  // Order older→newer by timestamp for the compare overlay
  const [older, newer] = useMemo(() => {
    if (selectedVersions.length < 2) return [null, null];
    const sorted = [...selectedVersions].sort(
      (a, b) => (a.ranAt || a.savedAt || 0) - (b.ranAt || b.savedAt || 0)
    );
    return [sorted[0], sorted[1]];
  }, [selectedVersions]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 149,
          animation: "fadeSlideIn 0.2s ease",
        }}
      />

      {/* Slide-in panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 420,
          background: "rgba(8,8,18,0.98)",
          borderLeft: "1px solid #ffffff0f",
          zIndex: 150,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-24px 0 60px rgba(0,0,0,0.5)",
          animation: "slideInRight 0.25s ease",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 18px 14px",
            borderBottom: "1px solid #ffffff0f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                color: "#ffffffaa",
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: 2,
              }}
            >
              FLOW VERSIONS
            </span>
            <span
              style={{
                padding: "2px 9px",
                borderRadius: 20,
                background: GOLD + "18",
                border: "1px solid " + GOLD + "33",
                color: GOLD,
                fontSize: 9,
                fontFamily: FONT_MONO,
              }}
            >
              {totalCount}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {totalCount > 0 && (
              <button
                onClick={onClear}
                style={{
                  background: "#ef444412",
                  border: "1px solid #ef444433",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#ef4444",
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                CLEAR ALL
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff66",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Compare hint bar */}
        {selectedIds.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "10px 16px",
              background: GOLD + "0d",
              borderBottom: "1px solid " + GOLD + "22",
            }}
          >
            <span style={{ color: GOLD, fontFamily: FONT_MONO, fontSize: 10 }}>
              {selectedIds.length === 1
                ? "Select 1 more run to compare"
                : "2 runs selected"}
            </span>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => setSelectedIds([])}
                style={{
                  background: "transparent",
                  border: "1px solid #ffffff1f",
                  borderRadius: 8,
                  padding: "4px 10px",
                  color: "#ffffff88",
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                CLEAR
              </button>
              <button
                disabled={!canCompare}
                onClick={() => setComparing(true)}
                style={{
                  background: canCompare ? GOLD : GOLD + "22",
                  border: "1px solid " + GOLD + "55",
                  borderRadius: 8,
                  padding: "4px 12px",
                  color: canCompare ? "#07070f" : GOLD + "88",
                  fontFamily: FONT_HEAD,
                  fontWeight: 700,
                  fontSize: 10,
                  cursor: canCompare ? "pointer" : "not-allowed",
                  letterSpacing: 0.3,
                }}
              >
                VIEW DIFF
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {flowNames.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "40px 24px",
                color: "#ffffff44",
                fontFamily: FONT_BODY,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              No saved versions yet. Run a flow to snapshot it here.
            </div>
          ) : (
            flowNames.map((name) => (
              <FlowGroup
                key={name}
                flowName={name}
                versions={groups[name]}
                expanded={expandedFlows.has(name)}
                onToggleExpand={() => toggleExpand(name)}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onReplay={onReplay}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Compare overlay */}
      {comparing && canCompare && (
        <CompareOverlay
          older={older}
          newer={newer}
          onClose={() => setComparing(false)}
        />
      )}
    </>
  );
}
