import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export type UserDoc = {
  displayName?: string;
  photoURL?: string;
  stripeAccountId?: string;
  stripeOnboarded?: boolean;
};

export function useAuthProfile() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setProfile(null);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          setProfile(snap.exists() ? (snap.data() as UserDoc) : {});
        } catch (e) {
          console.error("Failed to load user profile:", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const stripeAccountId = profile?.stripeAccountId ?? null;
  const stripeOnboarded = Boolean(profile?.stripeOnboarded);
  const canPublishPaid = Boolean(stripeAccountId) && stripeOnboarded;

  return { firebaseUser, profile, stripeAccountId, stripeOnboarded, canPublishPaid, loading };
}
