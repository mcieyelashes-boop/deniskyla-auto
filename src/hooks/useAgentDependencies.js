import { useState, useEffect } from "react";

// Example dependency: leadgen requires market to complete first
// Format: { dependentId: ["requiredAgentId1", "requiredAgentId2"] }
const DEFAULT_DEPS = {};

export function useAgentDependencies() {
  const [dependencies, setDependencies] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deniskyla_deps") || "{}"); }
    catch { return DEFAULT_DEPS; }
  });

  useEffect(() => {
    try { localStorage.setItem("deniskyla_deps", JSON.stringify(dependencies)); }
    catch (e) { console.warn("Deps write failed:", e); }
  }, [dependencies]);

  const addDependency = (dependentId, requiresId) => {
    setDependencies(prev => ({
      ...prev,
      [dependentId]: [...new Set([...(prev[dependentId] || []), requiresId])],
    }));
  };

  const removeDependency = (dependentId, requiresId) => {
    setDependencies(prev => {
      const updated = (prev[dependentId] || []).filter(id => id !== requiresId);
      if (!updated.length) {
        const { [dependentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dependentId]: updated };
    });
  };

  const clearDependencies = (agentId) => {
    setDependencies(prev => {
      const { [agentId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Resolve a flow chain respecting dependencies:
  // Returns reordered chain where deps are always before dependents
  const resolveChain = (chain) => {
    const visited = new Set();
    const result = [];
    const visit = (id) => {
      if (visited.has(id)) return;
      const deps = dependencies[id] || [];
      deps.filter(d => chain.includes(d)).forEach(visit);
      visited.add(id);
      result.push(id);
    };
    chain.forEach(visit);
    return result;
  };

  // Check if an agent can run (all its dependencies are done)
  const canRun = (agentId, completedAgentIds) => {
    const deps = dependencies[agentId] || [];
    return deps.every(id => completedAgentIds.includes(id));
  };

  return { dependencies, addDependency, removeDependency, clearDependencies, resolveChain, canRun };
}
