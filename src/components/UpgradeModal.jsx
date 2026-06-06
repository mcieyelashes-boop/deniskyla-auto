import { PLANS, FEATURE_META, getPlan } from "../config/plans";

const FONT_HEAD = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'DM Mono', monospace";

const GOLD = "#F0C040";
const DARK = "#07070f";
const PRICING_URL = "https://deniskyla-landing.vercel.app/#pricing";

const KEYFRAMES = `
@keyframes upgradeSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes upgradeFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

// Friendly label for a limit value (Infinity -> "Unlimited", booleans -> ✓/✗)
function limitLabel(value) {
  if (value === Infinity) return "Unlimited";
  if (value === true) return "✓";
  if (value === false) return "—";
  return String(value);
}

// Shown when a user tries to use a locked feature or hits a usage limit.
// Props: { feature, currentPlan, reason, onClose, onUpgrade }
export default function UpgradeModal({
  feature,
  currentPlan = "free",
  reason,
  onClose,
  onUpgrade,
}) {
  const meta = feature ? FEATURE_META[feature] : null;
  const targetPlanId = meta?.minPlan || "pro";
  const current = getPlan(currentPlan);
  const target = getPlan(targetPlanId);

  const isLimit = reason === "limit";
  const dailyMax = current.limits.flowsPerDay;
  const dailyMaxLabel = dailyMax === Infinity ? "∞" : dailyMax;

  const heading = isLimit
    ? `You've reached your daily flow limit (${dailyMaxLabel}/${dailyMaxLabel}).`
    : meta
      ? `${meta.label} is a ${target.name}+ feature.`
      : "This feature requires an upgrade.";

  const upgradeLabel =
    targetPlanId === "enterprise" ? "Upgrade to Enterprise" : "Upgrade to Pro";

  // Rows to compare in the current vs target plan table.
  const compareRows = [
    { key: "flowsPerDay", label: "Flows / day" },
    { key: "customAgents", label: "Custom agents" },
    { key: "workspaces", label: "Workspaces" },
    { key: "scheduledFlows", label: "Scheduled flows" },
    { key: "templates", label: "Templates" },
    { key: "integrations", label: "Integrations" },
    { key: "webhooks", label: "Webhooks" },
    { key: "batchRunner", label: "Batch runner" },
    { key: "flowVersioning", label: "Flow versioning" },
    { key: "apiAccess", label: "API access" },
  ];

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade(targetPlanId);
    } else if (typeof window !== "undefined") {
      window.open(PRICING_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 500,
        display: "flex",
        padding: 20,
        boxSizing: "border-box",
        animation: "upgradeFadeIn 0.2s ease",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460,
          width: "100%",
          margin: "auto",
          background: "#0d0d1a",
          border: "1px solid #ffffff15",
          borderRadius: 20,
          padding: 32,
          maxHeight: "90vh",
          overflowY: "auto",
          boxSizing: "border-box",
          animation: "upgradeSlideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Header */}
        <h2
          style={{
            fontFamily: FONT_HEAD,
            color: "#fff",
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            letterSpacing: 0.5,
          }}
        >
          🔒 Upgrade Required
        </h2>
        <div
          style={{
            fontFamily: FONT_BODY,
            color: "#ffffffaa",
            fontSize: 14,
            marginTop: 10,
            marginBottom: 22,
            lineHeight: 1.5,
          }}
        >
          {heading}
          {isLimit && (
            <span style={{ color: "#ffffff88" }}> Upgrade for more.</span>
          )}
        </div>

        {/* Comparison: current plan vs unlocking plan */}
        <div
          style={{
            background: DARK,
            border: "1px solid #ffffff10",
            borderRadius: 14,
            overflow: "hidden",
            marginBottom: 22,
          }}
        >
          {/* Plan header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px",
              padding: "12px 16px",
              borderBottom: "1px solid #ffffff10",
              alignItems: "center",
            }}
          >
            <div />
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textAlign: "center",
                color: current.color,
              }}
            >
              {current.name.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textAlign: "center",
                color: target.color,
              }}
            >
              {target.name.toUpperCase()}
            </div>
          </div>

          {/* Feature rows */}
          {compareRows.map((row, i) => {
            const isHighlight = feature && row.key === feature;
            const targetVal = target.limits[row.key];
            const currentVal = current.limits[row.key];
            return (
              <div
                key={row.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px",
                  padding: "9px 16px",
                  alignItems: "center",
                  borderTop: i === 0 ? "none" : "1px solid #ffffff08",
                  background: isHighlight ? "#F0C04012" : "transparent",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 12.5,
                    color: isHighlight ? GOLD : "#ffffffcc",
                    fontWeight: isHighlight ? 600 : 400,
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    textAlign: "center",
                    color:
                      currentVal === false ? "#ffffff44" : "#ffffff99",
                  }}
                >
                  {limitLabel(currentVal)}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    textAlign: "center",
                    color: target.color,
                    fontWeight: 600,
                  }}
                >
                  {limitLabel(targetVal)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade button (gold) */}
        <button
          onClick={handleUpgrade}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "none",
            fontFamily: FONT_HEAD,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: "pointer",
            color: DARK,
            background: "linear-gradient(135deg, #F0C040, #f5d472)",
            marginBottom: 10,
          }}
        >
          ⚡ {upgradeLabel}
        </button>

        {/* Maybe later (grey) */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#ffffff66",
            fontFamily: FONT_BODY,
            fontSize: 13,
            cursor: "pointer",
            padding: 6,
            marginBottom: 16,
          }}
        >
          Maybe later
        </button>

        {/* Footer note */}
        <div
          style={{
            fontFamily: FONT_BODY,
            color: "#ffffff55",
            fontSize: 11,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Upgrade includes all {target.name} features + higher limits
        </div>
      </div>
    </div>
  );
}
