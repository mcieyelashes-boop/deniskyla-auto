import { useState, useRef, useEffect } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

// A single overflow menu that collapses the dozens of toolbar actions into one
// grouped dropdown. Items are passed in from App so all gating/state stays there.
//
// item: { id, label, icon, onClick, group, badge?, active?, locked?, accent? }
//   group: section header label (items are rendered in the order groups appear)
//   hidden items should be filtered out by the caller before passing in.
export default function ToolbarMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Preserve insertion order of groups.
  const groups = [];
  const byGroup = {};
  for (const it of items) {
    const g = it.group || "More";
    if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
    byGroup[g].push(it);
  }

  const activeCount = items.filter((i) => i.active || i.badge).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: open ? "#F0C04018" : "#ffffff08",
          border: `1px solid ${open ? "#F0C04044" : "#ffffff15"}`,
          color: open ? "#F0C040" : "#ffffffcc",
          padding: "7px 14px", borderRadius: 9, cursor: "pointer",
          fontFamily: FONT_MONO, fontSize: 11, whiteSpace: "nowrap",
        }}
      >
        ☰ TOOLS
        {activeCount > 0 && (
          <span style={{
            background: "#F0C040", color: "#07070f", borderRadius: 999,
            minWidth: 16, height: 16, padding: "0 4px", fontSize: 9, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>{activeCount}</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 250,
            width: 280, maxHeight: "70vh", overflowY: "auto",
            background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 14,
            padding: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          {groups.map((g, gi) => (
            <div key={g} style={{ marginBottom: gi === groups.length - 1 ? 0 : 6 }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5,
                color: "#ffffff33", textTransform: "uppercase",
                padding: "8px 10px 4px",
              }}>{g}</div>
              {byGroup[g].map((it) => (
                <button
                  key={it.id}
                  onClick={() => { it.onClick?.(); if (!it.keepOpen) setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    background: it.active ? `${it.accent || "#F0C040"}18` : "transparent",
                    border: "none", borderRadius: 9, padding: "9px 10px", cursor: "pointer",
                    color: it.active ? (it.accent || "#F0C040") : "#ffffffcc",
                    fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, textAlign: "left",
                  }}
                  onMouseEnter={(e) => { if (!it.active) e.currentTarget.style.background = "#ffffff0a"; }}
                  onMouseLeave={(e) => { if (!it.active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ width: 18, textAlign: "center", fontSize: 14, flexShrink: 0 }}>{it.icon}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.label}{it.locked ? " 🔒" : ""}
                  </span>
                  {it.badge != null && it.badge !== "" && (
                    <span style={{
                      background: `${it.accent || "#F0C040"}22`, color: it.accent || "#F0C040",
                      borderRadius: 999, padding: "1px 8px", fontFamily: FONT_MONO, fontSize: 10, flexShrink: 0,
                    }}>{it.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
