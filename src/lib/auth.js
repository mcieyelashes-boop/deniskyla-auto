// Clerk auth helper (lightweight, works without React Clerk provider for now).
// Clerk is loaded via its CDN script which attaches `window.Clerk`. When the
// publishable key is not set, the whole app falls back to single-user mode.

// Clerk publishable key from env
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
export const HAS_AUTH = !!CLERK_PUBLISHABLE_KEY;

// Get current user session token (for API calls)
export async function getAuthToken() {
  if (!HAS_AUTH || !window.Clerk) return null;
  try {
    return await window.Clerk.session?.getToken();
  } catch {
    return null;
  }
}

// Get current user info
export function getCurrentUser() {
  if (!HAS_AUTH || !window.Clerk) return null;
  return window.Clerk.user || null;
}

// Is user signed in
export function isSignedIn() {
  return HAS_AUTH && !!window.Clerk?.user;
}
