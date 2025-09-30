// External imports
import { useState, useEffect } from "react";
import { AppBar, Toolbar, Avatar, IconButton, Button, Box, Typography } from "@mui/material";
import { onAuthStateChanged, signOut } from "firebase/auth";

// External type imports
import type { User } from "firebase/auth";

// Internal imports
import { auth } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";

export default function CustomAppBar() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // Function to handle sign in
  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await SignIn();
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: "transparent", boxShadow: "none" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Left side: Logo */}
        <Button disableRipple sx={{ textTransform: "none" }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
            Learn It Now
          </Typography>
        </Button>

        {/* Right side: Sign in / Avatar */}
        <Box>
          {user ? (
            <IconButton onClick={handleSignOut}>
              <Avatar
                src={user.photoURL ?? undefined}
                alt={user.displayName ?? "User"}
              />
            </IconButton>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
