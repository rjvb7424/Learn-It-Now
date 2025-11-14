// external imports
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

// internal imports
import { SignIn } from "../../../firebase/SignIn";

type CreateButtonProps = {
  isSignedIn: boolean;
  canPublishPaid: boolean;
  openStripeDialog: () => void;
  loadingSignIn: boolean;
  setLoadingSignIn: (loading: boolean) => void;
};

export default function CreateButton({
  isSignedIn,
  canPublishPaid,
  openStripeDialog,
  loadingSignIn,
  setLoadingSignIn,
}: CreateButtonProps) {
  const navigate = useNavigate();

  // handle button click, including sign-in and Stripe onboarding
  const handleClick = async () => {
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
    if (!canPublishPaid) {
      openStripeDialog();
      return;
    }
    navigate("/create");
  };

  const buttonTitle = isSignedIn && !canPublishPaid
      ? "Finish Stripe onboarding to create a course"
      : undefined;

  return (
    <Button
      variant="outlined"
      color="primary"
      onClick={handleClick}
      disabled={loadingSignIn}
      title={buttonTitle}>
      Create
    </Button>
  );
}
