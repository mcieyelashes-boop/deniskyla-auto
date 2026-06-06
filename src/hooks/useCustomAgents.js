import { AGENTS as DEFAULT_AGENTS } from "../config/agents";
import { useCloudStorage } from "./useCloudStorage";

const STORAGE_KEY = "deniskyla_custom_agents";

export function useCustomAgents() {
  // Cloud-synced when signed in + Supabase configured; localStorage otherwise.
  const [customAgents, setCustomAgents] = useCloudStorage(STORAGE_KEY, []);

  // All agents: defaults first, then custom
  const allAgents = [...DEFAULT_AGENTS, ...customAgents];

  const addAgent = (agent) => {
    // Validate id uniqueness
    if (allAgents.some((a) => a.id === agent.id)) {
      throw new Error(`Agent with id "${agent.id}" already exists`);
    }
    // Ensure required fields have defaults
    const newAgent = {
      capabilities: [],
      logMessages: ["Processing...", "Working on task...", "Done ✓"],
      defaultTask: "New task",
      ...agent,
    };
    setCustomAgents((prev) => [...prev, newAgent]);
    return newAgent;
  };

  const removeAgent = (id) => {
    // Can only remove custom agents, not defaults
    if (DEFAULT_AGENTS.some((a) => a.id === id)) {
      throw new Error("Cannot remove default agents");
    }
    setCustomAgents((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAgent = (id, updates) => {
    setCustomAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  return { allAgents, customAgents, addAgent, removeAgent, updateAgent };
}
