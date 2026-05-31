import { useState, useMemo } from "react";
import { AGENT_TEMPLATES, TEMPLATE_CATEGORIES } from "../config/templates";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const KEYFRAMES = `
@keyframes templatesSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.tpl-scrollrow::-webkit-scrollbar { height: 0; }
.tpl-body::-webkit-scrollbar { width: 8px; }
.tpl-body::-webkit-scrollbar-thumb { background: #ffffff1a; border-radius: 8px; }
`;

export default function TemplatesModal({ onInstall, installedIds = [], onClose }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [searchFocused, setSearchFocused] = useState(false);

  const installedSet = useMemo(() => new Set(installedIds), [installedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AGENT_TEMPLATES.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (!q) return true;
      const haystack = [
        t.name,
        t.desc,
        t.category,
        ...(t.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 320,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <style>{KEYFRAMES}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          animation: "templatesSlideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
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
          }}
        >
          <div
            style={{
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
                AGENT TEMPLATES
              </h2>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  color: "#ffffff66",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Install pre-built specialist agents
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

          {/* Search */}
          <div style={{ marginTop: 18, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                opacity: 0.5,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search by name, tag, or category..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#ffffff08",
                border: `1px solid ${searchFocused ? "#F0C04066" : "#ffffff15"}`,
                borderRadius: 12,
                padding: "11px 14px 11px 38px",
                color: "#fff",
                fontFamily: FONT_BODY,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
            />
          </div>

          {/* Category tabs */}
          <div
            className="tpl-scrollrow"
            style={{
              display: "flex",
              gap: 8,
              marginTop: 16,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {TEMPLATE_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    flexShrink: 0,
                    background: active ? "#F0C04022" : "#ffffff08",
                    border: `1px solid ${active ? "#F0C040aa" : "#ffffff12"}`,
                    color: active ? "#F0C040" : "#ffffff88",
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontFamily: FONT_MONO,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BODY GRID ── */}
        <div
          className="tpl-body"
          style={{
            padding: 20,
            overflowY: "auto",
            flex: 1,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                fontFamily: FONT_MONO,
                color: "#ffffff44",
                fontSize: 13,
              }}
            >
              No templates match "{query}"
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14,
              }}
            >
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  installed={installedSet.has(t.id)}
                  onInstall={onInstall}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, installed, onInstall }) {
  const { color, icon, name, category, desc, tags = [], capabilities = [], popular } = template;

  return (
    <div
      style={{
        background: "#07070f",
        border: `1px solid ${color}26`,
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Top row: icon + name + category badge */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `${color}1a`,
            border: `1px solid ${color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
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
              {name}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                color: color,
                background: `${color}14`,
                border: `1px solid ${color}33`,
                borderRadius: 6,
                padding: "2px 7px",
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {category}
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              color: "#ffffff77",
              fontSize: 12,
              marginTop: 4,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {desc}
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginTop: 12,
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: FONT_MONO,
                color: "#ffffff66",
                background: "#ffffff08",
                border: "1px solid #ffffff10",
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 10,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginTop: 8,
          }}
        >
          {capabilities.map((cap) => (
            <span
              key={cap}
              style={{
                fontFamily: FONT_MONO,
                color: color,
                background: `${color}12`,
                border: `1px solid ${color}33`,
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 10,
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: popular badge + install button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid #ffffff0a",
        }}
      >
        <div style={{ minHeight: 1 }}>
          {popular && (
            <span
              style={{
                fontFamily: FONT_MONO,
                color: "#F0C040",
                background: "#F0C04014",
                border: "1px solid #F0C04033",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              ⭐ Popular
            </span>
          )}
        </div>

        <button
          onClick={() => !installed && onInstall(template)}
          disabled={installed}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "9px 18px",
            fontFamily: FONT_HEAD,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.3,
            cursor: installed ? "default" : "pointer",
            whiteSpace: "nowrap",
            transition: "opacity 0.15s ease",
            ...(installed
              ? {
                  background: "#ffffff0d",
                  color: "#ffffff55",
                  border: "1px solid #ffffff15",
                }
              : {
                  background: "linear-gradient(135deg, #F0C040, #f5d472)",
                  color: "#07070f",
                }),
          }}
        >
          {installed ? "✓ INSTALLED" : "INSTALL"}
        </button>
      </div>
    </div>
  );
}
