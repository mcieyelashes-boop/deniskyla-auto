import { useState, useRef, useEffect, useMemo } from "react";
import { callClaude } from "../lib/claude";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const KEYFRAMES = `
@keyframes resultsChatSlideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
@keyframes resultsChatBubbleIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const SUGGESTED_QUESTIONS = [
  "What are the key findings?",
  "What should I do next?",
  "What's the biggest opportunity?",
  "Summarize in 3 bullets",
];

export default function ResultsChat({ results = [], flowName, onClose }) {
  const systemPrompt = useMemo(
    () => `You are an AI assistant analyzing the results of a marketing automation flow called "${flowName}".

Here are the agent outputs:
${results
  .map((r) => `## ${r.agentName}\nTask: ${r.task}\nOutput:\n${r.output}`)
  .join("\n\n")}

Answer questions about these results. Be specific and reference the actual data. Keep answers concise (2-4 sentences).`,
    [results, flowName]
  );

  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: `Hi! I've analyzed the results from **${flowName}**. Ask me anything about the findings, next steps, or insights.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const isInitial = messages.length <= 1;

  const sendMessage = async (text) => {
    const userMsg = (text || "").trim();
    if (!userMsg || thinking) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setThinking(true);

    try {
      const reply = await callClaude(systemPrompt, userMsg);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: (reply || "").trim() || "(no response)" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `✗ Error: ${err.message}` },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: 380,
        maxWidth: "100vw",
        background: "#0a0a14",
        borderLeft: "1px solid #ffffff15",
        zIndex: 160,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        animation: "resultsChatSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── HEADER ── */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #ffffff0d",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "#F0C04022",
              border: "1px solid #F0C04044",
              color: "#F0C040",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ◎
          </div>
          <div
            style={{
              fontFamily: FONT_HEAD,
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            CHAT WITH RESULTS
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
            fontSize: 19,
            cursor: "pointer",
            lineHeight: 1,
            fontFamily: FONT_BODY,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* ── CONTEXT DISPLAY ── */}
      <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
        <button
          onClick={() => setContextOpen((o) => !o)}
          style={{
            width: "100%",
            textAlign: "left",
            background: "#ffffff05",
            border: "1px solid #ffffff10",
            borderRadius: 10,
            padding: "9px 12px",
            color: "#ffffff77",
            fontFamily: FONT_MONO,
            fontSize: 11,
            cursor: "pointer",
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: "#F0C040aa" }}>{contextOpen ? "▾" : "▸"}</span>{" "}
          Based on: {flowName} · {results.length} agent output
          {results.length === 1 ? "" : "s"}
        </button>

        {contextOpen && (
          <div
            style={{
              marginTop: 8,
              maxHeight: 160,
              overflowY: "auto",
              background: "#07070f",
              border: "1px solid #ffffff0d",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {results.map((r, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    color: r.agentColor || "#F0C040",
                    fontSize: 10,
                    letterSpacing: 0.5,
                    marginBottom: 3,
                  }}
                >
                  {r.agentIcon || "◎"} {r.agentName}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    color: "#ffffff66",
                    fontSize: 11,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {(r.output || "").slice(0, 240)}
                  {(r.output || "").length > 240 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CHAT AREA ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                animation: "resultsChatBubbleIn 0.22s ease",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  background: isUser ? "#F0C04022" : "#ffffff08",
                  border: `1px solid ${isUser ? "#F0C04044" : "#ffffff0f"}`,
                  borderRadius: 12,
                  padding: "9px 13px",
                  color: isUser ? "#ffffffee" : "#ffffffcc",
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {thinking && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                background: "#ffffff08",
                border: "1px solid #ffffff0f",
                borderRadius: 12,
                padding: "9px 13px",
                color: "#F0C040",
                fontFamily: FONT_MONO,
                fontSize: 11,
              }}
            >
              ◎ Analyzing…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── SUGGESTED QUESTIONS ── */}
      {isInitial && !thinking && (
        <div
          style={{
            padding: "0 20px 12px",
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            flexShrink: 0,
          }}
        >
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              style={{
                background: "#F0C04012",
                border: "1px solid #F0C04033",
                borderRadius: 20,
                padding: "6px 12px",
                color: "#F0C040cc",
                fontFamily: FONT_MONO,
                fontSize: 10,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT ROW ── */}
      <div
        style={{
          padding: "12px 20px 20px",
          borderTop: "1px solid #ffffff0d",
          flexShrink: 0,
          display: "flex",
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#ffffff08",
            border: "1px solid #F0C04033",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !thinking) sendMessage(input);
            }}
            placeholder="Ask about the results…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffffdd",
              fontFamily: FONT_BODY,
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={() => sendMessage(input)}
          disabled={thinking}
          style={{
            background: thinking
              ? "#F0C04055"
              : "linear-gradient(135deg, #F0C040, #F59E0B)",
            border: "none",
            borderRadius: 12,
            padding: "10px 18px",
            color: "#000",
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: 13,
            cursor: thinking ? "not-allowed" : "pointer",
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {thinking ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
