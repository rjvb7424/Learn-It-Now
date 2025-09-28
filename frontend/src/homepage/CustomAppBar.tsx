// External imports
import { useState, useEffect } from "react";
import { AppBar, Toolbar, TextField, Avatar, IconButton, Button, Box, } from "@mui/material";
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
        <AppBar
        position="static"
        sx={{
            backgroundColor: "transparent",
            boxShadow: "none",
        }}>
      <Toolbar sx={{ display: "flex", justifyContent: "center" }}>
        {/* Empty left space for logo later */}
        <Box sx={{ width: 120 }} />

        {/* Search bar in the middle */}
        <TextField
          placeholder="Search..."
          variant="outlined"
          size="small"
          sx={{
            flexGrow: 1,
            maxWidth: "500px",
            mx: "auto",
            backgroundColor: "white",
            borderRadius: 2,
          }}
        />

        {/* Right side: auth button or avatar */}
        <Box>
          {user ? (
            <IconButton onClick={handleSignOut}>
              <Avatar src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
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
