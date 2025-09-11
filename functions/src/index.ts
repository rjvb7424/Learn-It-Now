import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import corsLib from "cors";
import Stripe from "stripe";

admin.initializeApp();

const cors = corsLib({ origin: true });

const STRIPE_SECRET = process.env.STRIPE_SECRET;
// change to process.env.APP_BASE_URL during deployment
const APP_BASE_URL = "http://localhost:5173";

if (!STRIPE_SECRET) {
  console.warn("Missing functions config: stripe.secret_key");
}
if (!APP_BASE_URL) {
  console.warn("Missing functions config: app.base_url");
}

// No apiVersion to avoid TS union mismatch headaches
const stripe = new Stripe(STRIPE_SECRET || "");

type CreateAccountBody = { uid?: string; email?: string };

export const createConnectedAccount = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
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
      if (!STRIPE_SECRET) {
        res.status(500).json({ error: "Server not configured: stripe.secret_key missing" });
        return;
      }

      const userRef = admin.firestore().collection("users").doc(uid);
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
    } catch (err: unknown) {
      console.error("createConnectedAccount error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  });
});

type OnboardLinkBody = { accountId?: string };

export const createOnboardingLink = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
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
      if (!STRIPE_SECRET) {
        res.status(500).json({ error: "Server not configured: stripe.secret_key missing" });
        return;
      }
      if (!APP_BASE_URL) {
        res.status(500).json({ error: "Server not configured: app.base_url missing" });
        return;
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${APP_BASE_URL}/onboarding/refresh`,
        return_url: `${APP_BASE_URL}/onboarding/complete`,
        type: "account_onboarding",
      });

      res.json({ url: link.url });
    } catch (err: unknown) {
      console.error("createOnboardingLink error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  });
});
