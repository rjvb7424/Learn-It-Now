// src/ReturnPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function ReturnPage() {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Checking onboarding status…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const user = auth.currentUser;
      if (!user) { setMsg("Please sign in first."); setBusy(false); return; }

      try {
        // Get stored accountId in case param is missing
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const data = (snap.exists() ? snap.data() : {}) as {
          stripeAccountId?: string | null;
        };
        const effectiveAccountId = paramAccountId ?? data.stripeAccountId ?? undefined;

        if (!effectiveAccountId) {
          // No account → nothing to do; just go home
          navigate("/", { replace: true });
          return;
        }

        // ✅ Ask server (Stripe) if onboarding is truly finished
        const r = await fetch("/__/functions/accountStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, accountId: effectiveAccountId }),
        });
        if (!r.ok) throw new Error("Status check failed");
        const s = await r.json();

        if (s?.onboarded) {
          // ✅ Only now mark success and proceed to /create
          await setDoc(ref, { stripeOnboarded: true, stripeAccountId: s.accountId }, { merge: true });
          if (!cancelled) navigate("/create", { replace: true });
          return;
        }

        // ❌ Not complete: DO NOT write any success flag. Just "return".
        // Prefer going back in history if possible; otherwise go home.
        if (window.history.length > 1) {
          navigate(-1);            // go back to where the user came from
        } else {
          navigate("/", { replace: true });
        }
      } catch (e) {
        console.error(e);
        setMsg("Error checking onboarding. Try again.");
        setBusy(false);
      }
    };

    const unsub = onAuthStateChanged(auth, () => run());
    run();
    return () => { cancelled = true; unsub(); };
  }, [paramAccountId, navigate]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{msg}</Typography>
      {busy ? (
        <CircularProgress />
      ) : (
        <Button onClick={() => navigate("/", { replace: true })}>Back home</Button>
      )}
    </Box>
  );
}
