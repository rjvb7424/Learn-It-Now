import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";

initializeApp();
const db = getFirestore();

// Params / secrets
const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
// Use a param for base URL too (you can also keep this as a secret if you prefer)
const APP_BASE_URL = defineString("APP_BASE_URL");

// Types
type CreateAccountBody = { uid?: string; email?: string };
type OnboardLinkBody = { accountId?: string };

// Lazy Stripe client (don’t instantiate at module load)
function getStripe(): Stripe {
  const key = STRIPE_SECRET.value();
  if (!key) throw new Error("Server not configured: STRIPE_SECRET missing");
  return new Stripe(key);
}

// POST /createConnectedAccount
export const createConnectedAccount = onRequest(
  {
    // v2 has built-in CORS; change to your domain(s) when you go prod
    cors: true,
    secrets: [STRIPE_SECRET],
    region: "us-central1", // or your preferred region
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const { uid, email } = (req.body || {}) as CreateAccountBody;
      if (!uid) {
        res.status(400).json({ error: "uid required" });
        return;
      }

      const stripe = getStripe();

      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();
      let accountId = snap.get("stripeAccountId") as string | undefined;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "standard",
          email: email || undefined,
        });
        accountId = account.id;
        await userRef.set(
          { stripeAccountId: accountId, onboarded: false },
          { merge: true }
        );
      }

      res.json({ accountId });
    } catch (err) {
      console.error("createConnectedAccount error:", err);
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
);

// POST /createOnboardingLink
export const createOnboardingLink = onRequest(
  {
    cors: true,
    secrets: [STRIPE_SECRET],
    region: "us-central1",
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const { accountId } = (req.body || {}) as OnboardLinkBody;
      if (!accountId) {
        res.status(400).json({ error: "accountId required" });
        return;
      }

      const baseUrl = APP_BASE_URL.value();
      if (!baseUrl) {
        res
          .status(500)
          .json({ error: "Server not configured: APP_BASE_URL missing" });
        return;
      }

      const stripe = getStripe();

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/onboarding/refresh`,
        return_url: `${baseUrl}/onboarding/complete`,
        type: "account_onboarding",
      });

      res.json({ url: link.url });
    } catch (err) {
      console.error("createOnboardingLink error:", err);
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
);
