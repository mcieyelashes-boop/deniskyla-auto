import { useState, useEffect } from "react";

// ─── HISTORY HOOK ────────────────────────────────────────────────────────────

export function useHistory() {
  const [sessions, setSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("deniskyla_history") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("deniskyla_history", JSON.stringify(sessions));
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  }, [sessions]);

  const addSession = (session) => {
    const entry = { id: Date.now().toString(), ...session };
    setSessions((prev) => [entry, ...prev].slice(0, 50)); // keep last 50
    return entry;
  };

  const removeSession = (id) =>
    setSessions((prev) => prev.filter((s) => s.id !== id));

  const clearAll = () => setSessions([]);

  return { sessions, addSession, removeSession, clearAll };
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

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

function durationSeconds(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const s = Math.max(0, Math.round((completedAt - startedAt) / 1000));
  return s;
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────

function SessionCard({ session, onReplay, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const dur = durationSeconds(session.startedAt, session.completedAt);
  const completed = Boolean(session.completedAt);
  const statusDot = completed ? "#34D399" : "#FBBF24";
  const results = Array.isArray(session.results) ? session.results : [];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(12,12,22,0.6)",
        border: `1px solid ${hovered ? "#ffffff22" : "#ffffff0f"}`,
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 10,
        transition: "all 0.18s",
      }}
    >
      {/* Top row — clickable to expand */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 4,
            }}
          >
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
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {session.flowName || "Untitled Flow"}
            </span>
          </div>
          <div
            style={{
              color: "#ffffff44",
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {formatDateTime(session.startedAt)}
            {dur != null && (
              <span style={{ color: "#34D39988" }}>
                {"  •  "}completed in {dur}s
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span
            style={{
              padding: "2px 9px",
              borderRadius: 20,
              background: "#F0C04018",
              border: "1px solid #F0C04033",
              color: "#F0C040",
              fontSize: 9,
              fontFamily: "'DM Mono', monospace",
              whiteSpace: "nowrap",
            }}
          >
            {session.agentCount ?? results.length} agents
          </span>
          <span
            style={{
              color: "#ffffff44",
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              transition: "transform 0.2s",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ›
          </span>
        </div>
      </div>

      {/* Accordion — agent outputs summary */}
      {expanded && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #ffffff0f",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                color: "#ffffff33",
                fontSize: 10,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              No agent outputs recorded.
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.agentId ? `${r.agentId}-${i}` : i}
                style={{
                  background: "#ffffff05",
                  border: "1px solid #ffffff0a",
                  borderRadius: 8,
                  padding: "7px 10px",
                }}
              >
                <div
                  style={{
                    color: "#ffffffcc",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  {r.agentName || r.agentId || "Agent"}
                </div>
                <div
                  style={{
                    color: "#ffffff66",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {(r.output || "").slice(0, 100) ||
                    (r.task ? `task: ${r.task}` : "—")}
                  {(r.output || "").length > 100 ? "…" : ""}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReplay(session);
          }}
          style={{
            flex: 1,
            background: "#F0C04018",
            border: "1px solid #F0C04044",
            borderRadius: 9,
            padding: "7px 12px",
            color: "#F0C040",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          ▶ Replay
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          title="Delete session"
          style={{
            background: "#ef444412",
            border: "1px solid #ef444433",
            borderRadius: 9,
            padding: "7px 12px",
            color: "#ef4444",
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ────────────────────────────────────────────────────────────

export default function HistoryPanel({ sessions, onReplay, onClear, onClose, onDelete }) {
  const list = Array.isArray(sessions) ? sessions : [];

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
          left: 0,
          top: 0,
          bottom: 0,
          width: 340,
          background: "rgba(8,8,18,0.98)",
          borderRight: "1px solid #ffffff0f",
          zIndex: 150,
          display: "flex",
          flexDirection: "column",
          boxShadow: "24px 0 60px rgba(0,0,0,0.5)",
          animation: "slideInLeft 0.25s ease",
        }}
      >
        {/* Local keyframe so panel works standalone */}
        <style>{`
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-24px); }
            to { opacity: 1; transform: translateX(0); }
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
          <span
            style={{
              color: "#ffffffaa",
              fontFamily: "'DM Mono', monospace",
              fontSize: 12,
              letterSpacing: 2,
            }}
          >
            SESSION HISTORY
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {list.length > 0 && (
              <button
                onClick={onClear}
                style={{
                  background: "#ef444412",
                  border: "1px solid #ef444433",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#ef4444",
                  fontFamily: "'DM Mono', monospace",
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

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 16px",
          }}
        >
          {list.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "40px 24px",
                color: "#ffffff44",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              No sessions yet. Run a flow to start tracking history.
            </div>
          ) : (
            list.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onReplay={onReplay}
                onDelete={(id) => onDelete && onDelete(id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
