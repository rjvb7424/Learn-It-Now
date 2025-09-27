// src/types/AppUser.ts
export type ProviderInfo = {
  providerId: string | null;
  uid: string | null;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
};

export interface AppUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;

  // Auth metadata
  signInProvider: string | null;           // primary sign-in provider
  providerIds: string[];                   // all linked providerIds
  isAnonymous: boolean;
  tenantId: string | null;
  authCreationTime: string | null;         // from Firebase Auth metadata
  lastLoginTime: string | null;            // from Firebase Auth metadata
  languageCode: string | null;

  // Optional profile extras
  birthdayISO: string | null;              // from Google People API if available

  // App bookkeeping
  createdAt: any;                          // Firestore serverTimestamp
  updatedAt: any;                          // Firestore serverTimestamp

  // Snapshot of providerData for debugging / analytics
  providers: ProviderInfo[];
}
