// external imports
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// internal imports
import { auth, db } from "../../firebase";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  const credential = await signInWithPopup(auth, provider);
  const { user } = credential;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  // If the user doc exists, we're done.
  if (snap.exists()) return;

  // Create minimal user profile
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create two "empty folders" via placeholder docs
  await Promise.all([
    setDoc(
      doc(db, "users", user.uid, "purchases", "__init__"),
      { _placeholder: true, createdAt: serverTimestamp() }
    ),
    setDoc(
      doc(db, "users", user.uid, "myCourses", "__init__"),
      { _placeholder: true, createdAt: serverTimestamp() }
    ),
  ]);
}
