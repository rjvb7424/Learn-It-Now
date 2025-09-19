// src/StripeOnboardingTest.tsx
import * as React from "react";
import { Button, Stack, TextField, Alert } from "@mui/material";
import HeaderBar from "./HeaderBar";

const CREATE_ACCOUNT_URL = "https://createaccount-5rf4ii6yvq-uc.a.run.app";
const CREATE_ACCOUNT_LINK_URL = "https://createaccountlink-5rf4ii6yvq-uc.a.run.app";

export default function StripeOnboardingTest() {
  const [accountId, setAccountId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const createAccount = async () => {
    setError(null); setLoading(true);
    try {
        const res = await fetch(CREATE_ACCOUNT_URL, { method: "POST" });
        const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account");
      setAccountId(data.accountId);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
    finally { setLoading(false); }
  };

  const createLinkAndGo = async () => {
    setError(null); setLoading(true);
    try {
        if (!accountId) throw new Error("Create an account first.");
        const res = await fetch(CREATE_ACCOUNT_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
        });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account link");
      window.location.href = data.url; // 👈 redirect to Stripe onboarding
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
    finally { setLoading(false); }
  };

  return (
    <Stack spacing={2} sx={{ p: 3, maxWidth: 600 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <HeaderBar />
      <Button variant="contained" onClick={createAccount} disabled={loading}>
        Create Account
      </Button>
      <TextField
        label="Account ID"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        placeholder="acct_123..."
      />
      <Button
        variant="contained"
        color="secondary"
        onClick={createLinkAndGo}
        disabled={loading || !accountId}
      >
        Create Onboarding Link & Go
      </Button>
    </Stack>
  );
}
