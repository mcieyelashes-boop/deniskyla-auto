import { useState, useMemo } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const PUBLIC_BASE = "https://deniskyla-auto.vercel.app";

const KEYFRAMES = `
@keyframes shareSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes shareCheckPop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
`;

function formatToday() {
  try {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ShareModal({ results = [], flowName, onClose }) {
  const defaultTitle = useMemo(() => {
    const base = flowName || "Flow Results";
    return `${base} — ${formatToday()}`;
  }, [flowName]);

  const [title, setTitle] = useState(defaultTitle);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareId, setShareId] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);

  const agentCount = results.length;
  const previewResults = results.slice(0, 2);

  async function createShare() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || defaultTitle,
          flowName,
          results,
          createdBy: "Denis",
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const id = data.id;
      setShareId(id);
      // Always present the canonical public URL regardless of host
      setShareUrl(`${PUBLIC_BASE}/share/${id}`);
    } catch (e) {
      setError(e.message || "Failed to create share link");
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy failed — select the URL manually");
    }
  }

  function createAnother() {
    setShareUrl("");
    setShareId("");
    setCopied(false);
    setError("");
    setTitle(defaultTitle);
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
          maxWidth: 480,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          animation: "shareSlideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
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
              SHARE RESULTS
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Create a read-only link
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
          {!shareUrl ? (
            <>
              {/* Preview card */}
              <div
                style={{
                  background: "#07070f",
                  border: "1px solid #ffffff12",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_HEAD,
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {flowName || "Flow Results"}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      color: "#F0C040",
                      background: "#F0C04014",
                      border: "1px solid #F0C04033",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {agentCount} {agentCount === 1 ? "agent" : "agents"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {previewResults.map((r) => (
                    <div
                      key={r.id || r.agentId}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          color: r.agentColor || "#ffffff88",
                          fontSize: 14,
                          flexShrink: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {r.agentIcon || "•"}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontFamily: FONT_MONO,
                            color: r.agentColor || "#ffffffaa",
                            fontSize: 11,
                            marginBottom: 2,
                          }}
                        >
                          {r.agentName || r.agentId}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT_BODY,
                            color: "#ffffff77",
                            fontSize: 12,
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {(r.output || "").slice(0, 50)}
                          {(r.output || "").length > 50 ? "…" : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  {agentCount > 2 && (
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        color: "#ffffff44",
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      + {agentCount - 2} more
                    </div>
                  )}
                </div>
              </div>

              {/* Title input */}
              <div
                style={{
                  fontFamily: FONT_MONO,
                  color: "#ffffff44",
                  fontSize: 10,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                TITLE
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                placeholder="Give this share a title..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#ffffff08",
                  border: `1px solid ${titleFocused ? "#F0C04066" : "#ffffff15"}`,
                  borderRadius: 12,
                  padding: "11px 14px",
                  color: "#fff",
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.15s ease",
                  marginBottom: 18,
                }}
              />

              {error && (
                <div
                  style={{
                    background: "#ef444412",
                    border: "1px solid #ef444433",
                    borderRadius: 10,
                    color: "#ef4444",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              <button
                onClick={createShare}
                disabled={loading}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontFamily: FONT_HEAD,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  background: "linear-gradient(135deg, #F0C040, #f5d472)",
                  color: "#07070f",
                  transition: "opacity 0.15s ease",
                }}
              >
                {loading ? "CREATING…" : "CREATE SHARE LINK"}
              </button>
            </>
          ) : (
            <>
              {/* Success state */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 20,
                  animation: "shareCheckPop 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 8 }}>✓</div>
                <div
                  style={{
                    fontFamily: FONT_HEAD,
                    color: "#34D399",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Share link created!
                </div>
              </div>

              {/* URL display + copy */}
              <div
                style={{
                  fontFamily: FONT_MONO,
                  color: "#ffffff44",
                  fontSize: 10,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                SHARE URL
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "stretch",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "#07070f",
                    border: "1px solid #ffffff15",
                    borderRadius: 12,
                    padding: "11px 14px",
                    color: "#ffffffcc",
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {shareUrl}
                </div>
                <button
                  onClick={copyUrl}
                  style={{
                    flexShrink: 0,
                    borderRadius: 12,
                    padding: "0 18px",
                    fontFamily: FONT_HEAD,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: copied
                      ? "#34D39922"
                      : "linear-gradient(135deg, #F0C040, #f5d472)",
                    color: copied ? "#34D399" : "#07070f",
                    border: copied ? "1px solid #34D39955" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
              </div>

              {/* Actions row: Open + views */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "none",
                    background: "#ffffff08",
                    border: "1px solid #ffffff15",
                    borderRadius: 10,
                    padding: "9px 16px",
                    fontFamily: FONT_HEAD,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Open →
                </a>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    color: "#ffffff66",
                    fontSize: 12,
                  }}
                >
                  0 views
                </span>
              </div>

              {/* QR hint */}
              <div
                style={{
                  background: "#07070f",
                  border: "1px solid #ffffff10",
                  borderRadius: 14,
                  padding: 16,
                  textAlign: "center",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    color: "#ffffff66",
                    fontSize: 11,
                    letterSpacing: 1,
                    marginBottom: 6,
                  }}
                >
                  ▦ SCAN TO SHARE
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    color: "#ffffffaa",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {shareUrl}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: "#ef444412",
                    border: "1px solid #ef444433",
                    borderRadius: 10,
                    color: "#ef4444",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              {/* Create another */}
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={createAnother}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F0C040",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  Create Another
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
