import { useState } from "react";
import { AppBar, Toolbar, Button, Box, Typography } from "@mui/material";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";

import { useAuthProfile } from "../../hooks/useAuthProfile";
import { useStripeOnboarding } from "../../hooks/useStripeOnboarding";
import StripeSetupDialog from "./StripeSetupDialog";
import CreateButton from "./CreateButton";
import UserAvatarButton from "./UserAvatarButton";

// TODO - add the profile menu

export default function CustomAppBar() {
  const navigate = useNavigate();
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);

  const { firebaseUser, stripeAccountId, stripeOnboarded, canPublishPaid } = useAuthProfile();
  const { busy, error, setError, createAccountAndGo, continueOnboarding } =
    useStripeOnboarding({ uid: firebaseUser?.uid });

  const openStripeDialog = () => setDlgOpen(true);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
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
              <UserAvatarButton
                photoURL={firebaseUser.photoURL}
                displayName={firebaseUser.displayName}
                onClick={handleSignOut}
              />
            ) : (
              // If you still want a Sign In button here (CreateButton can also trigger SignIn)
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
