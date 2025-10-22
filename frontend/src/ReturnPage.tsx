// src/ReturnPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

function isValidHttpUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try { new URL(s); return true; } catch { return false; }
}

export function ReturnPage() {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Checking onboarding status…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const goHome = () => navigate("/", { replace: true });
    const goCreate = () => navigate("/create", { replace: true });

    const run = async () => {
      const u = auth.currentUser;
      if (!u) { setMsg("Please sign in first."); setBusy(false); return; }

      try {
        // Get stored accountId in case URL param missing
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        const data = (snap.exists() ? snap.data() : {}) as {
          stripeAccountId?: string | null;
          stripeOnboarded?: boolean;
        };
        const effectiveAccountId = paramAccountId ?? data.stripeAccountId ?? undefined;

        if (!effectiveAccountId) {
          // No account: make sure it's false and leave
          await setDoc(userRef, { stripeOnboarded: false }, { merge: true });
          if (!cancelled) goHome();
          return;
        }

        // 1) Ask server if onboarding is complete (this returns JSON)
        const r = await fetch("/__/functions/accountStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: u.uid, accountId: effectiveAccountId }),
        });

        // If server failed, show its text so we can diagnose
        if (!r.ok) {
          const errText = await r.text().catch(() => "");
          console.error("accountStatus HTTP error:", r.status, errText);
          throw new Error("Status check failed");
        }

        // Try parse JSON safely
                let s: { onboarded?: boolean; accountId?: string | null } | null = null;
                try {
                  s = await r.json();
                } catch {
                  const errText = await r.text().catch(() => "");
                  console.error("accountStatus non-JSON response:", errText);
                  throw new Error("Status response not JSON");
                }

        // 2) Completed → set true and go to /create (CreatorRoute will allow)
        if (s?.onboarded === true) {
          await setDoc(userRef, { stripeOnboarded: true, stripeAccountId: s.accountId }, { merge: true });
          if (!cancelled) goCreate();
          return;
        }

        // 3) Not finished → keep false and RESUME onboarding
        await setDoc(userRef, { stripeOnboarded: false, stripeAccountId: effectiveAccountId }, { merge: true });

        setMsg("You still have steps to finish. Resuming Stripe onboarding…");

        const linkResp = await fetch("/__/functions/createAccountLink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: effectiveAccountId }),
        });

        if (!linkResp.ok) {
          const t = await linkResp.text().catch(() => "");
          console.error("createAccountLink HTTP error:", linkResp.status, t);
          throw new Error("Failed to create onboarding link");
        }

        let linkJson: { url?: string } | null = null;
        try {
          linkJson = await linkResp.json();
        } catch {
          const t = await linkResp.text().catch(() => "");
          console.error("createAccountLink non-JSON:", t);
          throw new Error("Invalid onboarding link response");
        }

        const url = linkJson?.url;
        if (!isValidHttpUrl(url)) {
          console.error("createAccountLink returned invalid url:", url);
          setMsg("Could not open Stripe (invalid link). Please try again from your dashboard.");
          setBusy(false);
          return;
        }

        // Use replace so Back doesn’t loop into ReturnPage
        window.location.replace(url);
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
