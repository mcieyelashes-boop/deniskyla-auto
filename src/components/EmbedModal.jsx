import { useState, useMemo } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const PUBLIC_BASE = "https://deniskyla-auto.vercel.app";

const KEYFRAMES = `
@keyframes embedSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

const TABS = [
  { id: "iframe", label: "iFrame" },
  { id: "script", label: "Script" },
  { id: "react", label: "React" },
];

export default function EmbedModal({ shareId, onClose }) {
  const [theme, setTheme] = useState("dark");
  const [compact, setCompact] = useState(false);
  const [activeTab, setActiveTab] = useState("iframe");
  const [copied, setCopied] = useState(false);

  const sid = shareId || "";

  // Build the embed URL with the selected options.
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({ shareId: sid, theme });
    if (compact) params.set("compact", "true");
    return `${PUBLIC_BASE}/api/embed?${params.toString()}`;
  }, [sid, theme, compact]);

  // Code snippet for each embed format.
  const snippets = useMemo(() => {
    const compactAttr = compact ? ' data-compact="true"' : "";
    return {
      iframe: `<iframe src="${embedUrl}" width="100%" height="${compact ? 200 : 320}" frameborder="0" style="border:none;border-radius:12px;overflow:hidden"></iframe>`,
      script: `<script src="${embedUrl}"${compactAttr} async></script>`,
      react: `import { EmbedWidget } from "@agenticos/embed";\n\n<EmbedWidget shareId="${sid}" theme="${theme}"${compact ? " compact" : ""} />`,
    };
  }, [embedUrl, sid, theme, compact]);

  const currentCode = snippets[activeTab];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 340,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <style>{KEYFRAMES}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          animation: "embedSlideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: "26px 28px 18px",
            borderBottom: "1px solid #ffffff0d",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: FONT_HEAD,
                color: "#fff",
                fontSize: 24,
                fontWeight: 800,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              EMBED WIDGET
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Add live agent status to any website
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#ffffff08",
              border: "1px solid #ffffff15",
              borderRadius: 8,
              color: "#ffffff88",
              width: 34,
              height: 34,
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
              fontFamily: FONT_BODY,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {!sid && (
            <div
              style={{
                background: "#ef444412",
                border: "1px solid #ef444433",
                borderRadius: 10,
                color: "#ef4444",
                fontFamily: FONT_MONO,
                fontSize: 12,
                padding: "10px 12px",
                marginBottom: 18,
              }}
            >
              ⚠ No shareId — create a share link first, then embed it.
            </div>
          )}

          {/* Live preview */}
          <div
            style={{
              fontFamily: FONT_MONO,
              color: "#ffffff44",
              fontSize: 10,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            PREVIEW
          </div>
          <div
            style={{
              background: "#07070f",
              border: "1px solid #ffffff12",
              borderRadius: 16,
              padding: 8,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <iframe
              title="Embed widget preview"
              src={`/api/embed?shareId=${encodeURIComponent(sid)}&theme=${theme}${compact ? "&compact=true" : ""}`}
              width="100%"
              height="250"
              frameBorder="0"
              style={{ border: "none", borderRadius: 10, display: "block" }}
            />
          </div>

          {/* Options */}
          <div
            style={{
              fontFamily: FONT_MONO,
              color: "#ffffff44",
              fontSize: 10,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            OPTIONS
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {/* Theme toggle */}
            <div
              style={{
                display: "flex",
                background: "#ffffff08",
                border: "1px solid #ffffff15",
                borderRadius: 10,
                padding: 3,
                gap: 3,
              }}
            >
              {["dark", "light"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 16px",
                    fontFamily: FONT_HEAD,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    background:
                      theme === t ? "linear-gradient(135deg, #F0C040, #f5d472)" : "transparent",
                    color: theme === t ? "#07070f" : "#ffffff88",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Compact toggle */}
            <button
              onClick={() => setCompact((c) => !c)}
              style={{
                border: `1px solid ${compact ? "#F0C04066" : "#ffffff15"}`,
                borderRadius: 10,
                padding: "0 16px",
                fontFamily: FONT_HEAD,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: compact ? "#F0C04014" : "#ffffff08",
                color: compact ? "#F0C040" : "#ffffff88",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: `1.5px solid ${compact ? "#F0C040" : "#ffffff33"}`,
                  background: compact ? "#F0C040" : "transparent",
                  color: "#07070f",
                  fontSize: 11,
                  lineHeight: "12px",
                  textAlign: "center",
                  display: "inline-block",
                }}
              >
                {compact ? "✓" : ""}
              </span>
              Compact
            </button>
          </div>

          {/* Format tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 12,
              borderBottom: "1px solid #ffffff0d",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab.id ? "#F0C040" : "transparent"}`,
                  padding: "8px 14px",
                  fontFamily: FONT_HEAD,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: activeTab === tab.id ? "#F0C040" : "#ffffff66",
                  marginBottom: -1,
                  transition: "color 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div
            style={{
              position: "relative",
              background: "#07070f",
              border: "1px solid #ffffff15",
              borderRadius: 14,
              padding: "16px 16px 14px",
              marginBottom: 18,
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: FONT_MONO,
                fontSize: 12,
                lineHeight: 1.6,
                color: "#ffffffcc",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                paddingRight: 70,
              }}
            >
              {currentCode}
            </pre>
            <button
              onClick={copyCode}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                border: copied ? "1px solid #34D39955" : "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontFamily: FONT_HEAD,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: copied
                  ? "#34D39922"
                  : "linear-gradient(135deg, #F0C040, #f5d472)",
                color: copied ? "#34D399" : "#07070f",
                transition: "all 0.15s ease",
              }}
            >
              {copied ? "✓ COPIED" : "COPY"}
            </button>
          </div>

          {/* Full-width copy button */}
          <button
            onClick={copyCode}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "13px",
              fontFamily: FONT_HEAD,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.5,
              cursor: "pointer",
              background: copied
                ? "#34D39922"
                : "linear-gradient(135deg, #F0C040, #f5d472)",
              color: copied ? "#34D399" : "#07070f",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? "✓ EMBED CODE COPIED" : "COPY EMBED CODE"}
          </button>
        </div>
      </div>
    </div>
  );
}
