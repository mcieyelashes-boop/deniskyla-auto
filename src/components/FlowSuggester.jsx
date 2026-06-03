import { useState } from "react";
import { AGENTS } from "../config/agents";
import { callClaude } from "../lib/claude";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const PURPLE = "#A78BFA";

const KEYFRAMES = `
@keyframes fsPulse {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
@keyframes fsFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// Build the agent roster description for the system prompt
const AGENT_ROSTER = AGENTS.map(
  (a) => `- ${a.id}: ${a.name} — ${a.desc} (capabilities: ${(a.capabilities || []).join(", ")})`
).join("\n");

const SYSTEM_PROMPT = `You are a flow orchestration expert for a marketing automation system.
The available agents are:
${AGENT_ROSTER}

Given a user's business goal, suggest the optimal agent flow.
Respond in JSON only:
{
  "flowName": "descriptive name",
  "rationale": "why this flow works for the goal",
  "chain": ["agentId1", "agentId2", ...],
  "agentTasks": {
    "agentId1": "specific task for this agent",
    "agentId2": "specific task for this agent"
  },
  "estimatedTime": "~X minutes",
  "expectedOutcome": "what the user will get"
}`;

// Extract a JSON object from a model response that may include prose/fences.
function parseSuggestion(text) {
  if (!text) throw new Error("Empty response from AI");
  let raw = text.trim();

  // Strip markdown code fences if present
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) raw = fenceMatch[1].trim();

  // Fall back to the first {...} block
  if (!raw.startsWith("{")) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      raw = raw.slice(start, end + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Could not parse the AI response. Try regenerating.");
  }

  // Validate + keep only known agent ids in declared order
  const validIds = new Set(AGENTS.map((a) => a.id));
  const chain = Array.isArray(parsed.chain)
    ? parsed.chain.filter((id) => validIds.has(id))
    : [];
  if (!chain.length) throw new Error("AI did not return a valid agent chain. Try regenerating.");

  return {
    flowName: parsed.flowName || "Suggested Flow",
    rationale: parsed.rationale || "",
    chain,
    agentTasks: parsed.agentTasks && typeof parsed.agentTasks === "object" ? parsed.agentTasks : {},
    estimatedTime: parsed.estimatedTime || "",
    expectedOutcome: parsed.expectedOutcome || "",
  };
}

export default function FlowSuggester({ onRunFlow, orchestrating }) {
  const [open, setOpen] = useState(true);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [focused, setFocused] = useState(false);

  async function suggest() {
    const trimmed = goal.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError("");
    setSuggestion(null);
    try {
      const text = await callClaude(SYSTEM_PROMPT, `Business goal: ${trimmed}`);
      const parsed = parseSuggestion(text);
      setSuggestion(parsed);
    } catch (e) {
      setError(e.message || "Failed to generate a flow. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function runSuggested() {
    if (!suggestion || orchestrating) return;
    onRunFlow({
      id: "ai-suggested",
      name: suggestion.flowName,
      chain: suggestion.chain,
      agentTasks: suggestion.agentTasks,
    });
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #A78BFA08, #A78BFA03)",
        border: "1px solid #A78BFA22",
        borderRadius: 18,
        padding: open ? "20px 24px" : "16px 24px",
        marginBottom: 16,
        transition: "padding 0.2s ease",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT_HEAD,
              color: PURPLE,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            ✦ AI FLOW SUGGESTER
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffff66",
              fontSize: 12,
              marginTop: 3,
            }}
          >
            Describe your goal, get a custom flow
          </div>
        </div>
        <button
          onClick={() => setOpen((p) => !p)}
          style={{
            background: "#A78BFA14",
            border: "1px solid #A78BFA33",
            borderRadius: 9,
            color: PURPLE,
            padding: "6px 12px",
            fontSize: 11,
            fontFamily: FONT_MONO,
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {open ? "▲ COLLAPSE" : "▼ EXPAND"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 18 }}>
          {/* ── INPUT AREA ── */}
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What do you want to achieve? (e.g. 'Launch my new SaaS product', 'Get 100 leads this week')"
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#07070f",
              border: `1px solid ${focused ? "#A78BFA66" : "#ffffff15"}`,
              borderRadius: 12,
              padding: "12px 14px",
              color: "#fff",
              fontFamily: FONT_BODY,
              fontSize: 14,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
              transition: "border-color 0.15s ease",
            }}
          />

          <button
            onClick={suggest}
            disabled={loading || !goal.trim()}
            style={{
              marginTop: 12,
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontFamily: FONT_HEAD,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.5,
              cursor: loading || !goal.trim() ? "not-allowed" : "pointer",
              opacity: loading || !goal.trim() ? 0.5 : 1,
              background: "linear-gradient(135deg, #A78BFA, #8B5CF6)",
              color: "#fff",
              transition: "opacity 0.15s ease",
            }}
          >
            {loading ? "✦ ANALYZING…" : "SUGGEST FLOW →"}
          </button>

          {/* ── LOADING STATE ── */}
          {loading && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: FONT_MONO,
                color: PURPLE,
                fontSize: 13,
              }}
            >
              <span>✦ Analyzing your goal</span>
              <span style={{ display: "inline-flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: PURPLE,
                      animation: "fsPulse 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </span>
            </div>
          )}

          {/* ── ERROR ── */}
          {error && !loading && (
            <div
              style={{
                marginTop: 16,
                background: "#ef444412",
                border: "1px solid #ef444433",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  color: "#ef4444",
                  fontSize: 12,
                }}
              >
                ⚠ {error}
              </span>
              <button
                onClick={suggest}
                style={{
                  background: "#ef444418",
                  border: "1px solid #ef444444",
                  borderRadius: 8,
                  color: "#ef4444",
                  padding: "6px 12px",
                  fontSize: 11,
                  fontFamily: FONT_MONO,
                  cursor: "pointer",
                }}
              >
                ↻ RETRY
              </button>
            </div>
          )}

          {/* ── SUGGESTED FLOW ── */}
          {suggestion && !loading && (
            <div
              style={{
                marginTop: 18,
                background: "#07070f",
                border: "1px solid #A78BFA2a",
                borderRadius: 16,
                padding: 18,
                animation: "fsFadeIn 0.35s ease",
              }}
            >
              {/* Flow name + time badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_HEAD,
                    color: "#fff",
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: -0.3,
                  }}
                >
                  {suggestion.flowName}
                </div>
                {suggestion.estimatedTime && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: FONT_MONO,
                      color: PURPLE,
                      background: "#A78BFA14",
                      border: "1px solid #A78BFA33",
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ⏱ {suggestion.estimatedTime}
                  </span>
                )}
              </div>

              {/* Rationale */}
              {suggestion.rationale && (
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    color: "#ffffff99",
                    fontSize: 13,
                    lineHeight: 1.55,
                    marginBottom: 16,
                  }}
                >
                  {suggestion.rationale}
                </div>
              )}

              {/* Agent chain visual */}
              <div
                style={{
                  fontFamily: FONT_MONO,
                  color: "#ffffff44",
                  fontSize: 10,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                FLOW CHAIN
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {suggestion.chain.map((agentId, i) => {
                  const meta = AGENTS.find((a) => a.id === agentId);
                  if (!meta) return null;
                  return (
                    <span
                      key={agentId}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          padding: "4px 11px",
                          borderRadius: 20,
                          background: `${meta.color}18`,
                          border: `1px solid ${meta.color}44`,
                          color: meta.color,
                          fontSize: 11,
                          fontFamily: FONT_MONO,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span>{meta.icon}</span>
                        {meta.name}
                      </span>
                      {i < suggestion.chain.length - 1 && (
                        <span style={{ color: "#ffffff22", fontSize: 12 }}>→</span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Expected outcome */}
              {suggestion.expectedOutcome && (
                <div
                  style={{
                    background: "#A78BFA0a",
                    border: "1px solid #A78BFA1f",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      color: PURPLE,
                      fontSize: 10,
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    EXPECTED OUTCOME
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_BODY,
                      color: "#ffffffcc",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {suggestion.expectedOutcome}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={runSuggested}
                  disabled={orchestrating}
                  style={{
                    flex: 1,
                    minWidth: 180,
                    border: "none",
                    borderRadius: 12,
                    padding: "13px",
                    fontFamily: FONT_HEAD,
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    cursor: orchestrating ? "not-allowed" : "pointer",
                    opacity: orchestrating ? 0.5 : 1,
                    background: "linear-gradient(135deg, #F0C040, #F59E0B)",
                    color: "#07070f",
                    transition: "opacity 0.15s ease",
                  }}
                >
                  ▶ RUN THIS FLOW
                </button>
                <button
                  onClick={suggest}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: PURPLE,
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    cursor: loading ? "wait" : "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  ↻ REGENERATE
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
