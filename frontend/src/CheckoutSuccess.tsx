// src/checkout/CheckoutSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase"; // ← ensure correct path
import { Box, CircularProgress, Typography } from "@mui/material";

const FINALIZE_CHECKOUT_URL = "https://finalizecheckout-5rf4ii6yvq-uc.a.run.app";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);

  const sessionId = params.get("session_id");
  const courseId  = params.get("course");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    (async () => {
      // if user not signed in, push them to sign-in (or choose your own route)
      if (uid === null) return;               // still resolving auth
      if (!uid) {                             // resolved as signed-out
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
          body: JSON.stringify({ uid, sessionId }), // ← no accountId
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Finalize failed");
        navigate(`/course/${courseId || data.courseId}`, { replace: true });
      } catch {
        navigate(`/purchases?error=finalize_failed`, { replace: true });
      }
    })();
  }, [uid, sessionId, courseId, navigate]);

  return (
    <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
      <CircularProgress />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Finalizing your purchase…
      </Typography>
    </Box>
  );
}
