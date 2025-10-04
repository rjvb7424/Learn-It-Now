// src/hooks/useCourseCheckout.ts
import { useState } from "react";
import { auth } from "../firebase/firebase";

const CREATE_CHECKOUT_URL  = "https://createcheckout-5rf4ii6yvq-uc.a.run.app";
const FINALIZE_CHECKOUT_URL = "https://finalizecheckout-5rf4ii6yvq-uc.a.run.app";

function requireEnv(v: string | undefined, name: string) {
  if (!v) throw new Error(`${name} is not set. Add it to your .env`);
  return v;
}

export function useCourseCheckout(uidProp?: string | null) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (courseId: string) => {
    // prefer prop; fall back to currentUser to avoid early nulls
    const uid = uidProp || auth.currentUser?.uid || null;
    const url = requireEnv(CREATE_CHECKOUT_URL, "VITE_CREATE_CHECKOUT_URL");

    if (!uid) {
      const msg = "You must be signed in to purchase.";
      setError(msg);
      alert(msg);
      throw new Error(msg);
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, courseId, origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        const msg = data?.error || "Failed to start checkout";
        throw new Error(msg);
      }
      window.location.assign(data.url as string); // 👈 redirect to Stripe
    } catch (e: unknown) {
      console.error("startCheckout failed", e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
      alert(e instanceof Error ? e.message : "Failed to start checkout"); // visible feedback
      throw e; // let CourseCard keep the dialog open
    } finally {
      setBusy(false);
    }
  };

  // Optional: export finalize URL if you want to use it elsewhere
  return { busy, error, setError, startCheckout, FINALIZE_CHECKOUT_URL };
}