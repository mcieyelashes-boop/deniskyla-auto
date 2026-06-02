import { useState } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const GOLD = "#F0C040";

const KEYFRAMES = `
@keyframes integrationsSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes integrationsExpand {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.integrations-body::-webkit-scrollbar { width: 8px; }
.integrations-body::-webkit-scrollbar-thumb { background: #ffffff1a; border-radius: 8px; }
`;

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
  flowName: "Test Flow",
  agentCount: 1,
  results: [{ agentName: "Connection Test", output: "This is a test message from Deniskyla integrations." }],
  test: true,
};

const testColor = (status) =>
  status === "ok" ? "#34D399" : status === "fail" ? "#F87171" : "#ffffffaa";

const testGlyph = (status, label = "TEST") =>
  status === "ok" ? "✓ Sent" : status === "fail" ? "✗ Failed" : status === "loading" ? "Sending…" : label;

// Reusable checkbox row
function CheckRow({ checked, onChange, label, color }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontFamily: FONT_BODY,
        fontSize: 13,
        color: "#ffffffcc",
        userSelect: "none",
      }}
    >
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          border: `1px solid ${checked ? color : "#ffffff22"}`,
          background: checked ? color : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 12,
          color: "#07070f",
          fontWeight: 700,
          transition: "all 0.15s ease",
        }}
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </label>
  );
}

// Local-state text field that auto-saves on blur
function Field({ label, value, onCommit, placeholder, type = "text", mono = false }) {
  const [local, setLocal] = useState(value || "");
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={SECTION_LABEL}>{label}</label>
      <input
        type={type}
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (local !== value) onCommit(local);
        }}
        style={{
          ...INPUT_BASE,
          ...(mono ? { fontFamily: FONT_MONO, fontSize: 12 } : {}),
          border: focused ? "1px solid #ffffff35" : "1px solid #ffffff15",
        }}
      />
    </div>
  );
}

// Toggle pill
function TogglePill({ enabled, color, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: enabled ? `${color}22` : "#ffffff08",
        border: `1px solid ${enabled ? color : "#ffffff18"}`,
        borderRadius: 999,
        padding: "5px 12px",
        cursor: "pointer",
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: 1,
        color: enabled ? color : "#ffffff66",
        whiteSpace: "nowrap",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: enabled ? color : "#ffffff33",
          boxShadow: enabled ? `0 0 8px ${color}` : "none",
        }}
      />
      {enabled ? "ENABLED" : "DISABLED"}
    </button>
  );
}

function TestButton({ status, color, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={status === "loading"}
      style={{
        marginTop: 4,
        background: "#ffffff08",
        border: `1px solid ${status === "ok" ? "#34D39955" : status === "fail" ? "#F8717155" : "#ffffff18"}`,
        borderRadius: 10,
        color: testColor(status),
        padding: "8px 16px",
        fontSize: 11,
        fontFamily: FONT_MONO,
        letterSpacing: 1,
        cursor: status === "loading" ? "wait" : "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {testGlyph(status)}
    </button>
  );
}

function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-block",
        marginTop: 4,
        fontFamily: FONT_BODY,
        fontSize: 12,
        color: GOLD,
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

// Single integration card
function Card({ meta, cfg, onUpdate, onToggle, onTest, testStatus, children }) {
  const enabled = cfg.enabled;
  return (
    <div
      style={{
        background: "#07070f",
        border: "1px solid #ffffff10",
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: `${meta.color}22`,
            border: `1px solid ${meta.color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 700,
              fontSize: 16,
              color: "#fff",
              letterSpacing: 0.3,
            }}
          >
            {meta.name}
          </div>
        </div>
        <TogglePill enabled={enabled} color={meta.color} onToggle={onToggle} />
      </div>

      {/* Description */}
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12,
          color: "#ffffff66",
          marginTop: 10,
          lineHeight: 1.5,
        }}
      >
        {meta.desc}
      </div>

      {/* Config (expands when enabled) */}
      {enabled && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #ffffff0d",
            animation: "integrationsExpand 0.25s ease",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsModal({ integrations, onUpdate, onToggle, onClose }) {
  const [tests, setTests] = useState({}); // key -> status

  const slack = integrations.slack;
  const notion = integrations.notion;
  const sheets = integrations.sheets;

  const runTest = async (key, fn) => {
    setTests((p) => ({ ...p, [key]: "loading" }));
    let ok = false;
    try {
      ok = await fn();
    } catch {
      ok = false;
    }
    setTests((p) => ({ ...p, [key]: ok ? "ok" : "fail" }));
    setTimeout(() => setTests((p) => ({ ...p, [key]: null })), 3000);
  };

  const testSlack = () =>
    runTest("slack", async () => {
      if (!slack.webhookUrl) return false;
      const text = `*${TEST_PAYLOAD.flowName}* completed ✓\n${TEST_PAYLOAD.agentCount} agents ran`;
      await fetch(slack.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, channel: slack.channel }),
      });
      return true;
    });

  const testNotion = () =>
    runTest("notion", async () => {
      if (!notion.apiKey || !notion.databaseId) return false;
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notion.apiKey}`,
          "Notion-Version": "2022-06-28",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: notion.databaseId },
          properties: {
            Name: { title: [{ text: { content: `${TEST_PAYLOAD.flowName} — ${new Date().toLocaleDateString()}` } }] },
            Status: { select: { name: "Completed" } },
          },
        }),
      });
      return res.ok;
    });

  const testSheets = () =>
    runTest("sheets", async () => {
      if (!sheets.webhookUrl) return false;
      await fetch(sheets.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sheetName: sheets.sheetName,
          timestamp: new Date().toISOString(),
          flowName: TEST_PAYLOAD.flowName,
          agentCount: TEST_PAYLOAD.agentCount,
          results: TEST_PAYLOAD.results.map((r) => ({ agent: r.agentName, output: r.output })),
          test: true,
        }),
      });
      return true;
    });

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
      <style>{KEYFRAMES}</style>
      <div
        className="integrations-body"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          padding: 28,
          maxHeight: "85vh",
          overflowY: "auto",
          boxSizing: "border-box",
          animation: "integrationsSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
                fontWeight: 800,
                margin: 0,
                letterSpacing: 0.5,
              }}
            >
              INTEGRATIONS
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Connect your tools
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

        {/* Slack */}
        <Card
          meta={{
            name: "Slack",
            icon: "💬",
            color: "#4A154B",
            desc: "Post a message to a channel whenever a flow finishes running.",
          }}
          cfg={slack}
          onToggle={() => onToggle("slack")}
        >
          <Field
            label="Webhook URL"
            value={slack.webhookUrl}
            onCommit={(v) => onUpdate("slack", { webhookUrl: v })}
            placeholder="https://hooks.slack.com/services/..."
            mono
          />
          <Field
            label="Channel"
            value={slack.channel}
            onCommit={(v) => onUpdate("slack", { channel: v })}
            placeholder="#general"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <CheckRow
              checked={slack.notifyOnComplete}
              onChange={(v) => onUpdate("slack", { notifyOnComplete: v })}
              label="Notify on complete"
              color="#4A154B"
            />
            <CheckRow
              checked={slack.notifyOnError}
              onChange={(v) => onUpdate("slack", { notifyOnError: v })}
              label="Notify on error"
              color="#4A154B"
            />
          </div>
          <TestButton status={tests.slack} color="#4A154B" onClick={testSlack} />
        </Card>

        {/* Notion */}
        <Card
          meta={{
            name: "Notion",
            icon: "📝",
            color: "#2F2F2F",
            desc: "Save each completed flow as a new page in a Notion database.",
          }}
          cfg={notion}
          onToggle={() => onToggle("notion")}
        >
          <Field
            label="API Key"
            value={notion.apiKey}
            onCommit={(v) => onUpdate("notion", { apiKey: v })}
            placeholder="secret_..."
            type="password"
            mono
          />
          <Field
            label="Database ID"
            value={notion.databaseId}
            onCommit={(v) => onUpdate("notion", { databaseId: v })}
            placeholder="32-char database ID"
            mono
          />
          <div style={{ marginBottom: 12 }}>
            <CheckRow
              checked={notion.saveResults}
              onChange={(v) => onUpdate("notion", { saveResults: v })}
              label="Save results to database"
              color="#7c7c7c"
            />
          </div>
          <ExternalLink href="https://developers.notion.com/docs/create-a-notion-integration">
            How to get your Notion API key →
          </ExternalLink>
          <div style={{ marginTop: 12 }}>
            <TestButton status={tests.notion} color="#7c7c7c" onClick={testNotion} />
          </div>
        </Card>

        {/* Google Sheets */}
        <Card
          meta={{
            name: "Google Sheets",
            icon: "📊",
            color: "#0F9D58",
            desc: "Append a row to a spreadsheet for every flow via an Apps Script webhook.",
          }}
          cfg={sheets}
          onToggle={() => onToggle("sheets")}
        >
          <Field
            label="Apps Script Webhook URL"
            value={sheets.webhookUrl}
            onCommit={(v) => onUpdate("sheets", { webhookUrl: v })}
            placeholder="https://script.google.com/macros/s/.../exec"
            mono
          />
          <Field
            label="Sheet Name"
            value={sheets.sheetName}
            onCommit={(v) => onUpdate("sheets", { sheetName: v })}
            placeholder="Agent Results"
          />
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: "#ffffff55",
              lineHeight: 1.5,
              marginBottom: 8,
            }}
          >
            Deploy a Google Apps Script with a <code style={{ fontFamily: FONT_MONO, color: "#0F9D58" }}>doPost()</code> handler to receive data.
          </div>
          <ExternalLink href="https://developers.google.com/apps-script/guides/web">
            Setup guide →
          </ExternalLink>
          <div style={{ marginTop: 12 }}>
            <TestButton status={tests.sheets} color="#0F9D58" onClick={testSheets} />
          </div>
        </Card>
      </div>
    </div>
  );
}
