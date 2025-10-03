// src/components/appbar/CustomAppBar.tsx
import { useState } from "react";
import { AppBar, Toolbar, Button, Box, Typography } from "@mui/material";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";

import { useAuthProfile } from "../../hooks/useAuthProfile";
import { useStripeOnboarding } from "../../hooks/useStripeOnboarding";
import StripeSetupDialog from "./StripeSetupDialog";
import CreateButton from "./CreateButton";
import ProfileMenu from "./ProfileMenu"; // <-- use the dropdown you wrote

export default function CustomAppBar() {
  const navigate = useNavigate();
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);

  const { firebaseUser, stripeAccountId, stripeOnboarded, canPublishPaid } = useAuthProfile();
  const { busy, error, setError, createAccountAndGo, continueOnboarding } =
    useStripeOnboarding({ uid: firebaseUser?.uid });

  const openStripeDialog = () => setDlgOpen(true);

  // --- Profile menu actions ---
  const goPurchases = () => navigate("/purchases");             // adjust route if different
  const goMyCourses = () => navigate("/my-courses");            // adjust route if different
  const goAccount = () => navigate("/account");                 // adjust route if different

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            disableRipple
            sx={{ textTransform: "none" }}
            onClick={() => navigate("/")}
            aria-label="Go to homepage"
          >
            <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
              Learn It Now
            </Typography>
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {firebaseUser && (
              <CreateButton
                isSignedIn
                canPublishPaid={canPublishPaid}
                openStripeDialog={openStripeDialog}
                loadingSignIn={loadingSignIn}
                setLoadingSignIn={setLoadingSignIn}
              />
            )}

            {firebaseUser ? (
              <ProfileMenu
                photoURL={firebaseUser.photoURL}
                displayName={firebaseUser.displayName}
                onGoPurchases={goPurchases}
                onGoMyCourses={goMyCourses}
                onGoAccount={goAccount}
                onSignOut={handleSignOut}
              />
            ) : (
              // If you still want a Sign In trigger here, you can render a small button/icon.
              // CreateButton can also handle sign-in if that's your current flow.
              <></>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <StripeSetupDialog
        open={dlgOpen}
        loading={busy}
        error={error}
        stripeAccountId={stripeAccountId}
        stripeOnboarded={stripeOnboarded}
        onClose={() => setDlgOpen(false)}
        onCreateAccount={createAccountAndGo}
        onContinueOnboarding={() => continueOnboarding(stripeAccountId)}
        clearError={() => setError(null)}
      />
    </>
  );
}
