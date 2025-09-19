import * as React from "react";
import { Box, Button, Stack, TextField, Typography, Alert } from "@mui/material";

const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE ??
  "https://<region>-<project-id>.cloudfunctions.net"; // replace if not using env

export default function TestStripe() {
  const [accountId, setAccountId] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleCreateAccount = async () => {
    setError(null);
    setLinkUrl("");
    setLoading(true);
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/createAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account");
      setAccountId(data.accountId);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setError(null);
    setLinkUrl("");
    setLoading(true);
    try {
      if (!accountId) throw new Error("No accountId. Create an account first.");
      const res = await fetch(`${FUNCTIONS_BASE}/createAccountLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account link");
      setLinkUrl(data.url);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Stripe Connect Test
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Cloud Functions Base URL"
          value={FUNCTIONS_BASE}
          InputProps={{ readOnly: true }}
        />

        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleCreateAccount} disabled={loading}>
            Create Account
          </Button>
          <TextField
            label="Account ID"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="acct_123..."
            fullWidth
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleCreateLink}
            disabled={loading || !accountId}
          >
            Create Onboarding Link
          </Button>
          <TextField
            label="Onboarding Link"
            value={linkUrl}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Stack>

        <Button
          variant="outlined"
          disabled={!linkUrl}
          onClick={() => window.open(linkUrl, "_blank")}
        >
          Open Onboarding
        </Button>
      </Stack>
    </Box>
  );
}
