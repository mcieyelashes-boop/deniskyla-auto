import { useState } from "react";

// results: array of { agentId, agentName, agentColor, agentIcon, task, output: string, timestamp: number }
// onClear: fn to clear all results
// onExport: fn(format) called with 'json' or 'pdf'
export default function OutputPanel({ results = [], onClear, onExport }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const copy = (id, text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => console.warn("Clipboard access denied"));
  };

  const relativeTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const renderOutput = (text) => {
    return text.split("\n").filter(Boolean).map((line, i) => {
      const isBullet =
        /^[•\-\*]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim());
      const content = line
        .trim()
        .replace(/^[•\-\*]\s/, "")
        .replace(/^\d+\.\s/, "");
      return isBullet ? (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#ffffff44", flexShrink: 0 }}>›</span>
          <span>{content}</span>
        </div>
      ) : (
        <div key={i} style={{ marginBottom: 4 }}>
          {line}
        </div>
      );
    });
  };

  const handleExport = (format) => {
    setExportOpen(false);
    if (onExport) onExport(format);
  };

  // ─── Shared inner content ──────────────────────────────────────────────────
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "16px 18px",
        borderBottom: "1px solid #ffffff0f",
        position: "relative",
      }}
    >
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          letterSpacing: 2,
          color: "#ffffff44",
        }}
      >
        OUTPUT
      </span>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "#07070f",
          background: "#F0C040",
          borderRadius: 999,
          padding: "1px 8px",
          fontWeight: 700,
        }}
      >
        {results.length}
      </span>

      <div style={{ flex: 1 }} />

      <button
        onClick={onClear}
        disabled={results.length === 0}
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 11,
          letterSpacing: 1,
          color: results.length === 0 ? "#ffffff22" : "#ffffff88",
          background: "transparent",
          border: "1px solid #ffffff1a",
          borderRadius: 8,
          padding: "5px 10px",
          cursor: results.length === 0 ? "default" : "pointer",
        }}
      >
        CLEAR
      </button>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setExportOpen((v) => !v)}
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 11,
            letterSpacing: 1,
            color: "#07070f",
            background: "#F0C040",
            border: "none",
            borderRadius: 8,
            padding: "5px 10px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ↓ EXPORT
        </button>
        {exportOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 50,
              background: "rgba(8,8,18,0.98)",
              border: "1px solid #ffffff1a",
              borderRadius: 10,
              overflow: "hidden",
              minWidth: 150,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            {[
              { label: "Export JSON", fmt: "json" },
              { label: "Export PDF", fmt: "pdf" },
            ].map((opt) => (
              <button
                key={opt.fmt}
                onClick={() => handleExport(opt.fmt)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#ffffffcc",
                  background: "transparent",
                  border: "none",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#ffffff0c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const emptyState = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40, opacity: 0.25 }}>◍</div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "#ffffff44",
          maxWidth: 220,
          lineHeight: 1.5,
        }}
      >
        No output yet. Run a flow to see results.
      </div>
    </div>
  );

  const resultCards = (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {results.map((r, idx) => {
        const id = r.agentId ? `${r.agentId}-${idx}` : idx;
        const color = r.agentColor || "#F0C040";
        return (
          <div
            key={id}
            style={{
              position: "relative",
              background: color + "0d",
              border: `1px solid ${color}26`,
              borderRadius: 14,
              padding: "14px 14px 16px",
            }}
          >
            <button
              onClick={() => copy(id, r.output)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: 1,
                color: copiedId === id ? "#34D399" : "#ffffff66",
                background: "#ffffff0c",
                border: "1px solid #ffffff1a",
                borderRadius: 7,
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              {copiedId === id ? "COPIED!" : "COPY"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 18, color }}>{r.agentIcon}</span>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#ffffffee",
                }}
              >
                {r.agentName}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color,
                }}
              >
                {r.task}
              </span>
              <span style={{ color: "#ffffff22" }}>·</span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  color: "#ffffff44",
                }}
              >
                {relativeTime(r.timestamp)}
              </span>
            </div>

            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#ffffffcc",
              }}
            >
              {renderOutput(r.output)}
            </div>
          </div>
        );
      })}
    </div>
  );

  const panelBody = (
    <>
      {header}
      {results.length === 0 ? emptyState : resultCards}
    </>
  );

  return (
    <>
      {/* Desktop fixed panel */}
      <aside
        className="output-panel output-panel--desktop"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          background: "rgba(8,8,18,0.97)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderLeft: "1px solid #ffffff0f",
          zIndex: 40,
        }}
      >
        {panelBody}
      </aside>

      {/* Mobile floating trigger */}
      <button
        className="output-panel--mobile-trigger"
        onClick={() => setMobileOpen(true)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 45,
          display: "none",
          alignItems: "center",
          gap: 8,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color: "#07070f",
          background: "#F0C040",
          border: "none",
          borderRadius: 999,
          padding: "12px 18px",
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(240,192,64,0.35)",
        }}
      >
        📋 Output ({results.length})
      </button>

      {/* Mobile bottom drawer */}
      {mobileOpen && (
        <div
          className="output-panel--mobile-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            className="output-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "82vh",
              display: "flex",
              flexDirection: "column",
              background: "rgba(8,8,18,0.97)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid #ffffff0f",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              animation: "outputSlideUp 0.28s ease",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: "#ffffff22",
                margin: "10px auto 0",
              }}
            />
            {panelBody}
          </div>
        </div>
      )}

      {/* Responsive + animation styles */}
      <style>{`
        @keyframes outputSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .output-panel--desktop { display: none !important; }
          .output-panel--mobile-trigger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
