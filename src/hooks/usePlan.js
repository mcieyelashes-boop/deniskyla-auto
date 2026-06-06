import { useState, useEffect, useCallback } from "react";
import { PLANS, getPlan } from "../config/plans";

const HAS_AUTH = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const USAGE_KEY = "deniskyla_usage";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function readUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
    if (u.date !== todayStr()) return { date: todayStr(), flows: 0 };
    return u;
  } catch { return { date: todayStr(), flows: 0 }; }
}

export function usePlan() {
  // When no auth configured (personal/self-host mode), treat as enterprise (no limits)
  const [planId, setPlanId] = useState(HAS_AUTH ? "free" : "enterprise");
  const [usage, setUsage] = useState(readUsage);

  useEffect(() => {
    if (!HAS_AUTH) return;
    // Read plan from Clerk user publicMetadata
    let attempts = 0;
    const check = () => {
      const u = window.Clerk?.user;
      if (u) {
        const p = u.publicMetadata?.plan || "free";
        setPlanId(p);
      } else if (attempts++ < 50) {
        setTimeout(check, 100);
      }
    };
    check();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(USAGE_KEY, JSON.stringify(usage)); } catch {}
  }, [usage]);

  const plan = getPlan(planId);

  const can = useCallback((feature) => {
    const v = plan.limits[feature];
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v > 0;
    return !!v;
  }, [plan]);

  const limit = useCallback((feature) => plan.limits[feature], [plan]);

  const withinLimit = useCallback((feature, currentCount) => {
    const max = plan.limits[feature];
    if (max === Infinity) return true;
    return currentCount < max;
  }, [plan]);

  const flowsRemaining = useCallback(() => {
    const max = plan.limits.flowsPerDay;
    if (max === Infinity) return Infinity;
    return Math.max(0, max - usage.flows);
  }, [plan, usage]);

  const recordFlow = useCallback(() => {
    setUsage((prev) => {
      const today = todayStr();
      const base = prev.date === today ? prev : { date: today, flows: 0 };
      return { ...base, flows: base.flows + 1 };
    });
  }, []);

  const canRunFlow = useCallback(() => {
    const max = plan.limits.flowsPerDay;
    if (max === Infinity) return true;
    return usage.flows < max;
  }, [plan, usage]);

  return { planId, plan, can, limit, withinLimit, flowsRemaining, recordFlow, canRunFlow, usage, hasAuth: HAS_AUTH };
}
