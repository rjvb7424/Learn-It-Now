// external imports
import React from "react";
import { Button } from "@mui/material";
import { getAuth, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";

// icon imports
import { Google as GoogleIcon } from "@mui/icons-material";

const SignInButton: React.FC = () => {
    const handleSignIn = () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<GoogleIcon />}
      onClick={handleSignIn}
    >
      Sign in with Google
    </Button>
  );
};

export default SignInButton;
