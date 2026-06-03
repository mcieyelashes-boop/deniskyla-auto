import { useState, useEffect } from "react";

const STORAGE_KEY = "deniskyla_scores";

export function useAgentScoring() {
  const [scores, setScores] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) {
      console.warn("Scores write failed:", e);
    }
  }, [scores]);

  // resultId: unique ID for a specific agent run result
  const rateResult = (resultId, agentId, rating) => {
    // rating: 1 (thumbs up) or -1 (thumbs down)
    setScores((prev) => ({
      ...prev,
      [resultId]: { agentId, rating, ratedAt: Date.now() },
    }));
  };

  const getAgentScore = (agentId) => {
    const agentRatings = Object.values(scores).filter((s) => s.agentId === agentId);
    if (!agentRatings.length) return null;
    const positive = agentRatings.filter((r) => r.rating === 1).length;
    return Math.round((positive / agentRatings.length) * 100); // percentage
  };

  const getOverallStats = () => {
    const all = Object.values(scores);
    if (!all.length) return { total: 0, positive: 0, rate: 0 };
    const positive = all.filter((r) => r.rating === 1).length;
    return {
      total: all.length,
      positive,
      rate: Math.round((positive / all.length) * 100),
    };
  };

  return { scores, rateResult, getAgentScore, getOverallStats };
}
