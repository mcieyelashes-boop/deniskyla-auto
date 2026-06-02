import { useState, useEffect, useCallback } from "react";

const SERVER_BASE = "/api";

export function useCronScheduler() {
  const [serverSchedules, setServerSchedules] = useState([]);
  const [cronResults, setCronResults] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Fetch server schedules and cron results on mount
  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const r = await fetch(`${SERVER_BASE}/cron-results`);
      const data = await r.json();
      setCronResults(data.results || []);
    } catch {}
  };

  const syncSchedule = async (schedule) => {
    // Push a schedule to the server
    setSyncing(true);
    try {
      await fetch(`${SERVER_BASE}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(schedule),
      });
    } catch (e) {
      console.warn("Failed to sync schedule:", e);
    } finally {
      setSyncing(false);
    }
  };

  const removeServerSchedule = async (id) => {
    try {
      await fetch(`${SERVER_BASE}/schedule?id=${id}`, { method: "DELETE" });
    } catch {}
  };

  const triggerCronNow = async (schedule) => {
    // Manually trigger a cron run (for testing)
    try {
      const r = await fetch(`${SERVER_BASE}/cron`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          flowName: schedule.flowName,
          chain: schedule.chain,
          agentTasks: schedule.agentTasks || {},
        }),
      });
      const data = await r.json();
      if (data.entry) setCronResults(prev => [data.entry, ...prev].slice(0, 20));
      return data;
    } catch (e) {
      console.warn("Cron trigger failed:", e);
    }
  };

  return { serverSchedules, cronResults, syncing, syncSchedule, removeServerSchedule, triggerCronNow, fetchResults };
}
