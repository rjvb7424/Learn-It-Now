// src/checkout/CheckoutSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import LoadingOverlay from "./LoadingOverlay";

const FINALIZE_CHECKOUT_URL = "https://finalizecheckout-5rf4ii6yvq-uc.a.run.app";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // null = resolving, "" = signed out, string = uid
  const [uid, setUid] = useState<string | null>(null);

  const sessionId = params.get("session_id");
  const courseId  = params.get("course");

  // keep overlay visible while auth resolves
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? ""));
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      if (uid === null) return; // still resolving → keep overlay shown

      if (uid === "") {
        // not signed in → go sign in and return here after
        navigate(`/signin?next=${encodeURIComponent(window.location.href)}`, { replace: true });
        return;
      }

      if (!sessionId) {
        navigate(`/purchases?error=missing_session`, { replace: true });
        return;
      }

      try {
        const res = await fetch(FINALIZE_CHECKOUT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, sessionId }),
        });
        type FinalizeResponse = { error?: string; courseId?: string };
        const data: FinalizeResponse = await res.json().catch(() => ({} as FinalizeResponse));
        if (!res.ok) throw new Error(data?.error || "Finalize failed");

        navigate(`/course/${courseId || data.courseId}`, { replace: true });
      } catch {
        navigate(`/purchases?error=finalize_failed`, { replace: true });
      }
    })();
  }, [uid, sessionId, courseId, navigate]);

  // Your overlay: always open until we navigate away
  return <LoadingOverlay open blur="blur(2px)" />;
}
