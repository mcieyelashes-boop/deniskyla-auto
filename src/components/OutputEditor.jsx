import { useState, useMemo } from "react";
import { callClaude } from "../lib/claude";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";
const GOLD = "#F0C040";

// Control / system log lines that should never seed the editable output.
function isSystemLine(line) {
  if (!line) return true;
  const l = line.trim();
  if (!l) return true;
  return (
    l.startsWith("▶") ||
    l.startsWith("✗") ||
    l.startsWith("Queued") ||
    l.startsWith("Queue") ||
    l.startsWith("Standby") ||
    l.includes("Mulai bekerja") ||
    l.includes("menunggu")
  );
}

// Derive the cleaned, editable text from an agent's logs/output.
function deriveEditableText(agent) {
  if (!agent) return "";
  // Prefer an explicitly captured output, else reconstruct from logs.
  if (typeof agent.output === "string" && agent.output.trim()) {
    return agent.output.trim();
  }
  const logs = Array.isArray(agent.logs) ? agent.logs : [];
  return logs
    .filter((l) => !isSystemLine(l))
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

export default function OutputEditor({ agent, onSave, onClose }) {
  const original = useMemo(() => deriveEditableText(agent), [agent]);
  const [text, setText] = useState(original);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(false);

  if (!agent) return null;

  const dirty = text !== original;
  const color = agent.color || GOLD;

  const handleSave = () => {
    onSave(agent.id, text.trim());
    onClose();
  };

  const handleRefine = async () => {
    const current = text.trim();
    if (!current || refining) return;
    setRefining(true);
    setError(null);
    try {
      const prompt =
        "Refine and improve this agent output. Make it more actionable, specific, and concise. Keep bullet point format:\n\n" +
        current;
      const improved = await callClaude(
        "You are an expert editor refining AI agent outputs. Return only the refined output, no preamble.",
        prompt
      );
      if (improved && improved.trim()) {
        setText(improved.trim());
      } else {
        setError("No content returned. Try again.");
      }
    } catch (e) {
      setError(e.message || "Refine failed. Check API connection.");
    } finally {
      setRefining(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,4,10,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 320,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
        animation: "fadeSlideIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes oeSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          padding: 26,
          maxHeight: "92vh",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${color}22`,
                border: `1px solid ${color}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: color,
                fontSize: 18,
              }}
            >
              {agent.icon || "🤖"}
            </div>
            <div>
              <div
                style={{
                  color: "#fff",
                  fontFamily: FONT_HEAD,
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1.2,
                }}
              >
                {agent.name || "Agent"}
              </div>
              <div
                style={{
                  color: color + "aa",
                  fontSize: 10,
                  fontFamily: FONT_MONO,
                  letterSpacing: 1,
                }}
              >
                EDIT OUTPUT
              </div>
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

        {/* Original (read-only) */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              color: "#ffffff44",
              fontSize: 10,
              fontFamily: FONT_MONO,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 7,
            }}
          >
            Original Output
          </div>
          <pre
            style={{
              margin: 0,
              background: "#07070f",
              border: "1px solid #ffffff0f",
              borderRadius: 10,
              padding: "12px 14px",
              color: "#ffffff77",
              fontFamily: FONT_MONO,
              fontSize: 11,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {original || "(no output captured)"}
          </pre>
        </div>

        {/* Editable textarea */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
            }}
          >
            <span
              style={{
                color: "#ffffff44",
                fontSize: 10,
                fontFamily: FONT_MONO,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Edited Output
            </span>
            <button
              onClick={handleRefine}
              disabled={refining || !text.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: GOLD + "14",
                border: "1px solid " + GOLD + "44",
                borderRadius: 8,
                padding: "5px 11px",
                color: refining ? GOLD + "88" : GOLD,
                fontFamily: FONT_HEAD,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: 0.4,
                cursor: refining || !text.trim() ? "not-allowed" : "pointer",
                opacity: !text.trim() ? 0.5 : 1,
              }}
            >
              {refining ? (
                <>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      border: `2px solid ${GOLD}55`,
                      borderTopColor: GOLD,
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "oeSpin 0.7s linear infinite",
                    }}
                  />
                  REFINING…
                </>
              ) : (
                <>✦ REFINE WITH AI</>
              )}
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            placeholder="Edit the agent output before passing it to the next agent…"
            style={{
              width: "100%",
              minHeight: 180,
              resize: "vertical",
              background: "#07070f",
              border: `1px solid ${focused ? GOLD + "66" : "#ffffff15"}`,
              borderRadius: 10,
              padding: "12px 14px",
              color: "#ffffffdd",
              fontFamily: FONT_MONO,
              fontSize: 12,
              lineHeight: 1.55,
              boxSizing: "border-box",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
          />
        </div>

        {/* Char count + status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            minHeight: 16,
          }}
        >
          <span style={{ color: "#ffffff33", fontFamily: FONT_MONO, fontSize: 10 }}>
            {text.length} {text.length === 1 ? "character" : "characters"}
            {dirty && <span style={{ color: GOLD + "99" }}> · edited</span>}
          </span>
          {error && (
            <span style={{ color: "#ef4444", fontFamily: FONT_MONO, fontSize: 10 }}>
              {error}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            style={{
              flex: 1,
              background: !text.trim() ? GOLD + "33" : GOLD,
              border: "none",
              borderRadius: 11,
              padding: "12px 16px",
              color: "#07070f",
              fontFamily: FONT_HEAD,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.4,
              cursor: !text.trim() ? "not-allowed" : "pointer",
              opacity: !text.trim() ? 0.6 : 1,
            }}
          >
            SAVE & APPLY
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "#ffffff08",
              border: "1px solid #ffffff1f",
              borderRadius: 11,
              padding: "12px 16px",
              color: "#ffffffaa",
              fontFamily: FONT_HEAD,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.4,
              cursor: "pointer",
            }}
          >
            DISCARD
          </button>
        </div>
      </div>
    </div>
  );
}
