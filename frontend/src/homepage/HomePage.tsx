// External imports
import { useState, useEffect } from "react";
import { Button, Container, Avatar, IconButton, Box } from "@mui/material";
import { onAuthStateChanged, signOut } from "firebase/auth";

// External types
import type { User } from "firebase/auth";

// Internal imports
import { auth } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";
import CustomAppBar from "./CustomAppBar";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // Function to handle sign-in
  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await SignIn();
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sign-out
  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <Box>
      <CustomAppBar />
      <Container>
        {user ? (
          <IconButton onClick={handleSignOut}>
            <Avatar src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
          </IconButton>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSignIn}
            disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        )}  
      </Container>
    </Box>
  );
}
