const FONT_MONO = "'DM Mono', monospace";

// Small header badge showing the current plan + (for free) remaining daily flows.
// Props: { plan, flowsRemaining, onClick }
export default function PlanBadge({ plan, flowsRemaining, onClick }) {
  if (!plan) return null;

  const isFree = plan.id === "free";
  const isPro = plan.id === "pro";

  const label =
    plan.name.toUpperCase() + (isPro ? " ⭐" : "");

  const remaining =
    typeof flowsRemaining === "function" ? flowsRemaining() : flowsRemaining;
  const showRemaining = isFree && remaining != null && remaining !== Infinity;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${plan.name} plan`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: `${plan.color}14`,
        border: `1px solid ${plan.color}55`,
        borderRadius: 999,
        padding: "6px 12px",
        cursor: onClick ? "pointer" : "default",
        fontFamily: FONT_MONO,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          color: plan.color,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
        }}
      >
        {label}
      </span>
      {showRemaining && (
        <span
          style={{
            color: "#ffffff66",
            fontSize: 10,
            letterSpacing: 0.3,
            borderLeft: "1px solid #ffffff1a",
            paddingLeft: 8,
          }}
        >
          {remaining} flow{remaining === 1 ? "" : "s"} left today
        </span>
      )}
    </button>
  );
}
