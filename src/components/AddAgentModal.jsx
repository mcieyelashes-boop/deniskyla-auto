import { useState, useMemo } from "react";
import { AGENTS } from "../config/agents";

const EMOJIS = [
  "🔍", "📊", "🎯", "💡", "🛠️", "📱", "🤖", "✍️", "📧", "🎨",
  "📈", "🔗", "💬", "🌐", "📦", "🎬", "🧪", "💰", "🔔", "⚡",
];

const COLORS = [
  "#38BDF8", "#A78BFA", "#34D399", "#FB923C",
  "#F472B6", "#FBBF24", "#6EE7B7", "#F87171",
];

const generateId = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

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
  transition: "border-color 0.15s ease",
};

export default function AddAgentModal({ onAdd, onClose, existingIds = [] }) {
  const [name, setName] = useState("");
  const [idEdited, setIdEdited] = useState(false);
  const [id, setId] = useState("");
  const [editingId, setEditingId] = useState(false);
  const [icon, setIcon] = useState(EMOJIS[6]);
  const [color, setColor] = useState(COLORS[0]);
  const [desc, setDesc] = useState("");
  const [defaultTask, setDefaultTask] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [capabilitiesRaw, setCapabilitiesRaw] = useState("");
  const [focusKey, setFocusKey] = useState(null);

  const effectiveId = idEdited ? id : generateId(name);

  const capabilities = useMemo(
    () =>
      capabilitiesRaw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [capabilitiesRaw]
  );

  const allExistingIds = useMemo(() => [...AGENTS.map((a) => a.id), ...existingIds], [existingIds]);

  const errors = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!effectiveId) e.id = "ID is required";
    else if (/\s/.test(effectiveId)) e.id = "ID cannot contain spaces";
    else if (allExistingIds.includes(effectiveId))
      e.id = `ID "${effectiveId}" already exists`;
    if (!systemPrompt.trim()) e.systemPrompt = "System prompt is required";
    else if (systemPrompt.trim().length < 20)
      e.systemPrompt = "System prompt must be at least 20 characters";
    return e;
  }, [name, effectiveId, existingIds, systemPrompt]);

  const isValid = Object.keys(errors).length === 0;

  const handleNameChange = (v) => {
    setName(v);
    if (!idEdited) setId(generateId(v));
  };

  const handleIdChange = (v) => {
    setIdEdited(true);
    setId(generateId(v));
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const agent = {
      id: effectiveId,
      name: name.trim(),
      icon,
      color,
      desc: desc.trim(),
      defaultTask: defaultTask.trim() || "New task",
      systemPrompt: systemPrompt.trim(),
      capabilities,
      logMessages: ["Processing...", "Working on task...", "Done ✓"],
    };
    onAdd(agent);
  };

  const focusStyle = (key) =>
    focusKey === key
      ? { ...INPUT_BASE, borderColor: "#F0C04066" }
      : INPUT_BASE;

  const fieldEvents = (key) => ({
    onFocus: () => setFocusKey(key),
    onBlur: () => setFocusKey(null),
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
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
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Add Custom Agent
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

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="SEO Specialist"
            style={focusStyle("name")}
            {...fieldEvents("name")}
          />
          {errors.name && (
            <div style={errStyle}>{errors.name}</div>
          )}
        </div>

        {/* ID */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>ID</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={effectiveId}
              readOnly={!editingId}
              onChange={(e) => handleIdChange(e.target.value)}
              placeholder="seo_specialist"
              style={{
                ...focusStyle("id"),
                fontFamily: FONT_MONO,
                fontSize: 13,
                color: editingId ? "#fff" : "#ffffffaa",
                cursor: editingId ? "text" : "default",
              }}
              {...fieldEvents("id")}
            />
            <button
              onClick={() => setEditingId((v) => !v)}
              style={{
                background: "#ffffff08",
                border: "1px solid #ffffff15",
                borderRadius: 10,
                color: "#ffffff88",
                padding: "10px 14px",
                fontSize: 12,
                fontFamily: FONT_MONO,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {editingId ? "Lock" : "Edit"}
            </button>
          </div>
          {errors.id && <div style={errStyle}>{errors.id}</div>}
        </div>

        {/* Icon */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>Icon</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 6,
            }}
          >
            {EMOJIS.map((em) => (
              <button
                key={em}
                onClick={() => setIcon(em)}
                style={{
                  background: icon === em ? "#F0C04022" : "#ffffff08",
                  border:
                    icon === em
                      ? "1px solid #F0C040aa"
                      : "1px solid #ffffff15",
                  borderRadius: 8,
                  fontSize: 18,
                  padding: "6px 0",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>Color</label>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: c,
                  border:
                    color === c
                      ? "2px solid #fff"
                      : "2px solid transparent",
                  boxShadow: color === c ? `0 0 0 2px ${c}66` : "none",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>Description</label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optimize on-page SEO & rankings"
            style={focusStyle("desc")}
            {...fieldEvents("desc")}
          />
        </div>

        {/* Default Task */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>Default Task</label>
          <input
            value={defaultTask}
            onChange={(e) => setDefaultTask(e.target.value)}
            placeholder="Audit top 10 pages"
            style={focusStyle("task")}
            {...fieldEvents("task")}
          />
        </div>

        {/* System Prompt */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a [role] agent. For the given task, return 4-5 bullet points with..."
            rows={5}
            style={{
              ...focusStyle("prompt"),
              resize: "vertical",
              minHeight: 110,
              lineHeight: 1.5,
            }}
            {...fieldEvents("prompt")}
          />
          {errors.systemPrompt && (
            <div style={errStyle}>{errors.systemPrompt}</div>
          )}
        </div>

        {/* Capabilities */}
        <div style={{ marginBottom: 18 }}>
          <label style={SECTION_LABEL}>Capabilities (comma-separated)</label>
          <input
            value={capabilitiesRaw}
            onChange={(e) => setCapabilitiesRaw(e.target.value)}
            placeholder="Keyword research, On-page, Backlinks"
            style={focusStyle("caps")}
            {...fieldEvents("caps")}
          />
          {capabilities.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
              }}
            >
              {capabilities.map((cap, i) => (
                <span
                  key={`${cap}-${i}`}
                  style={{
                    background: `${color}1a`,
                    border: `1px solid ${color}44`,
                    color: color,
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontFamily: FONT_MONO,
                  }}
                >
                  {cap}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 22 }}>
          <label style={SECTION_LABEL}>Preview</label>
          <div
            style={{
              background: "#07070f",
              border: `1px solid ${color}33`,
              borderRadius: 16,
              padding: 16,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${color}1a`,
                border: `1px solid ${color}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: FONT_HEAD,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {name || "Agent Name"}
              </div>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  color: "#ffffff77",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {desc || "Agent description..."}
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  color: color,
                  fontSize: 10,
                  letterSpacing: 1,
                  marginTop: 8,
                }}
              >
                {effectiveId || "agent_id"}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            fontFamily: FONT_HEAD,
            fontSize: 15,
            fontWeight: 700,
            cursor: isValid ? "pointer" : "not-allowed",
            color: isValid ? "#07070f" : "#ffffff44",
            background: isValid
              ? "linear-gradient(135deg, #F0C040, #f5d472)"
              : "#ffffff0d",
            border: isValid ? "none" : "1px solid #ffffff15",
            transition: "opacity 0.15s ease",
          }}
        >
          Add Agent
        </button>
      </div>
    </div>
  );
}

const errStyle = {
  fontFamily: FONT_MONO,
  color: "#F87171",
  fontSize: 11,
  marginTop: 6,
};
