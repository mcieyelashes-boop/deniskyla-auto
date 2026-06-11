import { useState } from "react";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";
const GOLD = "#F0C040";

const KEYFRAMES = `
@keyframes connectSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.connect-body::-webkit-scrollbar { width: 8px; }
.connect-body::-webkit-scrollbar-thumb { background: #ffffff1a; border-radius: 8px; }
`;

const LABEL = {
  fontFamily: FONT_MONO,
  color: "#ffffff44",
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 8,
  display: "block",
};

const INPUT = {
  background: "#ffffff08",
  border: "1px solid #ffffff15",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#fff",
  fontFamily: FONT_BODY,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

// Normalize a user-typed URL → adds https:// if no scheme. Returns "" if blank.
export function normalizeUrl(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s.replace(/^\/+/, "")}`;
}

function isValidUrl(raw) {
  try {
    const u = new URL(normalizeUrl(raw));
    return !!u.hostname && u.hostname.includes(".");
  } catch {
    return false;
  }
}

// What each agent does once a site is connected.
const PERKS = [
  { icon: "🔍", color: "#22D3EE", name: "SEO Specialist", desc: "On-page audit of your live page — title, meta, headings, schema, score." },
  { icon: "🤖", color: "#A78BFA", name: "GEO Optimizer", desc: "Checks if your brand gets cited by AI engines & how to win mentions." },
  { icon: "⌥", color: "#38BDF8", name: "Website Dev", desc: "Performance & technical fixes targeted at your real URL." },
  { icon: "✦", color: "#FBBF24", name: "All agents", desc: "Stay on-brand — your project name is injected into every task." },
];

export default function ConnectSiteModal({ site, onSave, onClear, onRunAudit, onClose, busy }) {
  const [url, setUrl] = useState(site?.url || "");
  const [brand, setBrand] = useState(site?.brand || "");
  const [touched, setTouched] = useState(false);

  const valid = isValidUrl(url);
  const connected = !!site?.url;

  const save = () => {
    if (!valid) { setTouched(true); return; }
    onSave({ url: normalizeUrl(url), brand: brand.trim() });
  };

  const saveAndAudit = () => {
    if (!valid) { setTouched(true); return; }
    onSave({ url: normalizeUrl(url), brand: brand.trim() });
    onRunAudit({ url: normalizeUrl(url), brand: brand.trim() });
  };

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
      <style>{KEYFRAMES}</style>
      <div
        className="connect-body"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          padding: 28,
          maxHeight: "88vh",
          overflowY: "auto",
          boxSizing: "border-box",
          animation: "connectSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: FONT_HEAD, color: "#fff", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 0.5 }}>
              CONNECT YOUR SITE
            </h2>
            <div style={{ fontFamily: FONT_BODY, color: "#ffffff66", fontSize: 12, marginTop: 4 }}>
              Point your agents at your own project
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 8, color: "#ffffff88", width: 32, height: 32, fontSize: 18, cursor: "pointer", lineHeight: 1, fontFamily: FONT_BODY }}
          >
            ×
          </button>
        </div>

        {/* Connected badge */}
        {connected && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#34D39912",
              border: "1px solid #34D39933",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 18,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#34D399", boxShadow: "0 0 8px #34D399", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {site.brand || site.url}
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#34D399cc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {site.url}
              </div>
            </div>
          </div>
        )}

        {/* URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Project URL</label>
          <input
            value={url}
            placeholder="yourbrand.com"
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            style={{
              ...INPUT,
              fontFamily: FONT_MONO,
              fontSize: 13,
              border: touched && !valid ? "1px solid #F8717155" : "1px solid #ffffff15",
            }}
          />
          {touched && !valid && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#F87171", marginTop: 6 }}>
              Enter a valid URL (e.g. yourbrand.com)
            </div>
          )}
        </div>

        {/* Brand */}
        <div style={{ marginBottom: 20 }}>
          <label style={LABEL}>Brand / Project name <span style={{ color: "#ffffff22" }}>(optional)</span></label>
          <input
            value={brand}
            placeholder="Your Brand"
            onChange={(e) => setBrand(e.target.value)}
            style={INPUT}
          />
        </div>

        {/* What it unlocks */}
        <div style={{ marginBottom: 22 }}>
          <label style={LABEL}>What this unlocks</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PERKS.map((p) => (
              <div key={p.name} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: `${p.color}1f`, border: `1px solid ${p.color}3a`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}
                >
                  {p.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#ffffff66", lineHeight: 1.45 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={saveAndAudit}
            disabled={busy}
            style={{
              flex: "1 1 220px",
              background: busy ? "#ffffff12" : "linear-gradient(135deg, #F0C040, #f5d472)",
              color: busy ? "#ffffff66" : "#07070f",
              border: "none",
              borderRadius: 12,
              padding: "13px 18px",
              fontFamily: FONT_HEAD,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.3,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Running…" : "⚡ Save & run full audit"}
          </button>
          <button
            onClick={save}
            disabled={busy}
            style={{
              flex: "0 1 auto",
              background: "#ffffff0a",
              color: "#fff",
              border: "1px solid #ffffff20",
              borderRadius: 12,
              padding: "13px 18px",
              fontFamily: FONT_HEAD,
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Save
          </button>
        </div>

        {connected && (
          <button
            onClick={() => { onClear(); onClose(); }}
            style={{
              marginTop: 14,
              width: "100%",
              background: "transparent",
              color: "#F8717199",
              border: "none",
              fontFamily: FONT_BODY,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Disconnect site
          </button>
        )}

        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#ffffff44", marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
          Saved per workspace, on this device. The full audit chains the SEO + GEO agents against your live URL.
        </div>
      </div>
    </div>
  );
}
