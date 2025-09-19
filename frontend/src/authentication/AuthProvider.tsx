import * as React from "react";
import { onUserChanged, handleRedirectResult } from "../../firebase";
import { AuthCtx, type AuthState } from "./AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ user: null, loading: true });

  React.useEffect(() => {
    handleRedirectResult().finally(() => {
      const unsub = onUserChanged((user) => setState({ user, loading: false }));
      return () => unsub();
    });
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}
