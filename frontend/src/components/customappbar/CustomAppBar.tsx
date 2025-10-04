import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Typography,
} from "@mui/material";
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
    <Box>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "transparent",
          boxShadow: "none",
        }}
      >
      <Toolbar
        sx={{
          px: 3,
          gap: 1.5,
          flexWrap: "nowrap",
          alignItems: "center",
          overflow: "hidden",
          minHeight: 60,
          "@media (min-width:0px)": { minHeight: 60 },
          "@media (min-width:600px)": { minHeight: 60 },
        }}
      >
          {/* Left: logo (compact on small screens) */}
          <Box
            sx={{
              flex: "0 0 auto",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              order: 1,
            }}
          >
            <Button
              disableRipple
              onClick={() => navigate("/")}
              sx={{ textTransform: "none",}}
            >
              <Typography
                noWrap
                sx={{
                  fontWeight: "bold",
                  color: "black",
                  // slightly scale down on small screens
                  fontSize: "1.25rem",
                }}
              >Learn It Now
              </Typography>
            </Button>
          </Box>

          {/* Middle: search — the flexible, shrink-first column */}
          <Box
            sx={{
              order: 2,
              flex: "1 1 auto",     // 👈 this is the one that grows & shrinks
              minWidth: 0,          // 👈 allow TextField to actually shrink
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SearchBar
              onSearch={(q) => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
            />
          </Box>

          {/* Right: actions — allow gentle compaction but don't explode layout */}
          <Box
            sx={{
              order: 3,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flex: "0 0 auto",
              minWidth: 0,
            }}
          >
            {firebaseUser ? (
              <>
                {/* If CreateButton supports size, pass it; otherwise the sx above will scale it */}
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
                  // make avatar/menu compact on small screens
                />
              </>
            ) : (
              <>
                  <Button
                    variant="outlined"
                    onClick={async () => { await SignIn(); }}
                    aria-label="Sign in"
                  >
                    Sign in
                  </Button>
              </>
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
    </Box>
  );
}
