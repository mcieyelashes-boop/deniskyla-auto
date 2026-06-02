import { useState, useRef, useEffect } from "react";

const ICON_OPTIONS = ["◈", "◎", "✦", "⊕", "⬡", "⏱"];
const COLOR_OPTIONS = ["#F0C040", "#38BDF8", "#A78BFA", "#34D399", "#FB923C", "#ef4444"];

const mono = "'DM Mono', monospace";
const syne = "'Syne', sans-serif";
const sans = "'DM Sans', sans-serif";

export default function WorkspaceSwitcher({ workspaces, activeWorkspace, onSwitch, onAdd, onEdit }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const resetForm = () => {
    setName("");
    setIcon(ICON_OPTIONS[0]);
    setColor(COLOR_OPTIONS[0]);
    setCreating(false);
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd?.({ name: trimmed, icon, color });
    resetForm();
    setOpen(false);
  };

  const handleSwitch = (id) => {
    onSwitch?.(id);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Pill button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#ffffff08",
          border: "1px solid #ffffff15",
          borderRadius: 9,
          padding: "7px 14px",
          cursor: "pointer",
          fontFamily: mono,
          fontSize: 11,
          color: "#ffffffcc",
        }}
      >
        <span style={{ color: activeWorkspace?.color || "#F0C040", fontSize: 14 }}>
          {activeWorkspace?.icon || "◈"}
        </span>
        <span style={{ fontFamily: sans, fontSize: 12, color: "#fff" }}>
          {activeWorkspace?.name || "Workspace"}
        </span>
        <span style={{ color: "#ffffff44", fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: 200,
          marginTop: 6,
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 12,
          padding: 8,
          minWidth: 200,
          boxShadow: "0 16px 50px rgba(0,0,0,0.7)",
          animation: "fadeSlideIn 0.18s ease",
        }}>
          {/* Workspace list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {workspaces.map(w => {
              const isActive = w.id === activeWorkspace?.id;
              return (
                <div
                  key={w.id}
                  onClick={() => handleSwitch(w.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                    background: isActive ? `${w.color}14` : "transparent",
                    border: `1px solid ${isActive ? w.color + "44" : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#ffffff08"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ color: w.color, fontSize: 15, width: 18, textAlign: "center" }}>{w.icon}</span>
                  <span style={{
                    flex: 1,
                    fontFamily: sans,
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#fff" : "#ffffffaa",
                  }}>
                    {w.name}
                  </span>
                  {isActive && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#34D399", boxShadow: "0 0 8px #34D399",
                    }} />
                  )}
                  {onEdit && w.id !== "default" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(w); }}
                      style={{
                        background: "transparent", border: "none",
                        color: "#ffffff44", cursor: "pointer", fontSize: 11, padding: "0 2px",
                      }}
                    >
                      ✎
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ffffff10", margin: "8px 0" }} />

          {/* New workspace */}
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              style={{
                width: "100%",
                background: "#ffffff06",
                border: "1px solid #ffffff10",
                borderRadius: 9,
                padding: "9px 10px",
                cursor: "pointer",
                fontFamily: mono,
                fontSize: 11,
                color: "#F0C040",
                textAlign: "left",
              }}
            >
              + New Workspace
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "2px" }}>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                placeholder="Workspace name..."
                style={{
                  width: "100%",
                  background: "#ffffff08",
                  border: "1px solid #ffffff15",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#fff",
                  fontFamily: sans,
                  fontSize: 12,
                  outline: "none",
                }}
              />

              {/* Icon picker */}
              <div>
                <div style={{ color: "#ffffff44", fontSize: 9, fontFamily: mono, letterSpacing: 1, marginBottom: 6 }}>ICON</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {ICON_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setIcon(opt)}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: icon === opt ? `${color}22` : "#ffffff06",
                        border: `1px solid ${icon === opt ? color + "66" : "#ffffff12"}`,
                        color: icon === opt ? color : "#ffffff88",
                        cursor: "pointer", fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <div style={{ color: "#ffffff44", fontSize: 9, fontFamily: mono, letterSpacing: 1, marginBottom: 6 }}>COLOR</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setColor(opt)}
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: opt,
                        border: `2px solid ${color === opt ? "#fff" : "transparent"}`,
                        cursor: "pointer",
                        boxShadow: color === opt ? `0 0 10px ${opt}88` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  style={{
                    flex: 1,
                    background: name.trim() ? "linear-gradient(135deg, #F0C040, #F59E0B)" : "#ffffff10",
                    border: "none", borderRadius: 8, padding: "9px",
                    color: name.trim() ? "#000" : "#ffffff33",
                    fontFamily: syne, fontWeight: 800, fontSize: 12,
                    cursor: name.trim() ? "pointer" : "not-allowed",
                    letterSpacing: 0.5,
                  }}
                >
                  CREATE
                </button>
                <button
                  onClick={resetForm}
                  style={{
                    background: "#ffffff08", border: "1px solid #ffffff15",
                    borderRadius: 8, padding: "9px 12px",
                    color: "#ffffff88", cursor: "pointer",
                    fontFamily: mono, fontSize: 11,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
