// src/components/CreatorRoute.tsx
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

type Props = { children: ReactNode };

export default function CreatorRoute({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (!u) {
          setAllowed(false);
          return;
        }
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = (snap.exists() ? snap.data() : {}) as {
          stripeAccountId?: string;
          stripeOnboarded?: boolean;
        };
        const ok = Boolean(data.stripeAccountId) && data.stripeOnboarded === true;
        setAllowed(ok);
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, []);

  // still checking auth/profile
  if (checking) return null; // or a loader

  // not logged in → home
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;

  // logged in but not onboarded → home + hint
  if (allowed === false) {
    return (
      <Navigate
        to="/"
        replace
        state={{ stripeRequired: true, from: location.pathname }}
      />
    );
  }

  // allowed
  return <>{children}</>;
}
