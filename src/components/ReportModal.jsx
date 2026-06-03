import { useState, useMemo } from "react";
import { generateHTMLReport } from "../lib/reportGenerator";
import { callClaude } from "../lib/claude";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const KEYFRAMES = `
@keyframes reportSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes reportFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

const AI_SUMMARY_SYSTEM =
  "You are a business analyst. Create a concise executive summary of these agent results. Write exactly 3 short paragraphs. Do not use markdown headers or bullet points — just clear, readable prose.";

export default function ReportModal({
  results = [],
  flowName,
  ranAt,
  duration,
  activeWorkspace,
  onClose,
}) {
  const [tab, setTab] = useState("preview"); // "preview" | "summary"
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const workspaceName =
    (activeWorkspace && (activeWorkspace.name || activeWorkspace)) ||
    "Denis's Command Center";

  const htmlContent = useMemo(
    () =>
      generateHTMLReport({
        flowName: flowName || "Flow Report",
        ranAt: ranAt || Date.now(),
        duration: duration || 0,
        results,
        workspaceName,
      }),
    [flowName, ranAt, duration, results, workspaceName]
  );

  const downloadReport = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(flowName || "flow").replace(/\s+/g, "-")}-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
    // Give the new window a tick to render before printing
    win.onload = () => {
      win.focus();
      win.print();
    };
    // Fallback for browsers that don't fire onload on document.write
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {}
    }, 500);
  };

  const generateSummary = async () => {
    setTab("summary");
    if (summary || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const userMsg = JSON.stringify(
        results.map((r) => ({
          agent: r.agentName,
          task: r.task,
          output: r.output,
        }))
      );
      const text = await callClaude(AI_SUMMARY_SYSTEM, userMsg);
      setSummary((text || "").trim());
    } catch (e) {
      setSummaryError(e.message || "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const summaryParagraphs = summary
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

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
          maxWidth: 680,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          animation: "reportSlideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
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
              AI REPORT
            </h2>
            <div
              style={{
                fontFamily: FONT_BODY,
                color: "#ffffff66",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Generate shareable report
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

        {/* ── TABS ── */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "14px 28px 0",
            flexShrink: 0,
          }}
        >
          {[
            { id: "preview", label: "PREVIEW" },
            { id: "summary", label: "AI SUMMARY" },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() =>
                  t.id === "summary" ? generateSummary() : setTab("preview")
                }
                style={{
                  background: active ? "#F0C04018" : "transparent",
                  border: `1px solid ${active ? "#F0C04055" : "#ffffff12"}`,
                  borderRadius: 10,
                  padding: "8px 16px",
                  color: active ? "#F0C040" : "#ffffff77",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: 1,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "18px 28px", overflowY: "auto", flex: 1 }}>
          {tab === "preview" ? (
            <iframe
              title="report-preview"
              srcDoc={htmlContent}
              style={{
                height: 480,
                width: "100%",
                border: "none",
                borderRadius: 10,
                background: "#07070f",
                animation: "reportFadeIn 0.25s ease",
              }}
            />
          ) : (
            <div style={{ animation: "reportFadeIn 0.25s ease" }}>
              {summaryLoading && (
                <div
                  style={{
                    color: "#F0C040",
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                    padding: "40px 0",
                    textAlign: "center",
                  }}
                >
                  ✦ Generating executive summary…
                </div>
              )}

              {!summaryLoading && summaryError && (
                <div
                  style={{
                    background: "#ef444412",
                    border: "1px solid #ef444433",
                    borderRadius: 10,
                    color: "#ef4444",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    padding: "12px 14px",
                  }}
                >
                  ⚠ {summaryError}
                </div>
              )}

              {!summaryLoading && !summaryError && summaryParagraphs.length > 0 && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {summaryParagraphs.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#ffffff05",
                        border: "1px solid #ffffff10",
                        borderRadius: 12,
                        padding: "16px 18px",
                        color: "#ffffffcc",
                        fontFamily: FONT_BODY,
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}

              {!summaryLoading &&
                !summaryError &&
                summaryParagraphs.length === 0 && (
                  <div
                    style={{
                      color: "#ffffff55",
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      padding: "40px 0",
                      textAlign: "center",
                    }}
                  >
                    No summary yet.
                  </div>
                )}
            </div>
          )}
        </div>

        {/* ── ACTIONS ── */}
        <div
          style={{
            padding: "16px 28px 24px",
            borderTop: "1px solid #ffffff0d",
            flexShrink: 0,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={downloadReport}
            style={{
              flex: 1,
              minWidth: 140,
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontFamily: FONT_HEAD,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.5,
              cursor: "pointer",
              background: "linear-gradient(135deg, #F0C040, #f5d472)",
              color: "#07070f",
            }}
          >
            ⬇ DOWNLOAD HTML
          </button>
          <button
            onClick={printReport}
            style={{
              flex: 1,
              minWidth: 120,
              border: "1px solid #ffffff15",
              borderRadius: 12,
              padding: "12px",
              fontFamily: FONT_HEAD,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: "pointer",
              background: "#ffffff08",
              color: "#fff",
            }}
          >
            🖨 PRINT
          </button>
          <button
            onClick={generateSummary}
            style={{
              flex: 1,
              minWidth: 140,
              border: "1px solid #F0C04044",
              borderRadius: 12,
              padding: "12px",
              fontFamily: FONT_HEAD,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: "pointer",
              background: "#F0C04014",
              color: "#F0C040",
            }}
          >
            ✦ AI SUMMARY
          </button>
        </div>
      </div>
    </div>
  );
}
