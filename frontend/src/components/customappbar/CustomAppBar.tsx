// src/components/customappbar/CustomAppBar.tsx
import { useState } from "react";
import { AppBar, Toolbar, Button, Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useAuthProfile } from "../../hooks/useAuthProfile";
import { useStripeOnboarding } from "../../hooks/useStripeOnboarding";
import { SignIn } from "../../firebase/SignIn";

import StripeSetupDialog from "./StripeSetupDialog";
import CreateButton from "./CreateButton";
import ProfileMenu from "./ProfileMenu";
import SearchBar from "../../homepage/SearchBar";

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
        <Toolbar
          sx={{
            gap: 1.5,
            flexWrap: { xs: "wrap", sm: "nowrap" },   // 👈 wrap on small screens
            alignItems: "center",
          }}
        >
          {/* Left: logo */}
          <Button
            disableRipple
            onClick={() => navigate("/")}
            sx={{ textTransform: "none", flex: "0 0 auto", order: { xs: 1, sm: 1 } }}
          >
            <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
              Learn It Now
            </Typography>
          </Button>

          {/* Middle: search — expands & shrinks, full width on phones */}
          <Box
            sx={{
              order: { xs: 3, sm: 2 },
              flex: { xs: "1 1 100%", sm: "1 1 320px" }, // grow/shrink
              minWidth: { xs: "100%", sm: 240 },
              display: "flex",
              justifyContent: { xs: "stretch", sm: "center" },
            }}
          >
            <SearchBar onSearch={(q) => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")} />
          </Box>

          {/* Right: actions — don’t shrink */}
          <Box
            sx={{
              order: { xs: 2, sm: 3 },
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0, // 👈 prevent squashing
            }}
          >
            {firebaseUser ? (
              <>
                <CreateButton
                  isSignedIn
                  canPublishPaid={canPublishPaid}
                  openStripeDialog={openStripeDialog}
                  loadingSignIn={loadingSignIn}
                  setLoadingSignIn={setLoadingSignIn}
                />
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
