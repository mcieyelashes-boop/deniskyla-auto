import { useState } from "react";
import { AGENTS } from "../config/agents";

// ─── PALETTE ───────────────────────────────────────────────────────────────
const GOLD = "#F0C040";
const GREEN = "#34D399";
const BLUE = "#38BDF8";
const PURPLE = "#A78BFA";

// ─── UTILS ───────────────────────────────────────────────────────────────────

function agentMeta(id) {
  return (
    AGENTS.find((a) => a.id === id) || {
      name: id,
      color: "#94A3B8",
      icon: "•",
    }
  );
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0s";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function relativeTime(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Returns last 7 days as [{ key, label, count }]
function last7Days(dailyRuns) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    out.push({
      key,
      label: dayNames[d.getDay()],
      count: (dailyRuns && dailyRuns[key]) || 0,
    });
  }
  return out;
}

// ─── METRIC CARD ───────────────────────────────────────────────────────────

function MetricCard({ value, label, color, suffix = "" }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "rgba(12,12,22,0.7)",
        border: "1px solid #ffffff0f",
        borderRadius: 16,
        padding: "18px 16px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: color,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 30,
          lineHeight: 1,
          color,
          letterSpacing: -0.5,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 1 }}>
            {suffix}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9.5,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "#ffffff77",
          marginTop: 9,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── SECTION TITLE ───────────────────────────────────────────────────────────

function SectionTitle({ children, accent = "#ffffff44" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 2,
          background: accent,
        }}
      />
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "#ffffffaa",
          fontWeight: 600,
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ─── AGENT USAGE BAR CHART ─────────────────────────────────────────────────

function AgentUsageChart({ agentUsage }) {
  const entries = Object.entries(agentUsage || {})
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return <EmptyHint text="No agent activity yet" />;
  }

  const max = Math.max(...entries.map(([, c]) => c));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {entries.map(([id, count]) => {
        const meta = agentMeta(id);
        const pct = Math.max(6, Math.round((count / max) * 100));
        return (
          <div key={id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: "#ffffffcc",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: meta.color }}>{meta.icon}</span>
                {meta.name}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: meta.color,
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: meta.color,
                  borderRadius: 6,
                  boxShadow: `0 0 12px ${meta.color}66`,
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TOP FLOWS ───────────────────────────────────────────────────────────────

function TopFlows({ flowUsage }) {
  const entries = Object.entries(flowUsage || {})
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (entries.length === 0) return <EmptyHint text="No flows run yet" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(([name, count], i) => (
        <div
          key={name}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "rgba(12,12,22,0.7)",
            border: "1px solid #ffffff0f",
            borderRadius: 10,
            padding: "9px 12px",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 12,
                color: GOLD,
                width: 16,
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#ffffffdd",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: GOLD,
              background: "#F0C04018",
              border: "1px solid #F0C04033",
              borderRadius: 20,
              padding: "2px 10px",
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── DAILY ACTIVITY CHART ─────────────────────────────────────────────────

function DailyChart({ dailyRuns }) {
  const days = last7Days(dailyRuns);
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 8,
        height: 130,
        background: "rgba(12,12,22,0.7)",
        border: "1px solid #ffffff0f",
        borderRadius: 14,
        padding: "16px 14px 12px",
      }}
    >
      {days.map((d) => {
        const h = d.count === 0 ? 3 : Math.max(8, (d.count / max) * 78);
        return (
          <div
            key={d.key}
            title={`${d.count} run${d.count === 1 ? "" : "s"}`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              height: "100%",
              justifyContent: "flex-end",
              cursor: "default",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: d.count > 0 ? BLUE : "#ffffff44",
                fontWeight: 600,
                height: 12,
              }}
            >
              {d.count > 0 ? d.count : ""}
            </span>
            <div
              style={{
                width: "100%",
                maxWidth: 26,
                height: h,
                borderRadius: 6,
                background:
                  d.count > 0
                    ? `linear-gradient(180deg, ${BLUE}, ${BLUE}66)`
                    : "rgba(255,255,255,0.06)",
                boxShadow: d.count > 0 ? `0 0 14px ${BLUE}55` : "none",
                transition: "height 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9.5,
                color: "#ffffff77",
                letterSpacing: 0.5,
              }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SUCCESS RING (SVG) ───────────────────────────────────────────────────

function SuccessRing({ rate }) {
  const size = 96;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - rate / 100);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={GREEN}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)",
          filter: `drop-shadow(0 0 6px ${GREEN}88)`,
        }}
      />
    </svg>
  );
}

function EmptyHint({ text }) {
  return (
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: "#ffffff55",
        padding: "14px 0",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

// ─── ANALYTICS PANEL ─────────────────────────────────────────────────────────

export default function AnalyticsPanel({ stats, onReset, onClose }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const s = stats || {};

  const totalRuns = s.totalRuns || 0;
  const totalTasks = s.totalAgentTasks || 0;
  const success = s.successCount || 0;
  const errors = s.errorCount || 0;
  const resolved = success + errors;
  const successRate = resolved > 0 ? Math.round((success / resolved) * 100) : 0;

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onReset && onReset();
    setConfirmReset(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,7,15,0.98)",
        backdropFilter: "blur(4px)",
        zIndex: 160,
        display: "flex",
        flexDirection: "column",
        animation: "analyticsSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        overflowY: "auto",
      }}
    >
      <style>{`
        @keyframes analyticsSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          padding: "28px 24px 60px",
          boxSizing: "border-box",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 22,
                letterSpacing: 3,
                color: GOLD,
                fontWeight: 600,
              }}
            >
              ANALYTICS
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#ffffff77",
                marginTop: 4,
              }}
            >
              Performance insights
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={handleReset}
              onBlur={() => setConfirmReset(false)}
              style={{
                background: "#ef444412",
                border: "1px solid #ef444433",
                borderRadius: 9,
                padding: "7px 12px",
                color: "#ef4444",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10.5,
                letterSpacing: 0.5,
                cursor: "pointer",
              }}
            >
              {confirmReset ? "Confirm reset?" : "Reset stats"}
            </button>
            <button
              onClick={onClose}
              title="Close"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #ffffff1a",
                borderRadius: 9,
                width: 34,
                height: 34,
                color: "#ffffffcc",
                fontSize: 15,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Section 1: Key Metrics ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <MetricCard value={totalRuns} label="Total Runs" color="#ffffff" />
          <MetricCard
            value={successRate}
            suffix="%"
            label="Success Rate"
            color={GREEN}
          />
          <MetricCard value={totalTasks} label="Total Tasks" color={BLUE} />
          <MetricCard
            value={formatDuration(s.avgDuration)}
            label="Avg Duration"
            color={PURPLE}
          />
        </div>

        {/* ── Section 2: Agent Usage ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionTitle accent={GREEN}>Agent Usage</SectionTitle>
          <AgentUsageChart agentUsage={s.agentUsage} />
        </div>

        {/* ── Section 3: Top Flows ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionTitle accent={GOLD}>Top Flows</SectionTitle>
          <TopFlows flowUsage={s.flowUsage} />
        </div>

        {/* ── Section 4: Daily Activity ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionTitle accent={BLUE}>Daily Runs — Last 7 Days</SectionTitle>
          <DailyChart dailyRuns={s.dailyRuns} />
        </div>

        {/* ── Section 5: Recent Activity Summary ── */}
        <div>
          <SectionTitle accent={PURPLE}>Summary</SectionTitle>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              background: "rgba(12,12,22,0.7)",
              border: "1px solid #ffffff0f",
              borderRadius: 16,
              padding: "20px 22px",
            }}
          >
            {/* Success ring */}
            <div
              style={{
                position: "relative",
                width: 96,
                height: 96,
                flexShrink: 0,
              }}
            >
              <SuccessRing rate={successRate} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 22,
                    color: GREEN,
                    lineHeight: 1,
                  }}
                >
                  {successRate}%
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    letterSpacing: 1,
                    color: "#ffffff77",
                    marginTop: 3,
                  }}
                >
                  SUCCESS
                </span>
              </div>
            </div>

            {/* Stats column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#ffffffcc",
                  marginBottom: 10,
                }}
              >
                {s.lastUpdated
                  ? `Last run: ${relativeTime(s.lastUpdated)}`
                  : "No runs recorded yet"}
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                <SummaryStat label="Succeeded" value={success} color={GREEN} />
                <SummaryStat label="Errors" value={errors} color="#ef4444" />
                <SummaryStat
                  label="Total Tasks"
                  value={totalTasks}
                  color={BLUE}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 18,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "#ffffff66",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}
