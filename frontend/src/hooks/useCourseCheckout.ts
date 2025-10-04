// src/hooks/useCourseCheckout.ts
import { useState } from "react";

const CREATE_CHECKOUT_URL  = "https://createcheckout-<your-id>-uc.a.run.app";
const FINALIZE_CHECKOUT_URL = "https://finalizecheckout-<your-id>-uc.a.run.app";

export function useCourseCheckout(uid?: string | null) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (courseId: string) => {
    if (!uid) return;
    setBusy(true); setError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch(CREATE_CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, courseId, origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create checkout");
      window.location.assign(data.url as string);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, startCheckout, FINALIZE_CHECKOUT_URL };
}
