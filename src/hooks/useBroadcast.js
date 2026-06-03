import { useCallback, useEffect, useRef, useState } from "react";

// Real-time broadcast hook backed by the /api/broadcast SSE endpoint.
//
// Owner side:   broadcast(event, data) → POST fan-out to all viewers.
// Viewer side:  subscribe(shareId, onEvent) → opens an EventSource and
//               returns an unsubscribe function.
export function useBroadcast(shareId) {
  const [viewers, setViewers] = useState(0);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  // Broadcast an update to all share viewers (owner action).
  const broadcast = useCallback(
    async (event, data) => {
      if (!shareId) return;
      try {
        await fetch(`/api/broadcast?shareId=${encodeURIComponent(shareId)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event, data }),
        });
      } catch {
        // Non-fatal: viewers may simply be offline.
      }
    },
    [shareId]
  );

  // Subscribe as a viewer. Returns an unsubscribe cleanup function.
  const subscribe = useCallback((id, onEvent) => {
    if (!id) return () => {};

    const es = new EventSource(`/api/broadcast?shareId=${encodeURIComponent(id)}`);
    esRef.current = es;

    es.addEventListener("connected", (e) => {
      try {
        const d = JSON.parse(e.data);
        setViewers(d.viewers || 0);
      } catch {
        setViewers(0);
      }
      setConnected(true);
    });

    es.addEventListener("update", (e) => {
      try {
        onEvent?.("update", JSON.parse(e.data));
      } catch {
        onEvent?.("update", {});
      }
    });

    es.addEventListener("agent-update", (e) => {
      try {
        onEvent?.("agent-update", JSON.parse(e.data));
      } catch {
        onEvent?.("agent-update", {});
      }
    });

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
      setConnected(false);
    };
  }, []);

  // Close any lingering EventSource on unmount.
  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  return { viewers, connected, broadcast, subscribe };
}
