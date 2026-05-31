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

const TEST_PAYLOAD = {
  event: "flow_completed",
  timestamp: Date.now(),
  flowName: "Test Flow",
  agentCount: 3,
  results: [{ agent: "test", output: "This is a test webhook from Deniskyla." }],
  test: true,
};

async function sendTest(url) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...TEST_PAYLOAD, timestamp: Date.now() }),
    });
    return true;
  } catch {
    return false;
  }
}

function truncate(str, n = 38) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export default function WebhookModal({ webhooks, onAdd, onToggle, onRemove, onClose }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [formTest, setFormTest] = useState(null); // null | "ok" | "fail" | "loading"
  const [rowTests, setRowTests] = useState({}); // id -> status

  const canAdd = name.trim() && /^https?:\/\//.test(url.trim());

  const handleFormTest = async () => {
    if (!/^https?:\/\//.test(url.trim())) {
      setFormTest("fail");
      return;
    }
    setFormTest("loading");
    const ok = await sendTest(url.trim());
    setFormTest(ok ? "ok" : "fail");
  };

  const handleRowTest = async (wh) => {
    setRowTests((p) => ({ ...p, [wh.id]: "loading" }));
    const ok = await sendTest(wh.url);
    setRowTests((p) => ({ ...p, [wh.id]: ok ? "ok" : "fail" }));
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ name: name.trim(), url: url.trim() });
    setName("");
    setUrl("");
    setFormTest(null);
  };

  const testGlyph = (status) =>
    status === "ok" ? "✓" : status === "fail" ? "✗" : status === "loading" ? "…" : "TEST";

  const testColor = (status) =>
    status === "ok" ? "#34D399" : status === "fail" ? "#F87171" : "#ffffffaa";

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
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <div>
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
              WEBHOOKS
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Get notified when flows complete
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
          <div style={{ marginBottom: 16 }}>
            <label style={SECTION_LABEL}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Slack notification"
              style={INPUT_BASE}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={SECTION_LABEL}>URL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setFormTest(null);
                }}
                placeholder="https://hooks.slack.com/..."
                style={{ ...INPUT_BASE, fontFamily: FONT_MONO, fontSize: 12 }}
              />
              <button
                onClick={handleFormTest}
                style={{
                  background: "#ffffff08",
                  border: "1px solid #ffffff15",
                  borderRadius: 10,
                  color: testColor(formTest),
                  padding: "0 14px",
                  fontSize: 12,
                  fontFamily: FONT_MONO,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minWidth: 52,
                }}
              >
                {testGlyph(formTest)}
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "none",
              fontFamily: FONT_HEAD,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: canAdd ? "pointer" : "not-allowed",
              color: canAdd ? "#07070f" : "#ffffff44",
              background: canAdd
                ? "linear-gradient(135deg, #F0C040, #f5d472)"
                : "#ffffff0d",
            }}
          >
            ADD
          </button>
        </div>

        {/* Webhook list */}
        <label style={SECTION_LABEL}>Configured Webhooks</label>
        {webhooks.length === 0 ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffff44",
              fontSize: 13,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No webhooks yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                style={{
                  background: "#07070f",
                  border: "1px solid #ffffff10",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: wh.enabled ? 1 : 0.55,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: FONT_HEAD,
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {wh.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      color: "#ffffff66",
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    {truncate(wh.url)}
                  </div>
                </div>

                {/* Test */}
                <button
                  onClick={() => handleRowTest(wh)}
                  style={{
                    background: "#ffffff08",
                    border: "1px solid #ffffff15",
                    borderRadius: 8,
                    color: testColor(rowTests[wh.id]),
                    height: 28,
                    minWidth: 40,
                    padding: "0 8px",
                    fontSize: 11,
                    fontFamily: FONT_MONO,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {testGlyph(rowTests[wh.id])}
                </button>

                {/* Toggle switch */}
                <button
                  onClick={() => onToggle(wh.id)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: wh.enabled ? GOLD : "#ffffff20",
                    position: "relative",
                    flexShrink: 0,
                    transition: "background 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: wh.enabled ? 20 : 2,
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
                  onClick={() => onRemove(wh.id)}
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
