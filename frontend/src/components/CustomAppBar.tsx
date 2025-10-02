// CustomAppBar.tsx
import { useState, useEffect } from "react";
import {
  AppBar, Toolbar, Avatar, IconButton, Button, Box, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from "@mui/material";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CREATE_ACCOUNT_URL = "https://createaccount-5rf4ii6yvq-uc.a.run.app";
const CREATE_ACCOUNT_LINK_URL = "https://createaccountlink-5rf4ii6yvq-uc.a.run.app";

type UserDoc = {
  displayName?: string;
  photoURL?: string;
  stripeAccountId?: string;
  stripeOnboarded?: boolean; // 👈 NEW
};

export default function CustomAppBar() {
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeOnboarded, setStripeOnboarded] = useState<boolean>(false); // 👈 NEW

  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgLoading, setDlgLoading] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Load auth + user doc
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setStripeAccountId(null);
      setStripeOnboarded(false);
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          if (snap.exists()) {
            const data = snap.data() as UserDoc;
            setStripeAccountId(data.stripeAccountId ?? null);
            setStripeOnboarded(Boolean(data.stripeOnboarded)); // 👈 pick up flag
          }
        } catch (e) {
          console.error("Failed to read user doc:", e);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    if (loadingSignIn) return;
    setLoadingSignIn(true);
    try { await SignIn(); } finally { setLoadingSignIn(false); }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  // Gate "Create": must have both accountId AND onboarded true
  const handleCreateClick = async () => {
    if (!user) {
      await handleSignIn();
      return;
    }
    const canCreate = Boolean(stripeAccountId) && stripeOnboarded === true;
    if (!canCreate) {
      setDlgError(null);
      setDlgOpen(true); // always show dialog until fully onboarded
      return;
    }
    navigate("/create");
  };

  // Create a new Stripe account and redirect to onboarding
  const createAccountAndOnboard = async () => {
    if (!user) return;
    setDlgError(null);
    setDlgLoading(true);
    try {
      // 1) Create account
      const res = await fetch(CREATE_ACCOUNT_URL, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account");
      const accountId = data.accountId as string;
      if (!accountId) throw new Error("No accountId returned");

      // 2) Save ONLY accountId (do NOT set onboarded yet)
      await setDoc(
        doc(db, "users", user.uid),
        { stripeAccountId: accountId, stripeOnboarded: false },
        { merge: true }
      );
      setStripeAccountId(accountId);
      setStripeOnboarded(false);

      // 3) Create onboarding link & redirect
      const res2 = await fetch(CREATE_ACCOUNT_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2?.error || "Failed to create onboarding link");

      window.location.href = data2.url as string;
    } catch (e: unknown) {
      setDlgError((e as Error).message || "Unknown error");
    } finally {
      setDlgLoading(false);
    }
  };

  // For existing account: just get a fresh onboarding link
  const continueOnboarding = async () => {
    if (!user || !stripeAccountId) return;
    setDlgError(null);
    setDlgLoading(true);
    try {
      const res = await fetch(CREATE_ACCOUNT_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: stripeAccountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create onboarding link");
      window.location.href = data.url as string;
    } catch (e: unknown) {
      setDlgError((e as Error).message || "Unknown error");
    } finally {
      setDlgLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button disableRipple sx={{ textTransform: "none" }} onClick={() => navigate("/")}>
            <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
              Learn It Now
            </Typography>
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {user && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleCreateClick}
                // optional visual hint:
                // disabled={!canPublishPaid}
              >
                Create
              </Button>
            )}

            {user ? (
              <IconButton onClick={handleSignOut}>
                <Avatar src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
              </IconButton>
            ) : (
              <Button variant="contained" color="primary" onClick={handleSignIn} disabled={loadingSignIn}>
                {loadingSignIn ? "Signing in..." : "Sign In"}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Stripe setup dialog */}
      <Dialog open={dlgOpen} onClose={() => !dlgLoading && setDlgOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Set up payouts</DialogTitle>
        <DialogContent dividers>
          {dlgError && <Alert severity="error" sx={{ mb: 2 }}>{dlgError}</Alert>}
          {!stripeAccountId ? (
            <Typography variant="body2">
              To publish paid courses, you need a Stripe Express account to receive payouts.
              Click “Create Stripe Account” to start onboarding.
            </Typography>
          ) : !stripeOnboarded ? (
            <Typography variant="body2">
              Your Stripe account is linked, but onboarding isn’t finished yet.
              Click “Continue Onboarding” to complete it.
            </Typography>
          ) : (
            <Typography variant="body2">
              You’re all set. You can close this dialog and click “Create”.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)} disabled={dlgLoading}>Close</Button>
          {!stripeAccountId ? (
            <Button variant="contained" onClick={createAccountAndOnboard} disabled={dlgLoading}>
              {dlgLoading ? "Working…" : "Create Stripe Account"}
            </Button>
          ) : !stripeOnboarded ? (
            <Button variant="contained" onClick={continueOnboarding} disabled={dlgLoading}>
              {dlgLoading ? "Working…" : "Continue Onboarding"}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
