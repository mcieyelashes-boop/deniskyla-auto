import { useEffect, useRef } from "react";

export function useTriggerPoller(onTrigger, enabled = true) {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => { onTriggerRef.current = onTrigger; }, [onTrigger]);

  useEffect(() => {
    if (!enabled) return;
    const poll = async () => {
      try {
        const r = await fetch("/api/trigger?action=poll");
        if (!r.ok) return;
        const { trigger } = await r.json();
        if (trigger) {
          onTriggerRef.current(trigger);
        }
      } catch {}
    };
    const interval = setInterval(poll, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [enabled]);
}
