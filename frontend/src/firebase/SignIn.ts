// External imports
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Internal imports
import { auth, db } from "./firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Signs in the user with Google, creating a profile in Firestore if needed.
export async function SignIn(): Promise<void> {
    try {
        const credential = await signInWithPopup(auth, googleProvider);
        const { user } = credential;
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        // If the user already exists in Firestore, do nothing.
        if (snap.exists()) return;
        // Create a new user in Firestore.
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            stripeOnboarded: false,
        });
    } catch (error) {
        console.error("Error signing in:", error);
    }
}