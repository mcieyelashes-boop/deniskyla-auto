import { useEffect } from "react";

// Reads ?action=sign-up|sign-in (and optional &plan=) from the URL and opens
// the matching Clerk modal once Clerk has loaded. Cleans the param afterward.
export function useAuthIntent() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (action !== "sign-up" && action !== "sign-in") return;

    let attempts = 0;
    const open = () => {
      const ck = window.Clerk;
      if (ck && ck.loaded) {
        if (ck.user) {
          // already signed in — just clean the URL
        } else if (action === "sign-up") {
          ck.openSignUp?.({ afterSignUpUrl: window.location.pathname });
        } else {
          ck.openSignIn?.({ afterSignInUrl: window.location.pathname });
        }
        // Clean the URL so refreshes don't re-trigger
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        url.searchParams.delete("plan");
        window.history.replaceState({}, "", url.pathname + url.search);
      } else if (attempts++ < 100) {
        setTimeout(open, 100);
      }
    };
    open();
  }, []);
}
