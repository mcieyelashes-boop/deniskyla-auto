import { useState, useEffect, useRef } from "react";
import { callClaude } from "./lib/claude";

const HAS_API_KEY = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

const AGENT_SYSTEM_PROMPTS = {
  webdev: "You are a website developer agent. Audit the given task and return 4-5 actionable bullet points with findings and recommendations. Be specific and technical.",
  market: "You are a market research agent. Analyze the given task and return 4-5 bullet points with market insights, trends, and competitor findings.",
  leadgen: "You are a lead generation agent. For the given task, return 4-5 bullet points describing lead sources found, qualification criteria, and estimated numbers.",
  email: "You are an email campaign agent. For the given task, return 4-5 bullet points with email strategy, subject line ideas, and send schedule.",
  social: "You are a social media agent. For the given task, return 4-5 bullet points with platform strategy, content ideas, and posting schedule.",
  content: "You are a content creation agent. For the given task, return 4-5 bullet points with content formats, key messages, and production plan.",
  scheduler: "You are a content scheduler agent. For the given task, return 4-5 bullet points with scheduling strategy, optimal times, and platform assignments.",
};

const CEO_SYSTEM_PROMPT = `You are the CEO Agent orchestrating a marketing automation system.
You have 7 sub-agents: Website Dev (webdev), Market Research (market), Lead Gen (leadgen), Email Campaign (email), Social Media (social), Content Creation (content), Content Scheduler (scheduler).

Given the user's command, respond in JSON only:
{
  "plan": "brief plan description",
  "agents": [
    {"id": "agentId", "task": "specific task for this agent"}
  ]
}

Only include agents relevant to the command. Max 4 agents.`;

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
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(agent.status), boxShadow: agent.status === "running" ? `0 0 8px ${statusColor(agent.status)}` : "none", animation: agent.status === "running" ? "statusGlow 2s ease infinite" : "none" }} />
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

function CEOPanel({ agents, onOrchestrate, orchestrating, activeFlow, ceoInput, setCeoInput, ceoThinking, onCEOCommand, ceoLogs }) {
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
        <div className="ceo-stats" style={{ display: "flex", gap: 12 }}>
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
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color: "#F0C04066" }}>◈</span>
          <input
            value={ceoInput}
            onChange={(e) => setCeoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !ceoThinking) onCEOCommand(ceoInput); }}
            placeholder='Ketik perintah ke CEO Agent... (e.g. "Launch campaign produk baru")'
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffffdd",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={() => onCEOCommand(ceoInput)}
          disabled={ceoThinking}
          style={{
            background: ceoThinking ? "#F0C04055" : "linear-gradient(135deg, #F0C040, #F59E0B)",
            border: "none",
            borderRadius: 12,
            padding: "10px 20px",
            color: "#000",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: ceoThinking ? "not-allowed" : "pointer",
            letterSpacing: 0.5,
          }}>
          {ceoThinking ? "THINKING…" : "EXECUTE"}
        </button>
      </div>

      {/* CEO Log feed */}
      {ceoLogs.length > 0 && (
        <div style={{ marginTop: 10, maxHeight: 72, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...ceoLogs].reverse().map((log, i) => (
            <div key={i} style={{ color: i === 0 ? '#F0C040' : '#ffffff44', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
              {i === 0 ? '◈ ' : '  '}{log.text}
            </div>
          ))}
        </div>
      )}

      {/* Orchestra Flows */}
      <div style={{ marginTop: 16 }}>
        <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1.5, marginBottom: 10 }}>
          ORCHESTRATION PRESETS
        </div>
        <div className="flow-buttons" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
    <div className="detail-panel" style={{
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
      animation: "slideInRight 0.25s ease",
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

// ─── CUSTOM FLOW BUILDER ─────────────────────────────────────────────────────

function FlowBuilder({ customFlow, setCustomFlow, onRun, onClose }) {
  const allAgentIds = ["webdev", "market", "leadgen", "email", "social", "content", "scheduler"];

  const toggleAgent = (id) => {
    setCustomFlow(prev => ({
      ...prev,
      chain: prev.chain.includes(id)
        ? prev.chain.filter(x => x !== id)
        : [...prev.chain, id],
    }));
  };

  const moveUp = (i) => {
    if (i === 0) return;
    setCustomFlow(prev => {
      const chain = [...prev.chain];
      [chain[i - 1], chain[i]] = [chain[i], chain[i - 1]];
      return { ...prev, chain };
    });
  };

  const moveDown = (i) => {
    setCustomFlow(prev => {
      const chain = [...prev.chain];
      if (i >= chain.length - 1) return prev;
      [chain[i], chain[i + 1]] = [chain[i + 1], chain[i]];
      return { ...prev, chain };
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)", zIndex: 200, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#0d0d1a", border: "1px solid #ffffff15",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
        maxHeight: "80vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        animation: "slideInBottom 0.25s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18 }}>
              Custom Flow Builder
            </div>
            <div style={{ color: "#ffffff55", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
              Pilih & urutkan agent untuk flow kamu
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#ffffff66", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {/* Flow name input */}
        <input
          value={customFlow.name}
          onChange={e => setCustomFlow(prev => ({ ...prev, name: e.target.value }))}
          style={{
            width: "100%", background: "#ffffff08", border: "1px solid #ffffff15",
            borderRadius: 10, padding: "10px 14px", color: "#fff",
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 18,
            outline: "none",
          }}
          placeholder="Flow name..."
        />

        {/* Agent toggles */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 10 }}>
            SELECT AGENTS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {allAgentIds.map(id => {
              const meta = SUB_AGENTS.find(a => a.id === id);
              const selected = customFlow.chain.includes(id);
              return (
                <button key={id} onClick={() => toggleAgent(id)} style={{
                  background: selected ? `${meta.color}18` : "#ffffff06",
                  border: `1px solid ${selected ? meta.color + "55" : "#ffffff10"}`,
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                  transition: "all 0.15s",
                }}>
                  <span style={{ color: meta.color, fontSize: 16 }}>{meta.icon}</span>
                  <span style={{ color: selected ? "#fff" : "#ffffff66", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: selected ? 600 : 400 }}>
                    {meta.name}
                  </span>
                  {selected && <span style={{ marginLeft: "auto", color: meta.color, fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Order editor — show only if agents selected */}
        {customFlow.chain.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#ffffff44", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 10 }}>
              EXECUTION ORDER
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {customFlow.chain.map((id, i) => {
                const meta = SUB_AGENTS.find(a => a.id === id);
                return (
                  <div key={id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#ffffff06", border: "1px solid #ffffff10",
                    borderRadius: 10, padding: "8px 12px",
                  }}>
                    <span style={{ color: "#ffffff33", fontFamily: "'DM Mono', monospace", fontSize: 11, minWidth: 20 }}>{i + 1}</span>
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                    <span style={{ color: "#ffffffcc", fontFamily: "'DM Sans', sans-serif", fontSize: 12, flex: 1 }}>{meta.name}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => moveUp(i)} style={{ background: "#ffffff0a", border: "none", borderRadius: 6, color: "#ffffff66", cursor: "pointer", padding: "3px 7px", fontSize: 11 }}>↑</button>
                      <button onClick={() => moveDown(i)} style={{ background: "#ffffff0a", border: "none", borderRadius: 6, color: "#ffffff66", cursor: "pointer", padding: "3px 7px", fontSize: 11 }}>↓</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={() => { onRun({ id: "custom", ...customFlow }); onClose(); }}
          disabled={customFlow.chain.length === 0}
          style={{
            width: "100%", background: customFlow.chain.length > 0 ? "linear-gradient(135deg, #F0C040, #F59E0B)" : "#ffffff10",
            border: "none", borderRadius: 12, padding: "13px",
            color: customFlow.chain.length > 0 ? "#000" : "#ffffff33",
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14,
            cursor: customFlow.chain.length > 0 ? "pointer" : "not-allowed",
            letterSpacing: 0.5,
          }}
        >
          ▶ RUN CUSTOM FLOW ({customFlow.chain.length} agents)
        </button>
      </div>
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
  const [ceoInput, setCeoInput] = useState("");
  const [ceoThinking, setCeoThinking] = useState(false);
  const [ceoLogs, setCeoLogs] = useState([]);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [customFlow, setCustomFlow] = useState({ name: "Custom Flow", chain: [] });
  const timerRef = useRef(null);
  const cancelRef = useRef(false);

  const addCeoLog = (text) =>
    setCeoLogs(prev => [...prev, { text, time: new Date().toLocaleTimeString() }]);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  // Simulation fallback for one agent step (interval-based, returns a promise)
  const runFakeStep = (agentId) => new Promise((resolve) => {
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
        resolve();
      }
    }, 500);

    timerRef.current = progressInterval;
  });

  // Real Claude-backed step — streams response lines as logs
  const runClaudeStep = async (agentId, task) => {
    const text = await callClaude(AGENT_SYSTEM_PROMPTS[agentId], task || "Lakukan tugas standar.");
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const total = lines.length || 1;
    for (let i = 0; i < lines.length; i++) {
      if (cancelRef.current) return;
      const progress = Math.min(Math.round(((i + 1) / total) * 100), 100);
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, progress, logs: [...a.logs, lines[i]] } : a
      ));
      await sleep(300);
    }
  };

  const runOrchestration = async (flow) => {
    if (orchestrating) return;
    cancelRef.current = false;
    setActiveFlow(flow);
    setOrchestrating(true);

    // Reset all agents
    setAgents(prev => prev.map(a => ({
      ...a,
      status: flow.chain.includes(a.id) ? "queued" : "idle",
      progress: 0,
      logs: flow.chain.includes(a.id) ? ["Queued — menunggu giliran..."] : ["Standby"],
    })));

    await sleep(400);

    for (let stepIndex = 0; stepIndex < flow.chain.length; stepIndex++) {
      if (cancelRef.current) break;
      const agentId = flow.chain[stepIndex];
      setActiveChainStep(stepIndex);

      // Mark as running and capture its current task
      let taskForAgent = "";
      setAgents(prev => prev.map(a => {
        if (a.id !== agentId) return a;
        taskForAgent = a.task;
        return { ...a, status: "running", progress: 0, logs: [...a.logs, "▶ Mulai bekerja..."] };
      }));

      try {
        if (HAS_API_KEY) {
          await runClaudeStep(agentId, taskForAgent);
        } else {
          await runFakeStep(agentId);
        }
        if (cancelRef.current) break;
        setAgents(prev => prev.map(a =>
          a.id === agentId ? { ...a, status: "done", progress: 100 } : a
        ));
      } catch (err) {
        setAgents(prev => prev.map(a =>
          a.id === agentId
            ? { ...a, status: "error", logs: [...a.logs, `✗ ERROR: ${err.message}`] }
            : a
        ));
        break; // stop the chain on error
      }

      await sleep(600);
    }

    setOrchestrating(false);
    setActiveChainStep(-1);
    if (!cancelRef.current) setActiveFlow(prev => prev ? { ...prev, done: true } : prev);
  };

  const handleCEOCommand = async (command) => {
    const cmd = (command || "").trim();
    if (!cmd || ceoThinking || orchestrating) return;

    setCeoThinking(true);
    setCeoInput("");
    addCeoLog(`Command: ${cmd}`);

    try {
      let plan, chosen;

      if (HAS_API_KEY) {
        const raw = await callClaude(CEO_SYSTEM_PROMPT, cmd);
        const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
        const parsed = JSON.parse(jsonStr);
        plan = parsed.plan;
        chosen = (parsed.agents || [])
          .filter(x => SUB_AGENTS.some(s => s.id === x.id))
          .slice(0, 4);
      } else {
        // Simulation fallback: pick random 3 agents
        const shuffled = [...SUB_AGENTS].sort(() => Math.random() - 0.5).slice(0, 3);
        plan = `(Simulasi) Menjalankan ${shuffled.length} agent untuk: ${cmd}`;
        chosen = shuffled.map(s => ({ id: s.id, task: s.task }));
      }

      if (!chosen.length) {
        addCeoLog("Tidak ada agent relevan ditemukan.");
        return;
      }

      addCeoLog(plan);

      // Apply CEO-assigned tasks to agents
      setAgents(prev => prev.map(a => {
        const match = chosen.find(c => c.id === a.id);
        return match ? { ...a, task: match.task } : a;
      }));

      const flow = {
        id: "ceo-" + Date.now(),
        name: "◈ CEO Command",
        desc: cmd.slice(0, 48),
        chain: chosen.map(c => c.id),
      };

      await sleep(50); // let task state settle
      runOrchestration(flow);
    } catch (err) {
      addCeoLog(`✗ ERROR: ${err.message}`);
    } finally {
      setCeoThinking(false);
    }
  };

  const resetAll = () => {
    cancelRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setAgents(SUB_AGENTS);
    setOrchestrating(false);
    setActiveFlow(null);
    setActiveChainStep(-1);
    setCeoLogs([]);
  };

  return (
    <div className="main-wrapper" style={{
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
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInBottom {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff22; border-radius: 2px; }

        @media (max-width: 768px) {
          .main-wrapper { padding: 16px 16px !important; }
          .ceo-stats { flex-direction: column !important; }
          .agents-grid { grid-template-columns: 1fr !important; }
          .detail-panel {
            position: fixed !important;
            right: 0 !important; left: 0 !important; bottom: 0 !important;
            top: auto !important;
            transform: none !important;
            width: 100% !important;
            border-radius: 18px 18px 0 0 !important;
            max-height: 70vh !important;
            overflow-y: auto !important;
          }
          .flow-buttons { flex-direction: column !important; }
          .top-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
      `}</style>

      {/* ── TOP HEADER ── */}
      <div className="top-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
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
          <button onClick={() => setShowFlowBuilder(true)} style={{
            background: "#ffffff08", border: "1px solid #ffffff15",
            color: "#ffffffcc", padding: "7px 14px", borderRadius: 9,
            cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11,
          }}>
            ⊞ CUSTOM FLOW
          </button>
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

      {/* ── API KEY WARNING ── */}
      {!import.meta.env.VITE_ANTHROPIC_API_KEY && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#ef444412', border: '1px solid #ef444433', borderRadius: 10, color: '#ef4444', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
          ⚠ VITE_ANTHROPIC_API_KEY not set — CEO Agent running in simulation mode
        </div>
      )}

      {/* ── CEO LAYER ── */}
      <CEOPanel
        agents={agents}
        onOrchestrate={runOrchestration}
        orchestrating={orchestrating}
        activeFlow={activeFlow}
        ceoInput={ceoInput}
        setCeoInput={setCeoInput}
        ceoThinking={ceoThinking}
        onCEOCommand={handleCEOCommand}
        ceoLogs={ceoLogs}
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
          animation: "fadeSlideIn 0.3s ease",
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
        <div className="agents-grid" style={{
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

      {/* ── CUSTOM FLOW BUILDER ── */}
      {showFlowBuilder && (
        <FlowBuilder
          customFlow={customFlow}
          setCustomFlow={setCustomFlow}
          onRun={runOrchestration}
          onClose={() => setShowFlowBuilder(false)}
        />
      )}
    </div>
  );
}
