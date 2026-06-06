import { useState, useEffect } from "react";
import { HAS_AUTH, getCurrentUser, isSignedIn } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [signedIn, setSignedIn] = useState(() => isSignedIn());
  const [loading, setLoading] = useState(HAS_AUTH);

  useEffect(() => {
    if (!HAS_AUTH) {
      setLoading(false);
      return;
    }

    const checkAuth = () => {
      setUser(getCurrentUser());
      setSignedIn(isSignedIn());
      setLoading(false);
    };

    // Clerk loads asynchronously
    if (window.Clerk) {
      checkAuth();
    } else {
      const interval = setInterval(() => {
        if (window.Clerk) {
          clearInterval(interval);
          checkAuth();
        }
      }, 100);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
      }, 5000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  const signOut = async () => {
    if (window.Clerk) await window.Clerk.signOut();
    setUser(null);
    setSignedIn(false);
  };

  return { user, signedIn, loading, signOut, hasAuth: HAS_AUTH };
}
