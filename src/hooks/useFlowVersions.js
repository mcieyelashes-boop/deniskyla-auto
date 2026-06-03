import { useState, useEffect } from "react";

export function useFlowVersions() {
  const [versions, setVersions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deniskyla_versions") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem("deniskyla_versions", JSON.stringify(versions)); }
    catch (e) { console.warn("Storage write failed:", e); }
  }, [versions]);

  const saveVersion = (flowRun) => {
    // flowRun: { flowName, flowId, ranAt, duration, agents: [{id, name, task, output, status}] }
    const version = {
      id: `v${Date.now()}`,
      ...flowRun,
      savedAt: Date.now(),
    };
    setVersions(prev => [version, ...prev].slice(0, 30)); // keep last 30
    return version;
  };

  const deleteVersion = (id) => setVersions(prev => prev.filter(v => v.id !== id));
  const clearVersions = () => setVersions([]);

  // Group by flowName
  const versionsByFlow = versions.reduce((acc, v) => {
    if (!acc[v.flowName]) acc[v.flowName] = [];
    acc[v.flowName].push(v);
    return acc;
  }, {});

  return { versions, versionsByFlow, saveVersion, deleteVersion, clearVersions };
}
