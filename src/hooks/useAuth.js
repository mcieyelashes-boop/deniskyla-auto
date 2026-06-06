import { useState, useEffect } from "react";

const HAS_AUTH = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(HAS_AUTH);

  useEffect(() => {
    if (!HAS_AUTH) { setLoading(false); return; }

    let attempts = 0;
    const tick = () => {
      const ck = window.Clerk;
      if (ck) {
        setUser(ck.user || null);
        setSignedIn(!!ck.user);
        setLoading(false);
        ck.addListener?.((ev) => {
          setUser(ev.user || null);
          setSignedIn(!!ev.user);
        });
      } else if (attempts++ < 100) {
        setTimeout(tick, 100);
      } else {
        setLoading(false);
      }
    };
    tick();
  }, []);

  const signOut = async () => {
    if (window.Clerk) await window.Clerk.signOut();
    setUser(null);
    setSignedIn(false);
  };

  return { user, signedIn, loading, signOut, hasAuth: HAS_AUTH };
}
