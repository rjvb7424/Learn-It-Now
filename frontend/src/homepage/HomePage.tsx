// HomePage.tsx
import { useState } from "react";
import { Button, Container } from "@mui/material";
import { SignIn } from "../firebase/SignIn";

export default function HomePage() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;     // prevent “pending promise” double call
    setLoading(true);
    try {
      await SignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Button variant="contained" color="primary" onClick={handleClick} disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </Container>
  );
}
