import { useState } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const GOLD = "#F0C040";

const KEYS_URL = "https://console.anthropic.com/keys";

const INPUT_BASE = {
  background: "#ffffff08",
  border: "1px solid #ffffff15",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#fff",
  fontFamily: FONT_MONO,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

// Modal/screen for the user to enter their Anthropic API key.
// Shown when the user is logged in but has not configured a key yet.
export default function ApiKeySetup({ onSave, onSkip }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = key.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave?.(key.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 400,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          padding: 32,
          maxHeight: "90vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontFamily: FONT_HEAD,
            color: "#fff",
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            letterSpacing: 0.5,
          }}
        >
          Connect Your Claude AI
        </h2>
        <div
          style={{
            fontFamily: FONT_BODY,
            color: "#ffffff88",
            fontSize: 14,
            marginTop: 8,
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Enter your Anthropic API key to enable AI agents
        </div>

        {/* Input + show/hide toggle */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
            spellCheck={false}
            style={{ ...INPUT_BASE, paddingRight: 64 }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#ffffff08",
              border: "1px solid #ffffff15",
              borderRadius: 8,
              color: "#ffffffaa",
              padding: "6px 10px",
              fontSize: 11,
              fontFamily: FONT_MONO,
              cursor: "pointer",
            }}
          >
            {show ? "HIDE" : "SHOW"}
          </button>
        </div>

        {/* Where do I get my key? */}
        <a
          href={KEYS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: FONT_BODY,
            color: GOLD,
            fontSize: 12,
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 18,
          }}
        >
          Where do I get my key? →
        </a>

        {/* Cost info */}
        <div
          style={{
            background: "#07070f",
            border: "1px solid #ffffff10",
            borderRadius: 12,
            padding: 14,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffffaa",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            ~$0.003 per 1K tokens (Haiku). A typical flow costs ~$0.01–0.05
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "none",
            fontFamily: FONT_HEAD,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: canSave && !saving ? "pointer" : "not-allowed",
            color: canSave ? "#07070f" : "#ffffff44",
            background: canSave
              ? "linear-gradient(135deg, #F0C040, #f5d472)"
              : "#ffffff0d",
            marginBottom: 12,
          }}
        >
          {saving ? "SAVING…" : "SAVE KEY"}
        </button>

        <button
          onClick={() => onSkip?.()}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#ffffff66",
            fontFamily: FONT_BODY,
            fontSize: 13,
            cursor: "pointer",
            padding: 4,
            marginBottom: 22,
          }}
        >
          Skip for now
        </button>

        {/* Security note */}
        <div
          style={{
            fontFamily: FONT_BODY,
            color: "#ffffff55",
            fontSize: 11,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          🔒 Your key is encrypted and only used to process your requests
        </div>
      </div>
    </div>
  );
}
