import { useState } from "react";
import { db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

const CREATE_ACCOUNT_URL = "https://createaccount-5rf4ii6yvq-uc.a.run.app";
const CREATE_ACCOUNT_LINK_URL = "https://createaccountlink-5rf4ii6yvq-uc.a.run.app";

export function useStripeOnboarding(opts: { uid?: string | null }) {
  const { uid } = opts;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAccountAndGo = async () => {
    if (!uid) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(CREATE_ACCOUNT_URL, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account");

      const accountId = data.accountId as string;
      await setDoc(
        doc(db, "users", uid),
        { stripeAccountId: accountId, stripeOnboarded: false },
        { merge: true }
      );

      const res2 = await fetch(CREATE_ACCOUNT_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2?.error || "Failed to create onboarding link");
      window.location.href = data2.url as string;
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const continueOnboarding = async (accountId?: string | null) => {
    if (!accountId) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(CREATE_ACCOUNT_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create onboarding link");
      window.location.href = data.url as string;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, createAccountAndGo, continueOnboarding };
}
