// functions/src/adminInit.ts
import { initializeApp, getApps } from "firebase-admin/app";
if (!getApps().length) {
  initializeApp();
}
