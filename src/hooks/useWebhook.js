import { useState, useEffect } from "react";

export function useWebhook() {
  const [webhooks, setWebhooks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deniskyla_webhooks") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    try {
      localStorage.setItem("deniskyla_webhooks", JSON.stringify(webhooks));
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  }, [webhooks]);

  const addWebhook = (webhook) => {
    const entry = { id: Date.now().toString(), ...webhook, enabled: true, createdAt: Date.now() };
    setWebhooks(prev => [...prev, entry]);
  };

  const toggleWebhook = (id) =>
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));

  const removeWebhook = (id) =>
    setWebhooks(prev => prev.filter(w => w.id !== id));

  // Fire all enabled webhooks after a flow completes
  const fireWebhooks = async (payload) => {
    const enabled = webhooks.filter(w => w.enabled);
    const errors = [];
    for (const wh of enabled) {
      try {
        await fetch(wh.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            event: "flow_completed",
            timestamp: Date.now(),
            ...payload,
            webhook_id: wh.id,
          }),
        });
      } catch (e) {
        errors.push({ id: wh.id, name: wh.name, error: e.message });
        console.warn(`Webhook failed [${wh.name}]:`, e.message);
      }
    }
    return errors;
  };

  return { webhooks, addWebhook, toggleWebhook, removeWebhook, fireWebhooks };
}
