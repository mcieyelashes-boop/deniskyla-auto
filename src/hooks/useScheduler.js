import { useState, useEffect } from "react";

export function useScheduler(onTrigger) {
  // onTrigger(schedule) called when a schedule fires
  const [schedules, setSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deniskyla_schedules") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    try {
      localStorage.setItem("deniskyla_schedules", JSON.stringify(schedules));
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  }, [schedules]);

  // Check for due schedules every minute
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setSchedules(prev => prev.map(s => {
        if (!s.enabled || !s.nextRun || s.nextRun > now) return s;
        // Fire!
        onTrigger(s);
        // Schedule next run
        const next = computeNextRun(s.interval, s.time);
        return { ...s, lastRun: now, nextRun: next };
      }));
    };
    // Don't check immediately on mount — prevents stale schedules firing on app load
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [onTrigger]);

  const addSchedule = (schedule) => {
    const entry = {
      id: Date.now().toString(),
      ...schedule,
      enabled: true,
      createdAt: Date.now(),
      nextRun: computeNextRun(schedule.interval, schedule.time),
      lastRun: null,
    };
    setSchedules(prev => [...prev, entry]);
    return entry;
  };

  const toggleSchedule = (id) =>
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const removeSchedule = (id) =>
    setSchedules(prev => prev.filter(s => s.id !== id));

  return { schedules, addSchedule, toggleSchedule, removeSchedule };
}

function computeNextRun(interval, time = "09:00") {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);

  if (interval === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (interval === "weekly") {
    if (next <= now) next.setDate(next.getDate() + 7);
  } else if (interval === "hourly") {
    next.setTime(now.getTime() + 60 * 60 * 1000);
  }
  return next.getTime();
}
