// src/main.tsx (or App.tsx): replace your ReturnPage with this
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function ReturnPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string>("Finishing onboarding…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setMsg("Please sign in first.");
        setBusy(false);
        return;
      }
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        const current = (snap.exists() ? snap.data() : {}) as { stripeAccountId?: string };
        // (optional) sanity check: ensure accountId matches what we have (if present)
        if (current.stripeAccountId && accountId && current.stripeAccountId !== accountId) {
          // You might want to handle this mismatch more strictly in prod
          console.warn("Account ID returned by Stripe differs from stored account ID.");
        }
        await setDoc(ref, { stripeOnboarded: true, stripeAccountId: accountId ?? current.stripeAccountId ?? null }, { merge: true });
        setMsg("Onboarding complete! Redirecting to Create…");
        setBusy(false);
        setTimeout(() => navigate("/create"), 800);
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
      {busy ? <CircularProgress /> : <Button onClick={() => navigate("/")}>Back home</Button>}
    </Box>
  );
}
