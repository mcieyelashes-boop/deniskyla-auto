import { useCallback } from "react";

async function getToken() {
  try {
    return await window.Clerk?.session?.getToken?.();
  } catch {
    return null;
  }
}

async function postBilling(path, body) {
  const token = await getToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  const r = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.url) {
    throw new Error(data?.error || "Billing request failed");
  }
  return data.url;
}

export function useBilling() {
  // Redirect the user to Xendit Checkout for the given plan. Xendit covers both
  // local Indonesian methods (QRIS, e-wallets, VA, retail) and international
  // cards, so it serves both markets from an Indonesian entity.
  const startCheckout = useCallback(async (plan = "pro") => {
    const url = await postBilling("/api/billing/checkout", { plan });
    window.location.href = url;
  }, []);

  // Redirect the user to the Stripe Billing Portal.
  const openPortal = useCallback(async () => {
    const url = await postBilling("/api/billing/portal");
    window.location.href = url;
  }, []);

  return { startCheckout, openPortal };
}
