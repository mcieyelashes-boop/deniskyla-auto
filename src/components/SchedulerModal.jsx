import { useState } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const GOLD = "#F0C040";

const SECTION_LABEL = {
  fontFamily: FONT_MONO,
  color: "#ffffff44",
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 8,
  display: "block",
};

const INPUT_BASE = {
  background: "#ffffff08",
  border: "1px solid #ffffff15",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#fff",
  fontFamily: FONT_BODY,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const INTERVALS = [
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
];

function fmtDate(ts) {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchedulerModal({ schedules, flows, onAdd, onToggle, onRemove, onClose }) {
  const [flowId, setFlowId] = useState(flows[0]?.id || "");
  const [interval, setInterval] = useState("daily");
  const [time, setTime] = useState("09:00");

  const handleAdd = () => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    onAdd({ flowId: flow.id, flowName: flow.name, interval, time });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 300,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          padding: 28,
          maxHeight: "90vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <h2
            style={{
              fontFamily: FONT_HEAD,
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              letterSpacing: 0.5,
            }}
          >
            AGENT SCHEDULER
          </h2>
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

        {/* Add form */}
        <div
          style={{
            background: "#07070f",
            border: "1px solid #ffffff10",
            borderRadius: 16,
            padding: 18,
            marginBottom: 22,
          }}
        >
          {/* Flow selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={SECTION_LABEL}>Flow</label>
            <select
              value={flowId}
              onChange={(e) => setFlowId(e.target.value)}
              style={{
                ...INPUT_BASE,
                appearance: "none",
                cursor: "pointer",
                fontFamily: FONT_BODY,
              }}
            >
              {flows.map((f) => (
                <option key={f.id} value={f.id} style={{ background: "#0d0d1a", color: "#fff" }}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Interval pills */}
          <div style={{ marginBottom: 16 }}>
            <label style={SECTION_LABEL}>Interval</label>
            <div style={{ display: "flex", gap: 8 }}>
              {INTERVALS.map((iv) => {
                const active = interval === iv.id;
                return (
                  <button
                    key={iv.id}
                    onClick={() => setInterval(iv.id)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 999,
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      cursor: "pointer",
                      color: active ? "#07070f" : "#ffffffaa",
                      background: active ? GOLD : "#ffffff08",
                      border: active ? "1px solid " + GOLD : "1px solid #ffffff15",
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {iv.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time (daily/weekly) */}
          {interval !== "hourly" && (
            <div style={{ marginBottom: 16 }}>
              <label style={SECTION_LABEL}>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ ...INPUT_BASE, fontFamily: FONT_MONO }}
              />
            </div>
          )}

          {/* Schedule button */}
          <button
            onClick={handleAdd}
            disabled={!flowId}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "none",
              fontFamily: FONT_HEAD,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: flowId ? "pointer" : "not-allowed",
              color: flowId ? "#07070f" : "#ffffff44",
              background: flowId
                ? "linear-gradient(135deg, #F0C040, #f5d472)"
                : "#ffffff0d",
            }}
          >
            SCHEDULE
          </button>
        </div>

        {/* Schedule list */}
        <label style={SECTION_LABEL}>Active Schedules</label>
        {schedules.length === 0 ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffff44",
              fontSize: 13,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No schedules yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schedules.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#07070f",
                  border: "1px solid #ffffff10",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: s.enabled ? 1 : 0.55,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_HEAD,
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.flowName}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        color: GOLD,
                        background: GOLD + "1a",
                        border: "1px solid " + GOLD + "44",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {s.interval}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      color: "#ffffff66",
                      fontSize: 10,
                    }}
                  >
                    Next: {fmtDate(s.nextRun)} · Last: {fmtDate(s.lastRun)}
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => onToggle(s.id)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: s.enabled ? GOLD : "#ffffff20",
                    position: "relative",
                    flexShrink: 0,
                    transition: "background 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: s.enabled ? 20 : 2,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#07070f",
                      transition: "left 0.15s ease",
                    }}
                  />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onRemove(s.id)}
                  style={{
                    background: "#ffffff08",
                    border: "1px solid #ffffff15",
                    borderRadius: 8,
                    color: "#F87171",
                    width: 28,
                    height: 28,
                    fontSize: 14,
                    cursor: "pointer",
                    lineHeight: 1,
                    flexShrink: 0,
                    fontFamily: FONT_BODY,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
