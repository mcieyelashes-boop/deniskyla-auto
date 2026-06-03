import { useState, useEffect } from "react";

const STORAGE_KEY = "deniskyla_ceo_memory";

const DEFAULT_MEMORY = {
  businessName: "",
  businessType: "",
  targetAudience: "",
  mainProduct: "",
  goals: [], // string[]
  pastInsights: [], // { text, date, source }[] — last 20
  preferences: {}, // { agentId: "user prefers shorter outputs" }
};

export function useCEOMemory() {
  const [memory, setMemory] = useState(() => {
    try {
      return {
        ...DEFAULT_MEMORY,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      };
    } catch {
      return DEFAULT_MEMORY;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch (e) {
      console.warn("Memory write failed:", e);
    }
  }, [memory]);

  const updateMemory = (updates) =>
    setMemory((prev) => ({ ...prev, ...updates }));

  const addInsight = (text, source = "flow") => {
    setMemory((prev) => ({
      ...prev,
      pastInsights: [
        { text: text.slice(0, 200), date: new Date().toLocaleDateString(), source },
        ...prev.pastInsights,
      ].slice(0, 20),
    }));
  };

  const clearMemory = () => setMemory(DEFAULT_MEMORY);

  // Build context string for CEO system prompt injection
  const buildMemoryContext = () => {
    if (!memory.businessName && !memory.goals.length && !memory.pastInsights.length)
      return "";
    const lines = [];
    if (memory.businessName)
      lines.push(`Business: ${memory.businessName} (${memory.businessType})`);
    if (memory.targetAudience)
      lines.push(`Target audience: ${memory.targetAudience}`);
    if (memory.mainProduct)
      lines.push(`Main product/service: ${memory.mainProduct}`);
    if (memory.goals.length)
      lines.push(`Current goals: ${memory.goals.join(", ")}`);
    if (memory.pastInsights.length) {
      lines.push(`Recent insights:`);
      memory.pastInsights.slice(0, 3).forEach((i) => lines.push(`  - ${i.text} (${i.date})`));
    }
    return `\n\nBusiness Context:\n${lines.join("\n")}`;
  };

  return { memory, updateMemory, addInsight, clearMemory, buildMemoryContext };
}
