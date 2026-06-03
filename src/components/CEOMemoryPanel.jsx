import { useState } from "react";

// ─── SHARED STYLES ─────────────────────────────────────────────────────────────

const labelStyle = {
  display: "block",
  color: "#ffffff66",
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(12,12,22,0.6)",
  border: "1px solid #ffffff14",
  borderRadius: 8,
  padding: "9px 11px",
  color: "#fff",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.18s",
};

const sectionTitleStyle = {
  color: "#F0C040",
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  gap: 7,
};

// ─── PROFILE FIELD ──────────────────────────────────────────────────────────────

function ProfileField({ label, field, value, placeholder, onUpdate }) {
  const [local, setLocal] = useState(value || "");
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (local !== value) onUpdate({ [field]: local });
        }}
        style={{
          ...inputStyle,
          borderColor: focused ? "#F0C04066" : "#ffffff14",
        }}
      />
    </div>
  );
}

// ─── MAIN PANEL ──────────────────────────────────────────────────────────────────

export default function CEOMemoryPanel({ memory, onUpdate, onAddInsight, onClear, onClose }) {
  const safeMemory = memory || {};
  const goals = Array.isArray(safeMemory.goals) ? safeMemory.goals : [];
  const insights = Array.isArray(safeMemory.pastInsights) ? safeMemory.pastInsights : [];

  const [goalInput, setGoalInput] = useState("");
  const [goalFocused, setGoalFocused] = useState(false);

  const addGoal = () => {
    const trimmed = goalInput.trim();
    if (!trimmed || goals.length >= 5) return;
    if (goals.includes(trimmed)) {
      setGoalInput("");
      return;
    }
    onUpdate({ goals: [...goals, trimmed] });
    setGoalInput("");
  };

  const removeGoal = (goal) => {
    onUpdate({ goals: goals.filter((g) => g !== goal) });
  };

  const clearInsights = () => {
    onUpdate({ pastInsights: [] });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 154,
          animation: "fadeSlideIn 0.2s ease",
        }}
      />

      {/* Slide-in panel */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: 360,
          background: "rgba(7,7,15,0.98)",
          borderRight: "1px solid #ffffff0f",
          zIndex: 155,
          display: "flex",
          flexDirection: "column",
          boxShadow: "24px 0 60px rgba(0,0,0,0.5)",
          animation: "slideInLeftMem 0.25s ease",
        }}
      >
        <style>{`
          @keyframes slideInLeftMem {
            from { opacity: 0; transform: translateX(-24px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 18px 14px",
            borderBottom: "1px solid #ffffff0f",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#ffffffaa",
              fontFamily: "'DM Mono', monospace",
              fontSize: 12,
              letterSpacing: 2,
            }}
          >
            <span style={{ fontSize: 15 }}>🧠</span>
            CEO MEMORY
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onClear}
              style={{
                background: "#ef444412",
                border: "1px solid #ef444433",
                borderRadius: 8,
                padding: "5px 10px",
                color: "#ef4444",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              CLEAR
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff66",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 8px" }}>
          {/* Section 1 — Business Profile */}
          <div style={{ marginBottom: 26 }}>
            <div style={sectionTitleStyle}>
              <span style={{ color: "#F0C040" }}>◆</span> Business Profile
            </div>
            <ProfileField
              label="Business Name"
              field="businessName"
              value={safeMemory.businessName}
              placeholder="e.g. Deniskyla"
              onUpdate={onUpdate}
            />
            <ProfileField
              label="Business Type"
              field="businessType"
              value={safeMemory.businessType}
              placeholder="E-commerce, SaaS, Agency..."
              onUpdate={onUpdate}
            />
            <ProfileField
              label="Target Audience"
              field="targetAudience"
              value={safeMemory.targetAudience}
              placeholder="e.g. Women 25-40, beauty enthusiasts"
              onUpdate={onUpdate}
            />
            <ProfileField
              label="Main Product / Service"
              field="mainProduct"
              value={safeMemory.mainProduct}
              placeholder="e.g. Premium eyelash extensions"
              onUpdate={onUpdate}
            />
          </div>

          {/* Section 2 — Goals */}
          <div style={{ marginBottom: 26 }}>
            <div style={sectionTitleStyle}>
              <span style={{ color: "#F0C040" }}>◆</span> Goals
              <span
                style={{
                  marginLeft: "auto",
                  color: "#ffffff44",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  fontWeight: 400,
                  letterSpacing: 0,
                  textTransform: "none",
                }}
              >
                {goals.length}/5
              </span>
            </div>

            {/* Existing goal pills */}
            {goals.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 7,
                  marginBottom: 12,
                }}
              >
                {goals.map((goal) => (
                  <span
                    key={goal}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 6px 5px 11px",
                      borderRadius: 20,
                      background: "#F0C04018",
                      border: "1px solid #F0C04040",
                      color: "#F0C040",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {goal}
                    <button
                      onClick={() => removeGoal(goal)}
                      aria-label={`Remove ${goal}`}
                      style={{
                        background: "#F0C04022",
                        border: "none",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#F0C040",
                        cursor: "pointer",
                        fontSize: 10,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add new goal */}
            {goals.length < 5 && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={goalInput}
                  placeholder="Add a goal..."
                  onChange={(e) => setGoalInput(e.target.value)}
                  onFocus={() => setGoalFocused(true)}
                  onBlur={() => setGoalFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGoal();
                    }
                  }}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    borderColor: goalFocused ? "#F0C04066" : "#ffffff14",
                  }}
                />
                <button
                  onClick={addGoal}
                  disabled={!goalInput.trim()}
                  style={{
                    background: goalInput.trim() ? "#F0C040" : "#F0C04022",
                    border: "none",
                    borderRadius: 8,
                    padding: "0 16px",
                    color: goalInput.trim() ? "#07070f" : "#F0C04066",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    cursor: goalInput.trim() ? "pointer" : "default",
                  }}
                >
                  ADD
                </button>
              </div>
            )}
          </div>

          {/* Section 3 — Past Insights */}
          <div style={{ marginBottom: 8 }}>
            <div style={sectionTitleStyle}>
              <span style={{ color: "#F0C040" }}>◆</span> Past Insights
              {insights.length > 0 && (
                <button
                  onClick={clearInsights}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: "none",
                    color: "#ef4444aa",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  CLEAR ALL
                </button>
              )}
            </div>

            {insights.length === 0 ? (
              <div
                style={{
                  color: "#ffffff33",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  lineHeight: 1.5,
                  padding: "8px 0",
                }}
              >
                No insights captured yet. They'll accumulate as you run flows.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insights.map((insight, i) => (
                  <div
                    key={`${insight.date}-${i}`}
                    style={{
                      background: "#ffffff05",
                      border: "1px solid #ffffff0a",
                      borderRadius: 8,
                      padding: "9px 11px",
                    }}
                  >
                    <div
                      style={{
                        color: "#ffffffcc",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        lineHeight: 1.45,
                        marginBottom: 6,
                      }}
                    >
                      {insight.text}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "#F0C04014",
                          border: "1px solid #F0C04028",
                          color: "#F0C040aa",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 8,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {insight.source || "flow"}
                      </span>
                      <span
                        style={{
                          color: "#ffffff44",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 9,
                        }}
                      >
                        {insight.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #ffffff0f",
            color: "#ffffff55",
            fontFamily: "'DM Mono', monospace",
            fontSize: 9.5,
            lineHeight: 1.5,
            letterSpacing: 0.3,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span style={{ fontSize: 12, flexShrink: 0 }}>🧠</span>
          Memory is automatically used by CEO Agent to personalize responses
        </div>
      </div>
    </>
  );
}
