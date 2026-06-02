import { useState } from "react";

const syne = "'Syne', sans-serif";
const sans = "'DM Sans', sans-serif";
const mono = "'DM Mono', monospace";
const GOLD = "#F0C040";

const ENV_CONTENT = `ANTHROPIC_API_KEY=sk-ant-...
VITE_HAS_API_KEY=true`;

const VERCEL_STEPS = [
  "Open Vercel Dashboard → Settings → Environment Variables",
  "Add ANTHROPIC_API_KEY = your key",
  "Add VITE_HAS_API_KEY = true",
  "Redeploy",
];

const FEATURES = [
  { icon: "◈", text: "CEO Agent that delegates to 7 specialists" },
  { icon: "✦", text: "Real Claude AI powering every agent" },
  { icon: "⏱", text: "Automated flows & scheduling" },
];

const PRESET_FLOWS = [
  { id: "launch", name: "🚀 Product Launch", desc: "Full campaign dari riset sampai publish" },
  { id: "growth", name: "📈 Growth Sprint", desc: "Fokus lead gen + nurture" },
  { id: "content_blitz", name: "✦ Content Blitz", desc: "Produksi & jadwal konten masif" },
];

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("deniskyla_onboarded");
  });
  const completeOnboarding = () => {
    localStorage.setItem("deniskyla_onboarded", "true");
    setShowOnboarding(false);
  };
  return { showOnboarding, completeOnboarding };
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function StepDots({ current }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
      {[1, 2, 3].map(n => (
        <div
          key={n}
          style={{
            width: n === current ? 22 : 8,
            height: 8,
            borderRadius: 20,
            background: n === current ? GOLD : n < current ? GOLD + "66" : "#ffffff22",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function GoldButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "linear-gradient(135deg, #F0C040, #F59E0B)",
        border: "none",
        borderRadius: 12,
        padding: "13px 26px",
        color: "#000",
        fontFamily: syne,
        fontWeight: 800,
        fontSize: 14,
        cursor: "pointer",
        letterSpacing: 0.5,
      }}
    >
      {children}
    </button>
  );
}

function GreyButton({ children, onClick, link }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: link ? "transparent" : "#ffffff08",
        border: link ? "none" : "1px solid #ffffff15",
        borderRadius: link ? 0 : 12,
        padding: link ? "8px 4px" : "13px 26px",
        color: "#ffffff77",
        fontFamily: link ? mono : syne,
        fontWeight: link ? 400 : 700,
        fontSize: link ? 12 : 14,
        cursor: "pointer",
        textDecoration: link ? "underline" : "none",
        letterSpacing: link ? 0 : 0.5,
      }}
    >
      {children}
    </button>
  );
}

function StepWelcome({ onNext, onSkip }) {
  return (
    <div style={{ textAlign: "center", animation: "fadeSlideIn 0.3s ease" }}>
      <div style={{ color: GOLD, fontSize: 64, fontFamily: syne, lineHeight: 1, marginBottom: 18, textShadow: `0 0 40px ${GOLD}55` }}>
        ◈
      </div>
      <h1 style={{ color: "#fff", fontFamily: syne, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, marginBottom: 8 }}>
        Welcome to Denis's Command Center
      </h1>
      <p style={{ color: "#ffffff88", fontFamily: sans, fontSize: 14, marginBottom: 28 }}>
        AI-powered agentic automation
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, textAlign: "left" }}>
        {FEATURES.map(f => (
          <div key={f.text} style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "#ffffff06", border: "1px solid #ffffff10",
            borderRadius: 12, padding: "12px 16px",
          }}>
            <span style={{ color: GOLD, fontSize: 20, width: 26, textAlign: "center" }}>{f.icon}</span>
            <span style={{ color: "#ffffffcc", fontFamily: sans, fontSize: 13 }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <GoldButton onClick={onNext}>Get Started →</GoldButton>
        <GreyButton link onClick={onSkip}>Skip setup</GreyButton>
      </div>
    </div>
  );
}

function StepApiKey({ onNext, onSkip }) {
  const [selected, setSelected] = useState("vercel");
  const [copied, setCopied] = useState(false);

  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(ENV_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const Card = ({ id, children }) => {
    const active = selected === id;
    return (
      <div
        onClick={() => setSelected(id)}
        style={{
          background: active ? `${GOLD}10` : "#ffffff06",
          border: `1px solid ${active ? GOLD + "66" : "#ffffff12"}`,
          borderRadius: 14,
          padding: "16px 18px",
          cursor: "pointer",
          transition: "all 0.2s",
          marginBottom: 12,
        }}
      >
        {children}
      </div>
    );
  };

  const RadioDot = ({ active }) => (
    <span style={{
      width: 16, height: 16, borderRadius: "50%",
      border: `2px solid ${active ? GOLD : "#ffffff33"}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD }} />}
    </span>
  );

  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
      <h1 style={{ color: "#fff", fontFamily: syne, fontWeight: 800, fontSize: 22, marginBottom: 20, textAlign: "center" }}>
        Connect Claude AI
      </h1>

      {/* Option A: Vercel */}
      <Card id="vercel">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <RadioDot active={selected === "vercel"} />
          <div>
            <div style={{ color: "#fff", fontFamily: syne, fontWeight: 700, fontSize: 14 }}>
              Vercel <span style={{ color: GOLD, fontSize: 10, fontFamily: mono }}>(Recommended)</span>
            </div>
            <div style={{ color: "#ffffff77", fontFamily: sans, fontSize: 12 }}>
              Already deployed to Vercel? Add your key in the dashboard
            </div>
          </div>
        </div>
        <ol style={{ margin: "0 0 12px 0", paddingLeft: 30, display: "flex", flexDirection: "column", gap: 5 }}>
          {VERCEL_STEPS.map((s, i) => (
            <li key={i} style={{ color: "#ffffffaa", fontFamily: mono, fontSize: 11, lineHeight: 1.5 }}>{s}</li>
          ))}
        </ol>
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: "inline-block",
            background: "#ffffff08", border: "1px solid #ffffff15",
            borderRadius: 9, padding: "8px 14px",
            color: "#ffffffcc", fontFamily: mono, fontSize: 11,
            textDecoration: "none",
          }}
        >
          Open Vercel Dashboard →
        </a>
      </Card>

      {/* Option B: Local Dev */}
      <Card id="local">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <RadioDot active={selected === "local"} />
          <div>
            <div style={{ color: "#fff", fontFamily: syne, fontWeight: 700, fontSize: 14 }}>Local Dev</div>
            <div style={{ color: "#ffffff77", fontFamily: sans, fontSize: 12 }}>
              Create a <code style={{ fontFamily: mono, color: GOLD }}>.env</code> file in project root
            </div>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <pre style={{
            background: "#07070f", border: "1px solid #ffffff12",
            borderRadius: 9, padding: "12px 14px",
            color: "#ffffffcc", fontFamily: mono, fontSize: 11,
            overflowX: "auto", margin: 0, whiteSpace: "pre",
          }}>
            {ENV_CONTENT}
          </pre>
          <button
            onClick={(e) => { e.stopPropagation(); copyEnv(); }}
            style={{
              position: "absolute", top: 8, right: 8,
              background: copied ? "#34D39922" : "#ffffff10",
              border: `1px solid ${copied ? "#34D39944" : "#ffffff15"}`,
              borderRadius: 7, padding: "4px 10px",
              color: copied ? "#34D399" : "#ffffffaa",
              fontFamily: mono, fontSize: 10, cursor: "pointer",
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 20 }}>
        <GoldButton onClick={onNext}>I've added my key →</GoldButton>
        <GreyButton link onClick={onSkip}>Skip for now</GreyButton>
      </div>
    </div>
  );
}

function StepFirstFlow({ onReady, onSimulate }) {
  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
      <h1 style={{ color: "#fff", fontFamily: syne, fontWeight: 800, fontSize: 22, marginBottom: 20, textAlign: "center" }}>
        Run your first flow
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {PRESET_FLOWS.map(flow => (
          <div key={flow.id} style={{
            background: "#ffffff06", border: "1px solid #ffffff15",
            borderRadius: 12, padding: "13px 16px",
          }}>
            <div style={{ color: "#fff", fontFamily: syne, fontWeight: 700, fontSize: 14 }}>{flow.name}</div>
            <div style={{ color: "#ffffff66", fontFamily: mono, fontSize: 11, marginTop: 2 }}>{flow.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <GreyButton onClick={onSimulate}>Start with simulation →</GreyButton>
        <GoldButton onClick={onReady}>I'm ready →</GoldButton>
      </div>
    </div>
  );
}

// ─── WIZARD SHELL ────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(1);

  const next = () => setCurrentStep(s => Math.min(s + 1, 3));
  const finish = () => onComplete?.();
  const skip = () => onSkip?.();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(3,3,8,0.88)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: sans, overflowY: "auto",
    }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 480,
        maxHeight: "90vh", overflowY: "auto",
        background: "#0d0d1a",
        border: "1px solid #ffffff15",
        borderRadius: 22,
        padding: "32px 30px",
        boxShadow: "0 30px 90px rgba(0,0,0,0.8)",
        backgroundImage: `radial-gradient(ellipse at 50% 0%, ${GOLD}0a 0%, transparent 60%)`,
      }}>
        <StepDots current={currentStep} />

        {currentStep === 1 && <StepWelcome onNext={next} onSkip={skip} />}
        {currentStep === 2 && <StepApiKey onNext={next} onSkip={skip} />}
        {currentStep === 3 && <StepFirstFlow onReady={finish} onSimulate={finish} />}
      </div>
    </div>
  );
}
