// KanbanBoard.jsx
// Full-width Kanban board: agents as compact cards grouped into columns by status.
// Props: { agents, onAgentClick, orchestrating }
//   agents       — array of { id, name, icon, color, task, status, progress, ... }
//   onAgentClick — fn(agent) called when a card is clicked
//   orchestrating — bool; when true RUNNING cards pulse with a gold border

function colColor(key) {
  if (key === "idle") return "#ffffff22";
  if (key === "queued") return "#FBBF24";
  if (key === "running") return "#34D399";
  return "#38BDF8"; // done/error column base accent
}

function statusColor(s) {
  if (s === "running") return "#34D399";
  if (s === "done") return "#38BDF8";
  if (s === "queued") return "#FBBF24";
  if (s === "error") return "#ef4444";
  return "#ffffff33";
}

function statusLabel(s) {
  if (s === "running") return "RUNNING";
  if (s === "done") return "DONE";
  if (s === "queued") return "QUEUED";
  if (s === "error") return "ERROR";
  return "IDLE";
}

// Column definitions in display order.
const COLUMNS = [
  { key: "idle", label: "IDLE", match: (s) => s === "idle" || (s !== "queued" && s !== "running" && s !== "done" && s !== "error") },
  { key: "queued", label: "QUEUED", match: (s) => s === "queued" },
  { key: "running", label: "RUNNING", match: (s) => s === "running" },
  { key: "done", label: "DONE / ERROR", match: (s) => s === "done" || s === "error" },
];

function AgentCard({ agent, onAgentClick, orchestrating, columnKey }) {
  const isRunning = agent.status === "running";
  const pulse = orchestrating && columnKey === "running";
  const dashed = orchestrating; // visual-only drag hint

  return (
    <div
      onClick={() => onAgentClick && onAgentClick(agent)}
      style={{
        background: "rgba(12,12,22,0.8)",
        border: pulse
          ? "1px solid #F0C040"
          : dashed
            ? "1px dashed #ffffff26"
            : "1px solid #ffffff0f",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        cursor: "pointer",
        transition: "border-color 0.3s, transform 0.15s",
        animation: pulse ? "kanbanPulse 1.6s ease infinite" : "none",
      }}
    >
      {/* Icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 16,
            color: agent.color || "#ffffffcc",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {agent.icon}
        </span>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffffee",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.name}
        </span>
      </div>

      {/* Task — single truncated line */}
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: "#ffffff88",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: isRunning && agent.progress > 0 ? 8 : 8,
        }}
      >
        {agent.task || "—"}
      </div>

      {/* Progress bar (running only) */}
      {isRunning && agent.progress > 0 && (
        <div
          style={{
            height: 4,
            background: "#ffffff14",
            borderRadius: 2,
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${agent.progress}%`,
              background: `linear-gradient(90deg, ${agent.color}88, ${agent.color})`,
              borderRadius: 2,
              transition: "width 0.4s",
            }}
          />
        </div>
      )}

      {/* Status dot + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: statusColor(agent.status),
            boxShadow: isRunning ? `0 0 8px ${statusColor(agent.status)}` : "none",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: 1,
            color: statusColor(agent.status),
          }}
        >
          {statusLabel(agent.status)}
        </span>
      </div>
    </div>
  );
}

export default function KanbanBoard({ agents = [], onAgentClick, orchestrating = false }) {
  // Bucket agents into columns.
  const buckets = COLUMNS.map((col) => {
    let items = agents.filter((a) => col.match(a.status));
    // DONE / ERROR column: sort done first, then error.
    if (col.key === "done") {
      items = [...items].sort((a, b) => {
        const rank = (s) => (s === "done" ? 0 : 1);
        return rank(a.status) - rank(b.status);
      });
    }
    return { ...col, items };
  });

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        @keyframes kanbanPulse {
          0%, 100% { border-color: #F0C040; box-shadow: 0 0 0 0 rgba(240,192,64,0.0); }
          50% { border-color: #F0C040; box-shadow: 0 0 12px 0 rgba(240,192,64,0.35); }
        }
        .kanban-columns::-webkit-scrollbar { height: 6px; }
        .kanban-columns::-webkit-scrollbar-thumb { background: #ffffff22; border-radius: 3px; }
        @media (max-width: 768px) {
          .kanban-column { min-width: 240px !important; }
        }
      `}</style>

      <div
        className="kanban-columns"
        style={{
          display: "flex",
          gap: 14,
          width: "100%",
          overflowX: "auto",
          paddingBottom: 8,
          alignItems: "flex-start",
        }}
      >
        {buckets.map((col) => {
          const accent = colColor(col.key);
          return (
            <div
              key={col.key}
              className="kanban-column"
              style={{
                flex: "1 1 0",
                minWidth: 0,
                background: "rgba(7,7,15,0.5)",
                border: "1px solid #ffffff0a",
                borderLeft: `4px solid ${accent}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {/* Column header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                    color: "#ffffffaa",
                    textTransform: "uppercase",
                  }}
                >
                  {col.label}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#07070f",
                    background: accent,
                    borderRadius: 999,
                    padding: "1px 8px",
                    lineHeight: 1.6,
                  }}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Cards or empty state */}
              {col.items.length === 0 ? (
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 1,
                    color: "#ffffff33",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  No agents
                </div>
              ) : (
                col.items.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onAgentClick={onAgentClick}
                    orchestrating={orchestrating}
                    columnKey={col.key}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
