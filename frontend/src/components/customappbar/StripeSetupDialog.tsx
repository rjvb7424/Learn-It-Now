import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Typography } from "@mui/material";

type Props = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  stripeAccountId?: string | null;
  stripeOnboarded?: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onContinueOnboarding: () => void;
  clearError: () => void;
};

export default function StripeSetupDialog({
  open, loading, error, stripeAccountId, stripeOnboarded,
  onClose, onCreateAccount, onContinueOnboarding, clearError,
}: Props) {
  return (
    <Dialog open={open} onClose={() => !loading && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Set up payouts</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>{error}</Alert>}

        {!stripeAccountId ? (
          <Typography variant="body2">
            To publish paid courses, you need a Stripe Express account to receive payouts.
            Click “Create Stripe Account” to start onboarding.
          </Typography>
        ) : !stripeOnboarded ? (
          <Typography variant="body2">
            Your Stripe account is linked, but onboarding isn’t finished yet.
            Click “Continue Onboarding” to complete it.
          </Typography>
        ) : (
          <Typography variant="body2">
            You’re all set. You can close this dialog and click “Create”.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Close</Button>
        {!stripeAccountId ? (
          <Button variant="contained" onClick={onCreateAccount} disabled={loading}>
            {loading ? "Working…" : "Create Stripe Account"}
          </Button>
        ) : !stripeOnboarded ? (
          <Button variant="contained" onClick={onContinueOnboarding} disabled={loading}>
            {loading ? "Working…" : "Continue Onboarding"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
