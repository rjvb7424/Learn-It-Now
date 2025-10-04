// src/checkout/CheckoutSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import { Box, CircularProgress, Typography } from "@mui/material";

const FINALIZE_CHECKOUT_URL = "https://finalizecheckout-<your-id>-uc.a.run.app";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);

  const sessionId = params.get("session_id");
  const courseId = params.get("course"); // sent in success_url

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    (async () => {
      if (!uid || !sessionId) return;
      try {
        const res = await fetch(FINALIZE_CHECKOUT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Finalize failed");
        // Go to the course reader
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
