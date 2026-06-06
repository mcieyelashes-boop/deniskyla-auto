import { useState, useEffect, useCallback, useRef } from "react";

const HAS_CLOUD = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY; // cloud only meaningful with auth

async function getToken() {
  try {
    return await window.Clerk?.session?.getToken?.();
  } catch {
    return null;
  }
}

export function useCloudStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null") ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const loadedCloud = useRef(false);

  // On mount (and when signed in), hydrate from cloud
  useEffect(() => {
    if (!HAS_CLOUD) return;
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return; // not signed in -> stay on localStorage
      try {
        const r = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const { data } = await r.json();
        if (!cancelled && data != null) {
          setValue(data);
          try {
            localStorage.setItem(key, JSON.stringify(data));
          } catch {}
          loadedCloud.current = true;
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {}
        if (HAS_CLOUD) {
          getToken().then((token) => {
            if (!token) return;
            fetch("/api/storage", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ key, data: resolved }),
            }).catch(() => {});
          });
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set];
}
