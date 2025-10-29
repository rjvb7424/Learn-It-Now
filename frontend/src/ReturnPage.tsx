import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

function isValidHttpUrl(s: unknown): s is string {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

/**
 * IMPORTANT: replace these with the exact URLs shown in your Firebase console.
 * Example names based on your screenshot. Keep region segment intact.
 */
const FN = {
  accountStatus:
    import.meta.env.VITE_ACCOUNT_STATUS_URL ||
    "https://accountstatus-5rf4ii6yvq-uc.a.run.app",
  createAccountLink:
    import.meta.env.VITE_CREATE_ACCOUNT_LINK_URL ||
    "https://createaccountlink-5rf4ii6yvq-uc.a.run.app",
};

export function ReturnPage() {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState("Checking onboarding status…");
  const [effectiveAccountId, setEffectiveAccountId] = useState<string | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const goCreate = useCallback(() => navigate("/create", { replace: true }), [navigate]);
  const goHome   = useCallback(() => navigate("/",       { replace: true }), [navigate]);

  const postJson = useMemo(
    () =>
      async (url: string, body: unknown) => {
        const r = await fetch(url, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const raw = await r.text(); // read once
        if (!r.ok) {
          console.error(url, "HTTP", r.status, raw);
          throw new Error(`HTTP ${r.status}`);
        }
        try {
          return JSON.parse(raw);
        } catch {
          console.error(url, "non-JSON:", raw);
          throw new Error("Non-JSON response");
        }
      },
    []
  );

  useEffect(() => {
    let cancel = false;

    const run = async () => {
      const u = auth.currentUser;
      if (!u) {
        setMsg("Please sign in first.");
        setBusy(false);
        return;
      }

      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        const data = (snap.exists() ? snap.data() : {}) as {
          stripeAccountId?: string | null;
          stripeOnboarded?: boolean;
        };

        const acctId = paramAccountId ?? data.stripeAccountId ?? null;
        setEffectiveAccountId(acctId);

        if (!acctId) {
          await setDoc(ref, { stripeOnboarded: false }, { merge: true });
          setMsg("No Stripe account found.");
          setBusy(false);
          return;
        }

        // Server truth: has onboarding actually finished?
        const status = await postJson(FN.accountStatus, {
          uid: u.uid,
          accountId: acctId,
        });

        if (cancel) return;

        if (status?.onboarded === true) {
          await setDoc(ref, { stripeOnboarded: true, stripeAccountId: status.accountId }, { merge: true });
          goCreate();
          return;
        }

        // Not complete: keep false and show Resume button
        await setDoc(ref, { stripeOnboarded: false, stripeAccountId: acctId }, { merge: true });
        setMsg("You still have steps to finish. Resume onboarding to complete setup.");
        setCanResume(true);
        setBusy(false);
      } catch (e) {
        console.error("ReturnPage check failed:", e);
        setMsg("Error checking onboarding. Try again.");
        setBusy(false);
      }
    };

    const unsub = onAuthStateChanged(auth, () => run());
    run();

    return () => { cancel = true; unsub(); };
  }, [paramAccountId, postJson, goCreate]);

  const handleResume = async () => {
    if (!effectiveAccountId) return;
    try {
      setRetrying(true);
      setMsg("Creating a new Stripe onboarding session…");

      const link = await postJson(FN.createAccountLink, { accountId: effectiveAccountId });
      const url = link?.url;

      if (!isValidHttpUrl(url)) {
        console.error("createAccountLink returned invalid url:", url);
        setMsg("Could not open Stripe (invalid link). Please try again from your dashboard.");
        setRetrying(false);
        return;
      }
      window.location.replace(url);
    } catch (e) {
      console.error("Resume onboarding failed:", e);
      setMsg("Could not resume onboarding. Please try again.");
      setRetrying(false);
    }
  };

  const handleRetryCheck = () => {
    navigate(0); // reload route to re-run effect
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{msg}</Typography>
      {busy ? (
        <CircularProgress />
      ) : (
        <Stack direction="row" spacing={2}>
          {canResume && (
            <Button disabled={retrying} onClick={handleResume}>
              {retrying ? "Opening Stripe…" : "Resume onboarding"}
            </Button>
          )}
          {!canResume && <Button onClick={handleRetryCheck}>Retry</Button>}
          <Button onClick={goHome} variant="text">Back home</Button>
        </Stack>
      )}
    </Box>
  );
}
