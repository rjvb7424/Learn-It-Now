import { Button } from "@mui/material";
import { SignIn } from "../../../firebase/SignIn";
import { useNavigate } from "react-router-dom";

type Props = {
  isSignedIn: boolean;
  canPublishPaid: boolean;          // stripeAccountId && stripeOnboarded
  openStripeDialog: () => void;
  loadingSignIn: boolean;
  setLoadingSignIn: (b: boolean) => void;
};

export default function CreateButton({
  isSignedIn, canPublishPaid, openStripeDialog, loadingSignIn, setLoadingSignIn,
}: Props) {
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!isSignedIn) {
      if (loadingSignIn) return;
      setLoadingSignIn(true);
      try { await SignIn(); } finally { setLoadingSignIn(false); }
      return;
    }
    if (!canPublishPaid) {
      openStripeDialog();
      return;
    }
    navigate("/create");
  };

  return (
    <Button
      variant="outlined"
      color="primary"
      onClick={handleClick}
      title={!canPublishPaid && isSignedIn ? "Finish Stripe onboarding to create a course" : undefined}
    >
      Create
    </Button>
  );
}
