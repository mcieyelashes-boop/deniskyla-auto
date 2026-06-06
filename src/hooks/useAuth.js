import { useState, useEffect } from "react";

const HAS_AUTH = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(HAS_AUTH);

  useEffect(() => {
    if (!HAS_AUTH) { setLoading(false); return; }

    let attempts = 0;
    const check = () => {
      if (window.Clerk) {
        setUser(window.Clerk.user || null);
        setSignedIn(!!window.Clerk.user);
        setLoading(false);
        // Listen for changes
        window.Clerk.addListener?.((state) => {
          setUser(state.user || null);
          setSignedIn(!!state.user);
        });
      } else if (attempts < 50) {
        attempts++;
        setTimeout(check, 100);
      } else {
        setLoading(false);
      }
    };
    check();
  }, []);

  const signOut = async () => {
    if (window.Clerk) await window.Clerk.signOut();
    setUser(null);
    setSignedIn(false);
  };

  return { user, signedIn, loading, signOut, hasAuth: HAS_AUTH };
}
