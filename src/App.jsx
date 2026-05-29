import { useState, useEffect, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const CEO_AGENT = {
  id: "ceo",
  name: "CEO Agent",
  role: "Orchestrator",
  status: "active",
  desc: "Mengatur, mendelegasikan, dan mensinkronisasi semua sub-agent",
  color: "#F0C040",
  icon: "◈",
};

const SUB_AGENTS = [
  {
    id: "webdev",
    name: "Website Dev",
    icon: "⌥",
    color: "#38BDF8",
    status: "idle",
    task: "Landing page audit",
    progress: 0,
    desc: "Build, deploy & maintain web assets",
    logs: ["Standby — menunggu perintah CEO"],
  },
  {
    id: "market",
    name: "Market Research",
    icon: "◎",
    color: "#A78BFA",
    status: "idle",
    task: "Competitor analysis",
    progress: 0,
    desc: "Analisis pasar, tren, kompetitor",
    logs: ["Standby — menunggu perintah CEO"],
  },
  {
    id: "leadgen",
    name: "Lead Gen",
    icon: "⊕",
    color: "#34D399",
    status: "idle",
    task: "Scrape 500 leads",
    progress: 0,
    desc: "Temukan & kualifikasi prospek baru",
    logs: ["Standby — menunggu perintah CEO"],
  },
  {
    id: "email",
    name: "Email Campaign",
    icon: "✉",
    color: "#FB923C",
    status: "idle",
    task: "Newsletter Q2 draft",
    progress: 0,
    desc: "Tulis & kirim campaign email",
    logs: ["Standby — menunggu perintah CEO"],
  },
  {
    id: "social",
    name: "Social Media",
    icon: "⬡",
    color: "#F472B6",
    status: "idle",
    task: "IG + TikTok schedule",
    progress: 0,
    desc: "Kelola semua platform sosial",
    logs: ["Standby — menunggu perintah CEO"],
  },
  {
    id: "content",
    name: "Content Creation",
    icon: "✦",
    color: "#FBBF24",
    status: "idle",
    task: "UGC script batch",
    progress: 0,
    desc: "Buat konten: script, copy, visual brief",
    logs: ["Standby — menunggu perintah CEO"],
  },
  {
    id: "scheduler",
    name: "Content Scheduler",
    icon: "⏱",
    color: "#6EE7B7",
    status: "idle",
    task: "Queue 30 posts",
    progress: 0,
    desc: "Jadwalkan & distribusi konten",
    logs: ["Standby — menunggu perintah CEO"],
  },
];

const ORCHESTRA_FLOWS = [
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

// ─── UTILS ───────────────────────────────────────────────────────────────────

function statusColor(s) {
  if (s === "active" || s === "running") return "#34D399";
  if (s === "done") return "#38BDF8";
  if (s === "queued") return "#FBBF24";
  return "#ffffff33";
}

function statusLabel(s) {
  if (s === "running") return "RUNNING";
  if (s === "done") return "DONE";
  if (s === "queued") return "QUEUED";
  return "IDLE";
}

// ─── SUB-AGENT CARD ──────────────────────────────────────────────────────────

function AgentCard({ agent, isSelected, onClick, pulse }) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || isSelected;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? `${agent.color}12` : "rgba(12,12,22,0.7)",
        border: `1px solid ${active ? agent.color + "88" : "#ffffff0f"}`,
        borderRadius: 14,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: active ? `0 0 20px ${agent.color}22` : "none",
        backdropFilter: "blur(10px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Pulse ring when running */}
      {pulse && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          border: `2px solid ${agent.color}`,
          animation: "pulseRing 1.5s ease-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${agent.color}18`,
            border: `1.5px solid ${agent.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: agent.color, fontSize: 18, fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
          }}>
            {agent.icon}
          </div>
          <div>
            <div style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
              {agent.name}
            </div>
            <div style={{ color: agent.color + "99", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
              {agent.desc}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(agent.status), boxShadow: agent.status === "running" ? `0 0 8px ${statusColor(agent.status)}` : "none" }} />
          <span style={{ color: statusColor(agent.status), fontSize: 9, fontFamily: "'DM Mono', monospace" }}>
            {statusLabel(agent.status)}
          </span>
        </div>
      </div>

      {/* Current task */}
      <div style={{
        background: "#ffffff06",
        borderRadius: 8,
        padding: "7px 10px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span style={{ color: agent.color + "88", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>TASK:</span>
        <span style={{ color: "#ffffffbb", fontSize: 11, fontFamily: "'DM Sans', sans-serif", flex: 1 }}>{agent.task}</span>
      </div>

      {/* Progress bar */}
      {agent.progress > 0 && (
        <div style={{ height: 3, background: "#ffffff0f", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${agent.progress}%`,
            background: `linear-gradient(90deg, ${agent.color}88, ${agent.color})`,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }} />
        </div>
      )}

      {/* Latest log */}
      <div style={{ marginTop: 8, color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        › {agent.logs[agent.logs.length - 1]}
      </div>
    </div>
  );
}

// ─── CEO PANEL ───────────────────────────────────────────────────────────────

function CEOPanel({ agents, onOrchestrate, orchestrating, activeFlow }) {
  const totalActive = agents.filter(a => a.status === "running").length;
  const totalDone = agents.filter(a => a.status === "done").length;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(240,192,64,0.08) 0%, rgba(240,192,64,0.03) 100%)",
      border: "1px solid #F0C04044",
      borderRadius: 18,
      padding: "22px 26px",
      marginBottom: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "#F0C04008", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        {/* CEO Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #F0C04022, #F0C04044)",
            border: "2px solid #F0C04066",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, color: "#F0C040",
            fontFamily: "'Syne', sans-serif",
            boxShadow: "0 0 24px #F0C04033",
          }}>
            {CEO_AGENT.icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>
                {CEO_AGENT.name}
              </span>
              <div style={{ padding: "2px 10px", borderRadius: 20, background: "#F0C04022", border: "1px solid #F0C04044", color: "#F0C040", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                ORCHESTRATOR
              </div>
            </div>
            <div style={{ color: "#ffffff77", fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginTop: 3 }}>
              {CEO_AGENT.desc}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "AGENTS", val: agents.length, color: "#ffffff" },
            { label: "RUNNING", val: totalActive, color: "#34D399" },
            { label: "DONE", val: totalDone, color: "#38BDF8" },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: "center",
              background: "#ffffff06",
              border: "1px solid #ffffff0f",
              borderRadius: 12,
              padding: "10px 16px",
              minWidth: 64,
            }}>
              <div style={{ color: s.color, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22 }}>{s.val}</div>
              <div style={{ color: "#ffffff44", fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CEO Chat / Command input */}
      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <div style={{
          flex: 1,
          background: "#ffffff08",
          border: "1px solid #F0C04033",
          borderRadius: 12,
          padding: "10px 14px",
          color: "#ffffff55",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color: "#F0C04066" }}>◈</span>
          <span>Ketik perintah ke CEO Agent... (e.g. "Launch campaign produk baru")</span>
        </div>
        <button style={{
          background: "linear-gradient(135deg, #F0C040, #F59E0B)",
          border: "none",
          borderRadius: 12,
          padding: "10px 20px",
          color: "#000",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
          letterSpacing: 0.5,
        }}>
          EXECUTE
        </button>
      </div>

      {/* Orchestra Flows */}
      <div style={{ marginTop: 16 }}>
        <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1.5, marginBottom: 10 }}>
          ORCHESTRATION PRESETS
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ORCHESTRA_FLOWS.map(flow => (
            <button
              key={flow.id}
              onClick={() => onOrchestrate(flow)}
              disabled={orchestrating}
              style={{
                background: activeFlow?.id === flow.id ? "#F0C04022" : "#ffffff08",
                border: `1px solid ${activeFlow?.id === flow.id ? "#F0C04066" : "#ffffff15"}`,
                borderRadius: 10,
                padding: "8px 14px",
                cursor: orchestrating ? "not-allowed" : "pointer",
                opacity: orchestrating && activeFlow?.id !== flow.id ? 0.4 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12 }}>{flow.name}</div>
              <div style={{ color: "#ffffff55", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{flow.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AGENT DETAIL PANEL ──────────────────────────────────────────────────────

function AgentDetailPanel({ agent, onClose }) {
  if (!agent) return null;
  return (
    <div style={{
      position: "fixed",
      right: 24,
      top: "50%",
      transform: "translateY(-50%)",
      width: 320,
      background: "rgba(10,10,20,0.97)",
      border: `1px solid ${agent.color}44`,
      borderRadius: 18,
      padding: 22,
      boxShadow: `0 0 40px ${agent.color}22, 0 24px 60px rgba(0,0,0,0.6)`,
      backdropFilter: "blur(20px)",
      zIndex: 100,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${agent.color}22`, border: `1px solid ${agent.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: agent.color, fontSize: 18 }}>
            {agent.icon}
          </div>
          <div>
            <div style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>{agent.name}</div>
            <div style={{ color: agent.color + "88", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>SUB-AGENT</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#ffffff66", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", background: "#ffffff06", borderRadius: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(agent.status), boxShadow: `0 0 8px ${statusColor(agent.status)}` }} />
        <span style={{ color: statusColor(agent.status), fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{statusLabel(agent.status)}</span>
        {agent.progress > 0 && <span style={{ marginLeft: "auto", color: agent.color, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{agent.progress}%</span>}
      </div>

      {/* Progress bar */}
      {agent.progress > 0 && (
        <div style={{ height: 4, background: "#ffffff0f", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: "100%", width: `${agent.progress}%`, background: `linear-gradient(90deg, ${agent.color}88, ${agent.color})`, borderRadius: 2, transition: "width 0.4s" }} />
        </div>
      )}

      {/* Log feed */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>ACTIVITY LOG</div>
        <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
          {[...agent.logs].reverse().map((log, i) => (
            <div key={i} style={{
              background: i === 0 ? `${agent.color}0f` : "#ffffff05",
              border: `1px solid ${i === 0 ? agent.color + "33" : "#ffffff0a"}`,
              borderRadius: 8,
              padding: "6px 10px",
              color: i === 0 ? "#ffffffcc" : "#ffffff55",
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
            }}>
              {i === 0 && <span style={{ color: agent.color, marginRight: 6 }}>›</span>}
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div>
        <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>CAPABILITIES</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {getCapabilities(agent.id).map(cap => (
            <div key={cap} style={{ padding: "3px 9px", borderRadius: 20, background: `${agent.color}12`, border: `1px solid ${agent.color}33`, color: agent.color + "cc", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
              {cap}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCapabilities(id) {
  const map = {
    webdev: ["HTML/CSS", "React", "Deploy", "SEO audit", "Performance"],
    market: ["Competitor scan", "Trend analysis", "SWOT", "Pricing research"],
    leadgen: ["Scraping", "Qualify leads", "CRM sync", "Email verify"],
    email: ["Draft copy", "A/B test", "Send schedule", "Analytics"],
    social: ["Post draft", "Hashtag research", "Engagement", "DM auto"],
    content: ["UGC script", "Caption", "Video brief", "Blog post"],
    scheduler: ["Queue posts", "Platform sync", "Calendar view", "Auto-post"],
  };
  return map[id] || [];
}

// ─── ORCHESTRATION CONNECTION LINES ─────────────────────────────────────────

function ConnectionLines({ activeChain, agents }) {
  if (!activeChain || activeChain.length === 0) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
    }}>
      {/* Simple visual indicator — real SVG lines would need DOM refs */}
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function AgenticDashboard() {
  const [agents, setAgents] = useState(SUB_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [orchestrating, setOrchestrating] = useState(false);
  const [activeFlow, setActiveFlow] = useState(null);
  const [activeChainStep, setActiveChainStep] = useState(-1);
  const timerRef = useRef(null);

  const LOG_MESSAGES = {
    webdev: [
      "Scanning sitemap...", "Checking page speed...", "Analyzing CLS/LCP metrics...",
      "Generating improvement report...", "Landing page audit selesai ✓"
    ],
    market: [
      "Pulling competitor data...", "Scanning Google Trends...", "Analyzing pricing gaps...",
      "Building SWOT matrix...", "Market research selesai ✓"
    ],
    leadgen: [
      "Scraping target URLs...", "Validating email addresses...", "Scoring lead quality...",
      "Syncing ke CRM...", "500 leads berhasil dikualifikasi ✓"
    ],
    email: [
      "Drafting email copy...", "A/B variant dibuat...", "Optimizing subject lines...",
      "Scheduling send time...", "Campaign email siap dikirim ✓"
    ],
    social: [
      "Researching trending hashtags...", "Drafting post captions...", "Creating posting schedule...",
      "Syncing ke semua platform...", "Social media plan siap ✓"
    ],
    content: [
      "Analyzing top-performing content...", "Writing UGC scripts...", "Creating visual briefs...",
      "Batch konten finalized...", "Content creation selesai ✓"
    ],
    scheduler: [
      "Loading content queue...", "Optimizing post timing...", "Assigning platforms...",
      "Calendar updated...", "30 posts terjadwal ✓"
    ],
  };

  const runOrchestration = (flow) => {
    if (orchestrating) return;
    setActiveFlow(flow);
    setOrchestrating(true);

    // Reset all agents
    setAgents(prev => prev.map(a => ({
      ...a,
      status: flow.chain.includes(a.id) ? "queued" : "idle",
      progress: 0,
      logs: flow.chain.includes(a.id) ? ["Queued — menunggu giliran..."] : ["Standby"],
    })));

    let stepIndex = 0;

    const runStep = () => {
      if (stepIndex >= flow.chain.length) {
        // All done
        setOrchestrating(false);
        setActiveChainStep(-1);
        setActiveFlow(prev => ({ ...prev, done: true }));
        return;
      }

      const agentId = flow.chain[stepIndex];
      setActiveChainStep(stepIndex);

      // Mark as running
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: "running", progress: 0, logs: [...a.logs, "▶ Mulai bekerja..."] } : a
      ));

      const msgs = LOG_MESSAGES[agentId] || ["Processing...", "Done ✓"];
      let msgIndex = 0;

      const progressInterval = setInterval(() => {
        const progressStep = Math.floor(100 / msgs.length);
        const currentProgress = Math.min((msgIndex + 1) * progressStep, 100);

        setAgents(prev => prev.map(a =>
          a.id === agentId
            ? {
                ...a,
                progress: currentProgress,
                logs: msgIndex < msgs.length ? [...a.logs, msgs[msgIndex]] : a.logs,
              }
            : a
        ));

        msgIndex++;

        if (msgIndex >= msgs.length) {
          clearInterval(progressInterval);
          // Mark done
          setAgents(prev => prev.map(a =>
            a.id === agentId ? { ...a, status: "done", progress: 100 } : a
          ));
          stepIndex++;
          setTimeout(runStep, 600);
        }
      }, 500);

      timerRef.current = progressInterval;
    };

    setTimeout(runStep, 400);
  };

  const resetAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAgents(SUB_AGENTS);
    setOrchestrating(false);
    setActiveFlow(null);
    setActiveChainStep(-1);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07070f",
      backgroundImage:
        "radial-gradient(ellipse at 10% 10%, #F0C04008 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, #38BDF808 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #A78BFA05 0%, transparent 70%)",
      padding: "24px 28px",
      fontFamily: "'DM Sans', sans-serif",
      position: "relative",
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');
        
        @keyframes pulseRing {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff22; border-radius: 2px; }
      `}</style>

      {/* ── TOP HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 10px #34D399" }} />
            <span style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>AGENTIC OS</span>
          </div>
          <div style={{ width: 1, height: 16, background: "#ffffff15" }} />
          <h1 style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>
            Denis's Command Center
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(orchestrating || activeFlow) && (
            <button onClick={resetAll} style={{
              background: "#ef444418",
              border: "1px solid #ef444433",
              color: "#ef4444",
              padding: "7px 14px",
              borderRadius: 9,
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
            }}>
              ⊘ RESET
            </button>
          )}
          <div style={{
            padding: "6px 14px",
            background: orchestrating ? "#F0C04018" : "#ffffff08",
            border: `1px solid ${orchestrating ? "#F0C04044" : "#ffffff15"}`,
            borderRadius: 10,
            color: orchestrating ? "#F0C040" : "#ffffff66",
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
          }}>
            {orchestrating ? `⟳ ORCHESTRATING: ${activeFlow?.name}` : activeFlow?.done ? `✓ ${activeFlow?.name} COMPLETE` : "◎ STANDBY"}
          </div>
        </div>
      </div>

      {/* ── CEO LAYER ── */}
      <CEOPanel
        agents={agents}
        onOrchestrate={runOrchestration}
        orchestrating={orchestrating}
        activeFlow={activeFlow}
      />

      {/* ── CONNECTION INDICATOR ── */}
      {activeFlow && (
        <div style={{
          marginBottom: 16,
          padding: "10px 16px",
          background: "#F0C04008",
          border: "1px solid #F0C04022",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}>
          <span style={{ color: "#F0C04088", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>FLOW:</span>
          {activeFlow.chain.map((agentId, i) => {
            const a = agents.find(x => x.id === agentId);
            const meta = SUB_AGENTS.find(x => x.id === agentId);
            const isDone = a?.status === "done";
            const isRunning = a?.status === "running";
            return (
              <span key={agentId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: isDone ? `${meta.color}22` : isRunning ? `${meta.color}18` : "#ffffff08",
                  border: `1px solid ${isDone ? meta.color + "66" : isRunning ? meta.color + "44" : "#ffffff15"}`,
                  color: isDone ? meta.color : isRunning ? meta.color + "cc" : "#ffffff44",
                  fontSize: 11,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {isDone ? "✓ " : isRunning ? "▶ " : ""}{meta?.name}
                </span>
                {i < activeFlow.chain.length - 1 && (
                  <span style={{ color: "#ffffff22", fontSize: 12 }}>→</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* ── SUB-AGENTS GRID ── */}
      <div>
        <div style={{ color: "#ffffff33", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 14 }}>
          SUB-AGENTS — {agents.length} TOTAL
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              pulse={agent.status === "running"}
            />
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.35 }}>
        <div style={{ color: "#fff", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
          AGENTIC DASHBOARD v0.1 — POWERED BY CLAUDE API
        </div>
        <div style={{ color: "#fff", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
          {agents.filter(a => a.status === "done").length}/{agents.length} TASKS COMPLETE
        </div>
      </div>

      {/* ── SELECTED AGENT DETAIL PANEL ── */}
      {selectedAgent && (
        <AgentDetailPanel
          agent={agents.find(a => a.id === selectedAgent.id)}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
