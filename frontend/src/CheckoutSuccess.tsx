// src/checkout/CheckoutSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";              // ← fix the path
import LoadingOverlay from "./LoadingOverlay"; // ← use the reusable overlay

const FINALIZE_CHECKOUT_URL = "https://finalizecheckout-5rf4ii6yvq-uc.a.run.app";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // uid === null → still resolving auth
  // uid === ""   → resolved as signed-out
  // uid is string → signed-in
  const [uid, setUid] = useState<string | null>(null);

  const sessionId = params.get("session_id");
  const courseId  = params.get("course");

  useEffect(() => {
    // keep the overlay up from the start until we navigate away
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? ""));
  }, []);

  useEffect(() => {
    (async () => {
      if (uid === null) return; // still resolving auth, keep overlay up

      if (uid === "") {
        // resolved as signed-out → send to sign-in with return url
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Finalize failed");

        navigate(`/course/${courseId || data.courseId}`, { replace: true });
      } catch {
        navigate(`/purchases?error=finalize_failed`, { replace: true });
      }
    })();
  }, [uid, sessionId, courseId, navigate]);

  // Full-screen spinner with blurred backdrop
  return <LoadingOverlay open blur="blur(2px)" />;
}
