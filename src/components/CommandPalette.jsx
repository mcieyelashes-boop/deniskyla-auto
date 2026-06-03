import { useState, useEffect, useRef, useMemo } from "react";

// ─── STATIC COMMANDS ────────────────────────────────────────────────────────────

const COMMANDS = [
  { id: "run-launch", label: "Run Product Launch", icon: "🚀", category: "Flows", action: "run-flow", flowId: "launch" },
  { id: "run-growth", label: "Run Growth Sprint", icon: "📈", category: "Flows", action: "run-flow", flowId: "growth" },
  { id: "run-content", label: "Run Content Blitz", icon: "✦", category: "Flows", action: "run-flow", flowId: "content_blitz" },
  { id: "open-analytics", label: "Open Analytics", icon: "◎", category: "Panels", action: "open", panel: "analytics" },
  { id: "open-history", label: "Open History", icon: "◷", category: "Panels", action: "open", panel: "history" },
  { id: "open-templates", label: "Browse Templates", icon: "✦", category: "Panels", action: "open", panel: "templates" },
  { id: "open-versions", label: "Flow Versions", icon: "◑", category: "Panels", action: "open", panel: "versions" },
  { id: "open-scheduler", label: "Open Scheduler", icon: "⏱", category: "Panels", action: "open", panel: "scheduler" },
  { id: "add-agent", label: "Add Custom Agent", icon: "⊕", category: "Agents", action: "open", panel: "addAgent" },
  { id: "open-memory", label: "CEO Memory", icon: "🧠", category: "Settings", action: "open", panel: "memory" },
  { id: "toggle-theme", label: "Toggle Theme", icon: "☀", category: "Settings", action: "toggle-theme" },
  { id: "reset-all", label: "Reset All Agents", icon: "⊘", category: "Actions", action: "reset" },
  { id: "open-suggest", label: "AI Flow Suggester", icon: "✦", category: "AI", action: "toggle", panel: "suggest" },
  { id: "export-json", label: "Export Results JSON", icon: "↓", category: "Export", action: "export", format: "json" },
];

// ─── HIGHLIGHT MATCH ─────────────────────────────────────────────────────────────

function HighlightedLabel({ label, query }) {
  if (!query) return <>{label}</>;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{label}</>;
  const before = label.slice(0, idx);
  const match = label.slice(idx, idx + query.length);
  const after = label.slice(idx + query.length);
  return (
    <>
      {before}
      <span style={{ color: "#F0C040", fontWeight: 700 }}>{match}</span>
      {after}
    </>
  );
}

// ─── MAIN PALETTE ────────────────────────────────────────────────────────────────

export default function CommandPalette({ onCommand, flows, agents, onClose }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Build full command list (static + dynamic agents + dynamic flows)
  const allCommands = useMemo(() => {
    const agentList = Array.isArray(agents) ? agents : [];
    const flowList = Array.isArray(flows) ? flows : [];

    const agentCmds = agentList.map((a) => ({
      id: `run-agent-${a.id}`,
      label: `Run ${a.name} alone`,
      icon: a.icon || "▸",
      category: "Agents",
      action: "run-agent",
      agentId: a.id,
    }));

    const flowCmds = flowList.map((f) => ({
      id: `run-flow-${f.id}`,
      label: `Run ${f.name || f.label || f.id}`,
      icon: f.icon || "⚡",
      category: "Flows",
      action: "run-flow",
      flowId: f.id,
    }));

    // Dedupe flows already present in static COMMANDS by flowId
    const staticFlowIds = new Set(
      COMMANDS.filter((c) => c.action === "run-flow").map((c) => c.flowId)
    );
    const extraFlowCmds = flowCmds.filter((c) => !staticFlowIds.has(c.flowId));

    return [...COMMANDS, ...extraFlowCmds, ...agentCmds];
  }, [agents, flows]);

  // Filter by query (label + category, case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // ─── Cmd/Ctrl+K toggle + Escape close (global listener) ───
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus input + reset state when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep selection in bounds when filtered list changes
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selected];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setSelected(0);
    if (onClose) onClose();
  };

  const fire = (cmd) => {
    if (!cmd) return;
    if (onCommand) onCommand(cmd);
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (filtered.length ? (s + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) =>
        filtered.length ? (s - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      fire(filtered[selected]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  // Reset itemRefs each render so indices stay aligned with filtered list
  itemRefs.current = [];

  return (
    <>
      <style>{`
        @keyframes paletteFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes paletteScaleIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Fullscreen overlay w/ blur backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3,3,9,0.6)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 200,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "14vh",
          animation: "paletteFadeIn 0.15s ease",
        }}
      >
        {/* Centered modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "92%",
            maxWidth: 560,
            maxHeight: "66vh",
            background: "rgba(10,10,20,0.98)",
            border: "1px solid #ffffff14",
            borderRadius: 16,
            boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "paletteScaleIn 0.18s ease",
          }}
        >
          {/* Search input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "16px 18px",
              borderBottom: "1px solid #ffffff0f",
            }}
          >
            <span
              style={{
                color: "#F0C040",
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ◎
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Type a command or search..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
              }}
            />
            <span
              style={{
                color: "#ffffff44",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                border: "1px solid #ffffff1a",
                borderRadius: 6,
                padding: "3px 7px",
                flexShrink: 0,
              }}
            >
              ESC
            </span>
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 0",
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "32px 18px",
                  textAlign: "center",
                  color: "#ffffff44",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                }}
              >
                No commands match "{query}"
              </div>
            ) : (
              filtered.map((cmd, i) => {
                const isSelected = i === selected;
                const prev = filtered[i - 1];
                const showDivider = i > 0 && prev && prev.category !== cmd.category;

                return (
                  <div key={cmd.id}>
                    {showDivider && (
                      <div
                        style={{
                          height: 1,
                          background: "#ffffff0a",
                          margin: "6px 18px",
                        }}
                      />
                    )}
                    <div
                      ref={(el) => (itemRefs.current[i] = el)}
                      onClick={() => fire(cmd)}
                      onMouseEnter={() => setSelected(i)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 18px",
                        cursor: "pointer",
                        background: isSelected ? "#F0C04012" : "transparent",
                        borderLeft: isSelected
                          ? "2px solid #F0C040"
                          : "2px solid transparent",
                        transition: "background 0.12s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          width: 22,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {cmd.icon}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          color: isSelected ? "#fff" : "#ffffffcc",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <HighlightedLabel label={cmd.label} query={query} />
                      </span>
                      <span
                        style={{
                          color: "#ffffff44",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 9.5,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                          flexShrink: 0,
                        }}
                      >
                        {cmd.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "9px 18px",
              borderTop: "1px solid #ffffff0f",
              color: "#ffffff44",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9.5,
            }}
          >
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
            <span style={{ marginLeft: "auto" }}>{filtered.length} commands</span>
          </div>
        </div>
      </div>
    </>
  );
}
