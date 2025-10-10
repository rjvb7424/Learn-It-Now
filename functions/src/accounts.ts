import { onRequest } from "firebase-functions/v2/https";
import { getStripe, STRIPE_SECRET, FALLBACK_ORIGIN } from "./config";
import { buildUrl, normalizeOrigin } from "./url";
import { logError, parseJson, sendBad, sendOk } from "./http";
import { getUserDoc, upsertUser, type UserDoc } from "./firestore";
import { splitName } from "./people";
import type Stripe from "stripe";

// ---------- createAccount (prefill business_profile) ----------
export const createAccount = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
try {
const { uid } = parseJson<{ uid?: string }>(req);
if (!uid) { sendBad(res, "Missing uid"); return; }

const { snap } = await getUserDoc(uid);
if (!snap.exists) { sendBad(res, "User not found", 404); return; }
const user = snap.data() as UserDoc;

const origin = normalizeOrigin((req.headers.origin as string | undefined), FALLBACK_ORIGIN);
void origin; // kept in case you later need it for redirects/logging

const { first_name, last_name } = splitName(user.displayName);
const params: Stripe.AccountCreateParams | Stripe.AccountUpdateParams = {
business_type: "individual",
email: user.email,
individual: { first_name, last_name, email: user.email },
business_profile: {
url: "https://learnitnow.net",
product_description: "Online courses sold on Learn It Now",
mcc: "8299",
},
capabilities: {
card_payments: { requested: true },
transfers: { requested: true },
},
};

const s = getStripe();
let accountId = user.stripeAccountId;

if (accountId) {
await s.accounts.update(accountId, params as Stripe.AccountUpdateParams);
} else {
const acct = await s.accounts.create({ type: "express", ...(params as Stripe.AccountCreateParams) });
accountId = acct.id;
await upsertUser(uid, { stripeAccountId: accountId, stripeOnboarded: false });
}

sendOk(res, { accountId });
} catch (err) {
logError("createAccount", err);
sendBad(res, (err as any)?.message || "Unknown error", 500);
}
});

// ---------- createAccountLink (collect only what's due) ----------
export const createAccountLink = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
try {
const { accountId: bodyId, uid } = parseJson<{ accountId?: string; uid?: string }>(req);

let accountId = bodyId;
if (!accountId && uid) {
const { snap } = await getUserDoc(uid);
accountId = (snap.data() as UserDoc | undefined)?.stripeAccountId;
}
if (!accountId) {
  sendBad(res, "Missing accountId or uid");
  return;
}

const origin = normalizeOrigin((req.headers.origin as string | undefined), FALLBACK_ORIGIN);
const return_url = buildUrl(origin, `/return/${accountId}`);
const refresh_url = buildUrl(origin, `/refresh/${accountId}`);

const link = await getStripe().accountLinks.create({
  account: accountId,
  type: "account_onboarding",
  collect: "currently_due",
  return_url,
  refresh_url,
});

sendOk(res, { url: link.url, expires_at: link.expires_at });
} catch (err) {
  logError("createAccountLink", err);
  sendBad(res, (err as any)?.message || "Unknown error", 500);
}
});

export const createStripeLoginLink = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, accountId: bodyId } = parseJson<{ uid?: string; accountId?: string }>(req);
    if (!uid && !bodyId) { sendBad(res, "Missing uid or accountId"); return; }

    let accountId = bodyId;
    if (!accountId && uid) {
      const { snap } = await getUserDoc(uid);
      accountId = (snap.data() as UserDoc | undefined)?.stripeAccountId;
      if (!accountId) { sendBad(res, "No Stripe account for user", 404); return; }
    }

    // Optional consistency check
    if (uid && accountId) {
      const { snap } = await getUserDoc(uid);
      const saved = (snap.data() as UserDoc | undefined)?.stripeAccountId;
      if (saved && saved !== accountId) { sendBad(res, "Account mismatch", 403); return; }
    }

    const link = await getStripe().accounts.createLoginLink(accountId!);
    sendOk(res, { url: link.url });
    return;
  } catch (err) {
    logError("createStripeLoginLink", err);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
    return;
  }
});
