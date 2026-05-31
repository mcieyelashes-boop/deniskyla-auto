import { useState, useEffect } from "react";

const STORAGE_KEY = "deniskyla_analytics";

const DEFAULT_STATS = {
  totalRuns: 0,
  totalAgentTasks: 0,
  successCount: 0,
  errorCount: 0,
  agentUsage: {}, // { agentId: count }
  flowUsage: {}, // { flowName: count }
  avgDuration: 0, // ms
  durations: [], // last 20 run durations
  dailyRuns: {}, // { "YYYY-MM-DD": count }
  lastUpdated: null,
};

export function useAnalytics() {
  const [stats, setStats] = useState(() => {
    try {
      return {
        ...DEFAULT_STATS,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      };
    } catch {
      return DEFAULT_STATS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const recordRun = ({ flowName, agents, durationMs, hadError }) => {
    const today = new Date().toISOString().split("T")[0];
    const agentList = Array.isArray(agents) ? agents : [];
    const safeDuration = Number.isFinite(durationMs) ? durationMs : 0;

    setStats((prev) => {
      const agentUsage = { ...prev.agentUsage };
      agentList.forEach((id) => {
        agentUsage[id] = (agentUsage[id] || 0) + 1;
      });
      const flowUsage = {
        ...prev.flowUsage,
        [flowName]: (prev.flowUsage[flowName] || 0) + 1,
      };
      const durations = [...(prev.durations || []), safeDuration].slice(-20);
      const avgDuration = Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      );
      const dailyRuns = {
        ...prev.dailyRuns,
        [today]: (prev.dailyRuns[today] || 0) + 1,
      };
      return {
        ...prev,
        totalRuns: prev.totalRuns + 1,
        totalAgentTasks: prev.totalAgentTasks + agentList.length,
        successCount: hadError ? prev.successCount : prev.successCount + 1,
        errorCount: hadError ? prev.errorCount + 1 : prev.errorCount,
        agentUsage,
        flowUsage,
        durations,
        avgDuration,
        dailyRuns,
        lastUpdated: Date.now(),
      };
    });
  };

  const resetStats = () => {
    setStats(DEFAULT_STATS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { stats, recordRun, resetStats };
}
