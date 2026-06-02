import { useState, useEffect } from "react";
import { AGENTS } from "../config/agents";

const DEFAULT_WORKSPACE = {
  id: "default",
  name: "My Workspace",
  icon: "◈",
  color: "#F0C040",
  createdAt: Date.now(),
};

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deniskyla_workspaces") || JSON.stringify([DEFAULT_WORKSPACE])); }
    catch { return [DEFAULT_WORKSPACE]; }
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    return localStorage.getItem("deniskyla_active_workspace") || "default";
  });

  useEffect(() => {
    try { localStorage.setItem("deniskyla_workspaces", JSON.stringify(workspaces)); }
    catch (e) { console.warn("Storage write failed:", e); }
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem("deniskyla_active_workspace", activeWorkspaceId);
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const addWorkspace = (workspace) => {
    const entry = { id: Date.now().toString(), ...workspace, createdAt: Date.now() };
    setWorkspaces(prev => [...prev, entry]);
    return entry;
  };

  const updateWorkspace = (id, updates) =>
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));

  const removeWorkspace = (id) => {
    if (id === "default") return; // can't delete default
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    if (activeWorkspaceId === id) setActiveWorkspaceId("default");
  };

  const switchWorkspace = (id) => setActiveWorkspaceId(id);

  return { workspaces, activeWorkspace, activeWorkspaceId, addWorkspace, updateWorkspace, removeWorkspace, switchWorkspace };
}
