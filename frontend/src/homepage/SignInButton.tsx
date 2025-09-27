// src/components/SignInButton.tsx
import Button from "@mui/material/Button";
import GoogleIcon from "@mui/icons-material/Google";
import { signInWithGoogle } from "../library/signIn";

type SignInButtonProps = {
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
  fullWidth?: boolean;
};

export default function SignInButton({
  onError,
  onSuccess,
  fullWidth,
}: SignInButtonProps) {
  const handleClick = async () => {
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      onError?.(err);
      // Fallback simple alert if no handler provided:
      if (!onError) alert("Sign-in failed. Check console for details.");
      console.error(err);
    }
  };

  return (
    <Button
      variant="contained"
      startIcon={<GoogleIcon />}
      onClick={handleClick}
      fullWidth={fullWidth}
    >
      Sign in with Google
    </Button>
  );
}
