import { useState } from "react";
import { AppBar, Toolbar, Button, Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useAuthProfile } from "../../hooks/useAuthProfile";
import { useStripeOnboarding } from "../../hooks/useStripeOnboarding";
import { SignIn } from "../../firebase/SignIn";

import StripeSetupDialog from "./StripeSetupDialog";
import CreateButton from "./CreateButton";
import ProfileMenu from "./ProfileMenu";

export default function CustomAppBar() {
  const navigate = useNavigate();
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);

  const { firebaseUser, stripeAccountId, stripeOnboarded, canPublishPaid } = useAuthProfile();
  const { busy, error, setError, createAccountAndGo, continueOnboarding } =
    useStripeOnboarding({ uid: firebaseUser?.uid });

  const openStripeDialog = () => setDlgOpen(true);

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
            {firebaseUser ? (
              <>
                <CreateButton
                  isSignedIn
                  canPublishPaid={canPublishPaid}
                  openStripeDialog={openStripeDialog}
                  loadingSignIn={loadingSignIn}
                  setLoadingSignIn={setLoadingSignIn}
                />
                {/* ProfileMenu now handles navigation + logout internally */}
                <ProfileMenu
                  photoURL={firebaseUser.photoURL}
                  displayName={firebaseUser.displayName}
                />
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={async () => { await SignIn(); }}
                aria-label="Sign in"
                sx={{ textTransform: "none" }}
              >
                Sign in
              </Button>
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
