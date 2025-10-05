import Stripe from "stripe";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
export { createCheckout, finalizeCheckout } from "./checkout";
import "./adminInit";

const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const stripe = () => new Stripe(STRIPE_SECRET.value());

/** build absolute URLs from origin */
const isValidUrl = (u?: string | null) => { try { new URL(String(u)); return true; } catch { return false; } };
const normalizeOrigin = (raw?: string) => {
  const fallback = "http://localhost:5173";
  const url = new URL(isValidUrl(raw) ? String(raw) : fallback);
  if (!/^localhost|127\.0\.0\.1$/i.test(url.hostname)) url.protocol = "https:"; // force https off localhost
  return `${url.protocol}//${url.host}`;
};
const buildUrl = (origin: string, path: string) => new URL(path, origin).toString();

function splitName(displayName?: string) {
  if (!displayName) return { first_name: undefined, last_name: undefined };
  const parts = displayName.trim().split(/\s+/);
  return parts.length === 1
    ? { first_name: parts[0], last_name: undefined }
    : { first_name: parts.slice(0, -1).join(" "), last_name: parts.at(-1) };
}

// ---------- createAccount (PREFILL business_profile) ----------
export const createAccount = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res): Promise<void> => {
  try {
    const { uid, origin: originFromClient } = (req.body ?? {}) as { uid?: string; origin?: string };
    if (!uid) { res.status(400).json({ error: "Missing uid" }); return; }

    const db = getFirestore();
    const snap = await db.doc(`users/${uid}`).get();
    if (!snap.exists) { res.status(404).json({ error: "User not found" }); return; }
    const user = snap.data() as { displayName?: string; email?: string; stripeAccountId?: string };

    const origin = normalizeOrigin(originFromClient || (req.headers.origin as string | undefined));

    const { first_name, last_name } = splitName(user.displayName);
    const params: Stripe.AccountCreateParams | Stripe.AccountUpdateParams = {
      business_type: "individual",
      email: user.email,
      individual: { first_name, last_name, email: user.email },
      business_profile: {
        url: "https://learnitnow.net",                       // ✅ prefill website
        product_description: "Online courses sold on Learn It Now", // ✅ prefill description
        mcc: "8299",                           // ✅ Educational services → preselects industry
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
    };

    const s = stripe();
    let accountId = user.stripeAccountId;

    if (accountId) {
      await s.accounts.update(accountId, params as Stripe.AccountUpdateParams);
    } else {
      const acct = await s.accounts.create({ type: "express", ...(params as Stripe.AccountCreateParams) });
      accountId = acct.id;
      await db.doc(`users/${uid}`).set({ stripeAccountId: accountId, stripeOnboarded: false }, { merge: true });
    }

    res.json({ accountId });
  } catch (err: any) {
    // log verbosely so we see which param (if any) failed
    try { console.error("createAccount", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { console.error("createAccount", err); }
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});

// ---------- createAccountLink (collect only what's due) ----------
export const createAccountLink = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res): Promise<void> => {
  try {
    const { accountId: bodyId, uid, origin: originFromClient } =
      (req.body ?? {}) as { accountId?: string; uid?: string; origin?: string };

    const db = getFirestore();
    let accountId = bodyId;
    if (!accountId && uid) {
      const snap = await db.doc(`users/${uid}`).get();
      accountId = snap.data()?.stripeAccountId;
    }
    if (!accountId) { res.status(400).json({ error: "Missing accountId or uid" }); return; }

    const origin = normalizeOrigin(originFromClient || (req.headers.origin as string | undefined));
    const return_url  = buildUrl(origin, `/return/${accountId}`);
    const refresh_url = buildUrl(origin, `/refresh/${accountId}`);

    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      collect: "currently_due",               // ✅ only ask for fields still required
      return_url,
      refresh_url,
    });

    res.json({ url: link.url, expires_at: link.expires_at });
  } catch (err: any) {
    try { console.error("createAccountLink", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { console.error("createAccountLink", err); }
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});

// NEW: create a one-time login link for the creator's Express dashboard
export const createStripeLoginLink = onRequest(
  { secrets: [STRIPE_SECRET], cors: true },
  async (req, res): Promise<void> => {
    try {
      const { uid, accountId: bodyId, origin: originFromClient } =
        (req.body ?? {}) as { uid?: string; accountId?: string; origin?: string };

      if (!uid && !bodyId) {
        res.status(400).json({ error: "Missing uid or accountId" });
        return;
      }

      const db = getFirestore();
      let accountId = bodyId;

      // look up account from users/{uid} if not provided
      if (!accountId && uid) {
        const snap = await db.doc(`users/${uid}`).get();
        accountId = snap.data()?.stripeAccountId;
        if (!accountId) {
          res.status(404).json({ error: "No Stripe account for user" });
          return;
        }
      }

      // optional: verify uid ↔ account when both provided
      if (uid && accountId) {
        const snap = await db.doc(`users/${uid}`).get();
        if (snap.exists && snap.data()?.stripeAccountId && snap.data()?.stripeAccountId !== accountId) {
          res.status(403).json({ error: "Account mismatch" });
          return;
        }
      }

      const origin = normalizeOrigin(originFromClient || (req.headers.origin as string | undefined));
      // Stripe Express dashboard login links do not support redirect_url

      const link = await stripe().accounts.createLoginLink(accountId!);
      res.json({ url: link.url });
    } catch (err: any) {
      try { console.error("createStripeLoginLink", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
      catch { console.error("createStripeLoginLink", err); }
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  }
);
