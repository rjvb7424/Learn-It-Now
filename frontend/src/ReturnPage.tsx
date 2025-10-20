// src/ReturnPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function ReturnPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Finishing onboarding…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setMsg("Please sign in first."); setBusy(false); return; }
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        const current = (snap.exists() ? snap.data() : {}) as { stripeAccountId?: string | null };

        // ✅ Mark success so CreatorRoute will allow /create
        await setDoc(
          ref,
          {
            stripeOnboarded: true,
            stripeAccountId: accountId ?? current.stripeAccountId ?? null,
          },
          { merge: true }
        );

        // ✅ Go to /create (through CreatorRoute)
        navigate("/create", { replace: true });
      } catch (e) {
        console.error(e);
        setMsg("Could not finish onboarding. Please try again.");
        setBusy(false);
      }
    });
    return () => unsub();
  }, [accountId, navigate]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{msg}</Typography>
      {busy ? <CircularProgress /> : <Button onClick={() => navigate("/", { replace: true })}>Back home</Button>}
    </Box>
  );
}
