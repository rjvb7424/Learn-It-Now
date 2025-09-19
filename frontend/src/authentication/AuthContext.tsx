import * as React from "react";
import type { User } from "firebase/auth";

export type AuthState = { user: User | null; loading: boolean };
export const AuthCtx = React.createContext<AuthState>({ user: null, loading: true });

// Hook lives here (no component exported in this file)
export function useAuth() {
  return React.useContext(AuthCtx);
}
