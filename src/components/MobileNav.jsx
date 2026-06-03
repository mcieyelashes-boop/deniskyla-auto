// MobileNav.jsx
// Bottom tab navigation, visible only on mobile (<= 768px).
// Props: { activeTab, onTabChange, agentsDoneCount, hasResults, notifCount }
//   activeTab       — current tab id
//   onTabChange     — fn(tabId) called when a tab is pressed
//   agentsDoneCount — green count badge shown on Output tab
//   hasResults      — bool; show Output badge only when there are results
//   notifCount      — red dot/count badge shown on History tab

const TABS = [
  { id: "dashboard", icon: "◎", label: "DASH" },
  { id: "ceo", icon: "◈", label: "CEO" },
  { id: "agents", icon: "✦", label: "AGENTS" },
  { id: "output", icon: "📋", label: "OUTPUT" },
  { id: "history", icon: "◷", label: "HISTORY" },
];

export default function MobileNav({
  activeTab = "dashboard",
  onTabChange,
  agentsDoneCount = 0,
  hasResults = false,
  notifCount = 0,
}) {
  return (
    <>
      <style>{`
        .mobile-nav { display: none; }
        @media (max-width: 768px) { .mobile-nav { display: flex !important; } }
        .mobile-nav-spacer { display: none; }
        @media (max-width: 768px) { .mobile-nav-spacer { display: block !important; height: 60px; } }
      `}</style>

      <nav
        className="mobile-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "rgba(7,7,15,0.97)",
          borderTop: "1px solid #ffffff0f",
          display: "flex",
          zIndex: 200,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          const showOutputBadge = tab.id === "output" && hasResults && agentsDoneCount > 0;
          const showHistoryBadge = tab.id === "history" && notifCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange && onTabChange(tab.id)}
              style={{
                flex: "1 1 0",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px 0 0",
                color: active ? "#F0C040" : "#ffffff66",
                transition: "color 0.2s",
              }}
            >
              {/* Icon + badges */}
              <span style={{ position: "relative", fontSize: 20, lineHeight: 1 }}>
                {tab.icon}

                {showOutputBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -12,
                      minWidth: 14,
                      height: 14,
                      padding: "0 3px",
                      borderRadius: 999,
                      background: "#34D399",
                      color: "#07070f",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: "14px",
                      textAlign: "center",
                    }}
                  >
                    {agentsDoneCount}
                  </span>
                )}

                {showHistoryBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: "0 0 6px #ef4444",
                    }}
                  />
                )}
              </span>

              {/* Label */}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1,
                }}
              >
                {tab.label}
              </span>

              {/* Active underline bar */}
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: active ? 22 : 0,
                  height: 3,
                  borderRadius: 999,
                  background: "#F0C040",
                  transition: "width 0.2s",
                }}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}

// Spacer to reserve 60px at the bottom of content so the fixed nav
// never covers the last elements. Render once near the end of the page.
export function MobileNavSpacer() {
  return <div className="mobile-nav-spacer" />;
}
