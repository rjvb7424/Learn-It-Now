// src/ReturnPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export function ReturnPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string>("Checking your onboarding status…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const user = auth.currentUser;
      if (!user) {
        // Make sure we re-check if auth state changes shortly after mount
        setMsg("Please sign in first.");
        setBusy(false);
        return;
      }

      try {
        // Load the user doc to read stored accountId and the *server-truthy* onboarded flag
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const data = (snap.exists() ? snap.data() : {}) as {
          stripeAccountId?: string | null;
          stripeOnboarded?: boolean;
        };

        const effectiveAccountId =
          accountIdParam ?? data.stripeAccountId ?? undefined;

        if (!effectiveAccountId) {
          setMsg("No Stripe account found. Creating one from your dashboard.");
          setBusy(false);
          return;
        }

        // If the server has already marked you onboarded, go to create
        if (data.stripeOnboarded) {
          if (!cancelled) {
            setMsg("Onboarding complete! Redirecting…");
            // replace avoids weird Back-button loops
            navigate("/create", { replace: true });
          }
          return;
        }

        // Not onboarded → immediately create a fresh onboarding link and send the user back
        setMsg("You still have steps to finish. Taking you to Stripe…");
        const resp = await fetch("/__/functions/createAccountLink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: effectiveAccountId }),
        });

        if (!resp.ok) throw new Error("Failed to create onboarding link");

        const { url } = await resp.json();
        if (!url) throw new Error("No onboarding URL returned");

        // Use replace so the browser Back button goes back to wherever they were before onboarding,
        // not back into this ReturnPage (which would just bounce again anyway).
        window.location.replace(url);
      } catch (e) {
        console.error(e);
        setMsg("Could not resume onboarding. Please try again.");
        setBusy(false);
      }
    };

    // Run once, but also listen for late auth resolution
    const unsub = onAuthStateChanged(auth, () => run());
    run();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [accountIdParam, navigate]);

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
