import { useState } from "react";
import { HAS_SUPABASE, getSupabase } from "../lib/supabase";

const LS_KEY = "user_anthropic_key";

export function useUserApiKey() {
  const [apiKey, setApiKey] = useState(() => {
    // In dev/no-auth mode, read from localStorage
    return localStorage.getItem(LS_KEY) || "";
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveApiKey = async (key) => {
    setSaving(true);
    // Always save to localStorage as fallback
    if (key) {
      localStorage.setItem(LS_KEY, key);
    } else {
      localStorage.removeItem(LS_KEY);
    }
    setApiKey(key);

    // If Supabase available, save server-side (encrypted at rest by Supabase)
    if (HAS_SUPABASE) {
      const sb = getSupabase();
      if (sb) {
        try {
          await sb.from("user_settings").upsert({
            key: "anthropic_api_key",
            value: key, // Supabase encrypts at rest
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Supabase key save failed:", e.message);
        }
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearApiKey = () => saveApiKey("");

  // Whether the user has configured their key
  const hasKey = !!apiKey;

  return { apiKey, saveApiKey, clearApiKey, hasKey, saving, saved };
}
