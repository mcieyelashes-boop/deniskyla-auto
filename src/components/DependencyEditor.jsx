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

const SELECT_BASE = {
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
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
};

function agentById(agents, id) {
  return agents.find((a) => a.id === id) || null;
}

// Detect whether adding (dependentId requires requiresId) would create a cycle.
// A cycle exists if requiresId already (transitively) depends on dependentId.
function wouldCreateCycle(dependencies, dependentId, requiresId) {
  if (dependentId === requiresId) return true;
  const visited = new Set();
  const stack = [requiresId];
  while (stack.length) {
    const current = stack.pop();
    if (current === dependentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = dependencies[current] || [];
    deps.forEach((d) => stack.push(d));
  }
  return false;
}

export default function DependencyEditor({ dependencies, agents, onAdd, onRemove, onClose }) {
  const [dependentId, setDependentId] = useState("");
  const [requiresId, setRequiresId] = useState("");
  const [error, setError] = useState("");

  const entries = Object.entries(dependencies || {}).filter(
    ([dep, reqs]) => Array.isArray(reqs) && reqs.length > 0 && agentById(agents, dep)
  );

  const handleAdd = () => {
    setError("");
    if (!dependentId || !requiresId) {
      setError("Select both agents.");
      return;
    }
    if (dependentId === requiresId) {
      setError("An agent cannot depend on itself.");
      return;
    }
    if ((dependencies[dependentId] || []).includes(requiresId)) {
      setError("That rule already exists.");
      return;
    }
    if (wouldCreateCycle(dependencies, dependentId, requiresId)) {
      const a = agentById(agents, dependentId);
      const b = agentById(agents, requiresId);
      setError(
        `Circular dependency: ${b?.name || requiresId} already depends on ${a?.name || dependentId}.`
      );
      return;
    }
    onAdd(dependentId, requiresId);
    setDependentId("");
    setRequiresId("");
  };

  const renderAgentChip = (agent) => (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "#ffffff08",
        border: "1px solid #ffffff12",
        borderRadius: 999,
        padding: "5px 12px 5px 10px",
      }}
    >
      <span
        style={{
          color: agent.color,
          fontSize: 15,
          lineHeight: 1,
        }}
      >
        {agent.icon}
      </span>
      <span
        style={{
          fontFamily: FONT_HEAD,
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {agent.name}
      </span>
    </div>
  );

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
              AGENT DEPENDENCIES
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Define execution order rules
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

        {/* Dependency graph */}
        <label style={SECTION_LABEL}>Active Rules</label>
        {entries.length === 0 ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffff44",
              fontSize: 13,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No dependencies yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {entries.map(([depId, reqs]) => {
              const dependent = agentById(agents, depId);
              return reqs
                .filter((rid) => agentById(agents, rid))
                .map((rid) => {
                  const required = agentById(agents, rid);
                  return (
                    <div
                      key={`${depId}->${rid}`}
                      style={{
                        background: "#07070f",
                        border: "1px solid #ffffff10",
                        borderRadius: 14,
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {renderAgentChip(dependent)}
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          color: "#ffffff55",
                          fontSize: 11,
                          letterSpacing: 0.5,
                        }}
                      >
                        requires
                      </span>
                      <span style={{ color: GOLD, fontSize: 16, lineHeight: 1 }}>→</span>
                      {renderAgentChip(required)}
                      <button
                        onClick={() => onRemove(depId, rid)}
                        style={{
                          marginLeft: "auto",
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
                  );
                });
            })}
          </div>
        )}

        {/* Add dependency form */}
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
            <label style={SECTION_LABEL}>If I run...</label>
            <select
              value={dependentId}
              onChange={(e) => {
                setDependentId(e.target.value);
                setError("");
              }}
              style={SELECT_BASE}
            >
              <option value="" style={{ background: "#0d0d1a" }}>
                Select agent…
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id} style={{ background: "#0d0d1a" }}>
                  {a.icon}  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={SECTION_LABEL}>...first run:</label>
            <select
              value={requiresId}
              onChange={(e) => {
                setRequiresId(e.target.value);
                setError("");
              }}
              style={SELECT_BASE}
            >
              <option value="" style={{ background: "#0d0d1a" }}>
                Select agent…
              </option>
              {agents
                .filter((a) => a.id !== dependentId)
                .map((a) => (
                  <option key={a.id} value={a.id} style={{ background: "#0d0d1a" }}>
                    {a.icon}  {a.name}
                  </option>
                ))}
            </select>
          </div>

          {error && (
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#F87171",
                fontSize: 12,
                marginBottom: 14,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!dependentId || !requiresId}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "none",
              fontFamily: FONT_HEAD,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: dependentId && requiresId ? "pointer" : "not-allowed",
              color: dependentId && requiresId ? "#07070f" : "#ffffff44",
              background:
                dependentId && requiresId
                  ? "linear-gradient(135deg, #F0C040, #f5d472)"
                  : "#ffffff0d",
            }}
          >
            ADD RULE
          </button>
        </div>

        {/* Info box */}
        <div
          style={{
            background: "#ffffff05",
            border: "1px solid #ffffff10",
            borderRadius: 14,
            padding: 14,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: GOLD, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>ℹ</span>
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffff77",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Dependencies automatically reorder agents in flows. In "Product Launch", if Email
            requires Market, Market always runs first.
          </div>
        </div>
      </div>
    </div>
  );
}
