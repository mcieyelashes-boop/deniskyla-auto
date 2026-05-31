import { useState, useRef, useEffect } from "react";
import { callClaude } from "../lib/claude";
import { AGENTS } from "../config/agents";

// ─── CEO SYSTEM PROMPT ────────────────────────────────────────────────────────

const CEO_SYSTEM_PROMPT = `You are the CEO Agent orchestrating a marketing automation system.
You have ${AGENTS.length} sub-agents: ${AGENTS.map((a) => `${a.name} (${a.id})`).join(", ")}.

You are in a multi-turn conversation with the user. Use the prior conversation context to refine the plan. Be conversational and brief in the "reply" field (1-2 sentences, Bahasa Indonesia is welcome).

Always respond in JSON only, no markdown fences:
{
  "reply": "short conversational reply to the user",
  "plan": "brief plan description",
  "agents": [
    {"id": "agentId", "task": "specific task for this agent"}
  ]
}

Only include agents relevant to the command. Max 4 agents. If the user is just chatting and no action is needed yet, return an empty agents array.`;

const QUICK_COMMANDS = [
  "Launch new product campaign",
  "Find 500 leads in e-commerce niche",
  "Create 30 days of social content",
  "Run full growth sprint",
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

function parseCEOResponse(raw, fallbackInput) {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const jsonStr = cleaned.slice(
      cleaned.indexOf("{"),
      cleaned.lastIndexOf("}") + 1
    );
    const parsed = JSON.parse(jsonStr);
    const agents = (Array.isArray(parsed.agents) ? parsed.agents : [])
      .filter((x) => x && AGENTS.some((s) => s.id === x.id))
      .slice(0, 4);
    return {
      reply: parsed.reply || parsed.plan || "Plan siap.",
      plan: parsed.plan || fallbackInput,
      agents,
    };
  } catch {
    // Fallback: pick 3 random agents so the UI still works
    const fallbackIds = AGENTS.map((a) => a.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return {
      reply: `Saya akan menjalankan ${fallbackIds.length} agent untuk: ${fallbackInput}`,
      plan: fallbackInput,
      agents: fallbackIds.map((id) => ({ id, task: fallbackInput })),
    };
  }
}

function simulateCEOResponse(userInput) {
  const shuffled = [...AGENTS].sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    reply: `(Simulasi) Saya menyiapkan ${shuffled.length} agent untuk: ${userInput}`,
    plan: `(Simulasi) Menjalankan ${shuffled.length} agent untuk: ${userInput}`,
    agents: shuffled.map((s) => ({ id: s.id, task: s.defaultTask })),
  };
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────

function MessageBubble({ message, onExecute, orchestrating }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: "fadeSlideIn 0.25s ease",
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          background: isUser ? "#F0C04022" : "#ffffff08",
          border: `1px solid ${isUser ? "#F0C04044" : "#ffffff0f"}`,
          borderRadius: 12,
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              color: isUser ? "#F0C040" : "#F0C040cc",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
            }}
          >
            {isUser ? "you" : "◈ CEO"}
          </span>
        </div>
        <div
          style={{
            color: isUser ? "#ffffffee" : "#ffffffcc",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>

        {/* Execute Plan button — only on CEO bubbles holding a pending plan */}
        {!isUser && message.pending && (
          <button
            onClick={() => onExecute(message.pending)}
            disabled={orchestrating}
            style={{
              marginTop: 8,
              width: "100%",
              background: orchestrating
                ? "#F0C04033"
                : "linear-gradient(135deg, #F0C040, #F59E0B)",
              border: "none",
              borderRadius: 9,
              padding: "8px 12px",
              color: orchestrating ? "#ffffff66" : "#000",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 11,
              cursor: orchestrating ? "not-allowed" : "pointer",
              letterSpacing: 0.4,
              textAlign: "left",
            }}
          >
            ▶ Execute Plan — {message.pending.plan}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CEO CHAT ─────────────────────────────────────────────────────────────────

export default function CEOChat({
  onOrchestrate,
  orchestrating,
  ceoLogs,
  hasApiKey,
}) {
  const [messages, setMessages] = useState([
    {
      role: "ceo",
      content:
        "Selamat datang! Saya CEO Agent. Ketik perintah atau pilih quick action di bawah.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null); // { plan, flow } waiting for user to execute
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new message / thinking change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const addMessage = (msg) =>
    setMessages((prev) => [...prev, { timestamp: Date.now(), ...msg }]);

  const sendMessage = async (userInput) => {
    const text = (userInput || "").trim();
    if (!text || thinking || orchestrating) return;

    setInput("");
    // Add user message
    addMessage({ role: "user", content: text });
    setThinking(true);

    try {
      // Build context from history (last 4 turns) — and last 6 for API shape
      const historyContext = messages
        .slice(-4)
        .map((m) => `${m.role === "user" ? "User" : "CEO"}: ${m.content}`)
        .join("\n");

      // Interleaved messages kept available for future structured API use
      // eslint-disable-next-line no-unused-vars
      const contextMessages = messages.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const fullPrompt = historyContext
        ? `Previous conversation:\n${historyContext}\n\nUser: ${text}`
        : text;

      let result;
      if (hasApiKey) {
        const raw = await callClaude(CEO_SYSTEM_PROMPT, fullPrompt);
        result = parseCEOResponse(raw, text);
      } else {
        result = simulateCEOResponse(text);
      }

      // Build flow from chosen agents (if any)
      let pending = null;
      if (result.agents.length > 0) {
        const flow = {
          id: "ceo-" + Date.now(),
          name: "◈ CEO Command",
          desc: text.slice(0, 48),
          plan: result.plan,
          chain: result.agents.map((a) => a.id),
          tasks: result.agents.reduce((acc, a) => {
            acc[a.id] = a.task;
            return acc;
          }, {}),
        };
        pending = { plan: result.plan, flow };
        setPendingPlan(pending);
      }

      addMessage({
        role: "ceo",
        content: result.reply,
        pending,
      });
    } catch (err) {
      addMessage({
        role: "ceo",
        content: `✗ ERROR: ${err.message}`,
      });
    } finally {
      setThinking(false);
    }
  };

  const handleExecute = (pending) => {
    if (!pending?.flow || orchestrating) return;
    setPendingPlan(null);
    onOrchestrate(pending.flow);
  };

  const isEmpty = messages.length <= 1;
  const busy = thinking || orchestrating;

  return (
    <div style={{ marginTop: 18 }}>
      {/* Chat messages area */}
      <div
        style={{
          maxHeight: 200,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 14px",
          background: "#ffffff05",
          border: "1px solid #F0C04022",
          borderRadius: 12,
          marginBottom: 10,
        }}
      >
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            onExecute={handleExecute}
            orchestrating={orchestrating}
          />
        ))}

        {thinking && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                background: "#ffffff08",
                border: "1px solid #ffffff0f",
                borderRadius: 12,
                padding: "8px 12px",
                color: "#F0C040",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
              }}
            >
              ◈ CEO sedang berpikir…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested quick commands — only when chat is empty */}
      {isEmpty && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginBottom: 10,
          }}
        >
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => setInput(cmd)}
              disabled={busy}
              style={{
                background: "#F0C04012",
                border: "1px solid #F0C04033",
                borderRadius: 20,
                padding: "6px 12px",
                color: "#F0C040cc",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            flex: 1,
            background: "#ffffff08",
            border: "1px solid #F0C04033",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#F0C04066" }}>◈</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) sendMessage(input);
            }}
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
          onClick={() => sendMessage(input)}
          disabled={busy}
          style={{
            background: busy
              ? "#F0C04055"
              : "linear-gradient(135deg, #F0C040, #F59E0B)",
            border: "none",
            borderRadius: 12,
            padding: "10px 22px",
            color: "#000",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
            letterSpacing: 0.5,
          }}
        >
          {thinking ? "THINKING…" : "SEND"}
        </button>
      </div>

      {/* CEO Log feed (orchestration progress) */}
      {Array.isArray(ceoLogs) && ceoLogs.length > 0 && (
        <div
          style={{
            marginTop: 10,
            maxHeight: 72,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[...ceoLogs].reverse().map((log, i) => (
            <div
              key={i}
              style={{
                color: i === 0 ? "#F0C040" : "#ffffff44",
                fontSize: 10,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {i === 0 ? "◈ " : "  "}
              {log.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { CEO_SYSTEM_PROMPT, QUICK_COMMANDS };
