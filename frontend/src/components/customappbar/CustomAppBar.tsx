// src/components/customappbar/CustomAppBar.tsx
import { useState } from "react";
import { AppBar, Toolbar, Button, Box, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthProfile } from "../../hooks/useAuthProfile";
import { useStripeOnboarding } from "../../hooks/useStripeOnboarding";
import { SignIn } from "../../firebase/SignIn";
import StripeSetupDialog from "./components/StripeSetupDialog";
import CreateButton from "./components/CreateButton";
import ProfileMenu from "./components/ProfileMenu";
import SearchBar from "../../homepage/SearchBar";

type CustomAppBarProps = { showSearch?: boolean };

export default function CustomAppBar({ showSearch = true }: CustomAppBarProps) {
  const navigate = useNavigate();
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);

  const location = useLocation();
  const currentQ = new URLSearchParams(location.search).get("q") ?? "";

  const { firebaseUser, stripeAccountId, stripeOnboarded, canPublishPaid } = useAuthProfile();
  const { busy, error, setError, createAccountAndGo, continueOnboarding } =
    useStripeOnboarding({ uid: firebaseUser?.uid });

  const openStripeDialog = () => setDlgOpen(true);

  return (
    <Box>
      {/* color="transparent" + enableColorOnDark makes it *truly* transparent in dark mode */}
      <AppBar
        position="static"
        color="transparent"
        enableColorOnDark
        elevation={0}
        sx={{
          backgroundColor: "transparent",
          backgroundImage: "none",
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
          {/* Left: logo */}
          <Box sx={{ flex: "0 0 auto", minWidth: 0, display: "flex", alignItems: "center", order: 1 }}>
            <Button disableRipple onClick={() => navigate("/")} sx={{ textTransform: "none", color: "inherit" }}>
              {/* Use inherit so it follows theme (white in dark mode) */}
              <Typography noWrap sx={{ fontWeight: "bold", color: "inherit", fontSize: "1.45rem" }}>
                Learn It Now
              </Typography>
            </Button>
          </Box>

          {/* Middle: search (optional) */}
          {showSearch ? (
            <Box sx={{ order: 2, flex: "1 1 auto", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <SearchBar
                initialValue={currentQ}
                onSearch={(q) => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
              />
            </Box>
          ) : (
            <Box aria-hidden role="presentation" sx={{ order: 2, flex: "1 1 auto", minWidth: 0 }} />
          )}

          {/* Right: actions */}
          {/* Right: actions (stable width to prevent search bar jump) */}
          {/* Right: actions — perfectly stable width */}
          <Box
            sx={{
              order: 3,
              position: "relative",
              flex: "0 0 auto",
              minWidth: 0,
            }}
          >
            {/* This row always participates in layout so width NEVER changes */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                ...(firebaseUser
                  ? {}
                  : {
                      // Keep size, remove interactivity/visibility
                      visibility: "hidden",
                      pointerEvents: "none",
                    }),
              }}
              aria-hidden={!firebaseUser}
            >
              <CreateButton
                // Render the REAL thing so sizing is identical
                isSignedIn
                canPublishPaid={canPublishPaid}
                openStripeDialog={openStripeDialog}
                loadingSignIn={loadingSignIn}
                setLoadingSignIn={setLoadingSignIn}
              />
              <ProfileMenu photoURL={firebaseUser?.photoURL} displayName={firebaseUser?.displayName} />
            </Box>

            {/* Overlay only when signed out */}
            {!firebaseUser && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={async () => {
                    await SignIn();
                  }}
                  aria-label="Sign in"
                  sx={{ width: "100%" }}
                >
                  Sign in
                </Button>
              </Box>
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
