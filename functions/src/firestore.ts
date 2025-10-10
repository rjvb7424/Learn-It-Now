import { getFirestore } from "firebase-admin/firestore";
import "./adminInit";

export const db = getFirestore();

export type UserDoc = {
displayName?: string;
email?: string;
stripeAccountId?: string;
stripeOnboarded?: boolean;
};

export const getUserDoc = async (uid: string) => {
const ref = db.doc(`users/${uid}`);
const snap = await ref.get();
return { ref, snap } as const;
};

export const upsertUser = async (uid: string, data: Partial<UserDoc>) => {
await db.doc(`users/${uid}`).set(data, { merge: true });
};

export const getCourseDoc = async (courseId: string) => {
const ref = db.doc(`courses/${courseId}`);
const snap = await ref.get();
return { ref, snap } as const;
};
