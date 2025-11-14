// external imports
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

// internal imports
import { SignIn } from "../../../firebase/SignIn";

type CreateButtonProps = {
  isSignedIn: boolean;
  loadingSignIn: boolean;
  setLoadingSignIn: (loading: boolean) => void;

  // Deprecated props (kept for compatibility, no longer used)
  canPublishPaid?: boolean;
  openStripeDialog?: () => void;
};

export default function CreateButton({
  isSignedIn,
  loadingSignIn,
  setLoadingSignIn,
}: CreateButtonProps) {
  const navigate = useNavigate();

  const handleClick = async () => {
    // If user is not signed in, trigger sign-in
    if (!isSignedIn) {
      if (loadingSignIn) return;
      setLoadingSignIn(true);
      try {
        await SignIn();
      } finally {
        setLoadingSignIn(false);
      }
      return;
    }

    // Signed in → always allow going to Create page
    navigate("/create");
  };

  const buttonTitle = !isSignedIn ? "Sign in to create a course" : "Create a course";

  return (
    <Button
      variant="outlined"
      color="primary"
      onClick={handleClick}
      disabled={loadingSignIn}
      title={buttonTitle}
    >
      Create
    </Button>
  );
}
