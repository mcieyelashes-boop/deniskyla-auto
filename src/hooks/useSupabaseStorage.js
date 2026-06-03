import { useState, useEffect, useCallback } from "react";
import { getSupabase, HAS_SUPABASE } from "../lib/supabase";

/**
 * useSupabaseStorage — like useState but persists to Supabase (or localStorage
 * as fallback). Drop-in replacement for localStorage-backed state hooks.
 *
 * @param {string} key - storage key (used for both localStorage and the
 *   Supabase row "key" column)
 * @param {any} defaultValue - initial value when nothing is persisted yet
 * @param {string} [table="user_data"] - Supabase table name
 * @returns {[any, (value: any) => void]} value + setter (setter accepts a
 *   value or an updater function, like useState)
 */
export function useSupabaseStorage(key, defaultValue, table = "user_data") {
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultValue));
    } catch {
      return defaultValue;
    }
  });

  // Load from Supabase on mount if available. Cloud value wins over the
  // localStorage seed so multiple devices converge.
  useEffect(() => {
    if (!HAS_SUPABASE) return;
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    sb.from(table)
      .select("data")
      .eq("key", key)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.data) {
          setValue(data.data);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, table]);

  // Save to both localStorage and Supabase.
  const setAndPersist = useCallback(
    (newValue) => {
      const resolved = typeof newValue === "function" ? newValue(value) : newValue;
      setValue(resolved);

      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* storage full or unavailable — ignore, Supabase may still persist */
      }

      if (HAS_SUPABASE) {
        const sb = getSupabase();
        if (sb) {
          sb.from(table)
            .upsert({ key, data: resolved, updated_at: new Date().toISOString() })
            .then(({ error }) => {
              if (error) console.warn("Supabase upsert failed:", error.message || error);
            });
        }
      }
    },
    [key, table, value]
  );

  return [value, setAndPersist];
}
