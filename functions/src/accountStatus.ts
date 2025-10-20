// functions/src/accountStatus.ts
import { onRequest } from "firebase-functions/v2/https";
import { getStripe, STRIPE_SECRET } from "./config";
import { getUserDoc, type UserDoc } from "./firestore";
import { parseJson, sendBad, sendOk } from "./http";

export const accountStatus = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, accountId: bodyId } = parseJson<{ uid?: string; accountId?: string }>(req);
    if (!uid && !bodyId) { sendBad(res, "Missing uid or accountId"); return; }

    let accountId = bodyId;
    if (!accountId && uid) {
      const { snap } = await getUserDoc(uid);
      accountId = (snap.data() as UserDoc | undefined)?.stripeAccountId;
    }
    if (!accountId) { sendBad(res, "No Stripe account found"); return; }

    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(accountId);

    const currentlyDue = acct.requirements?.currently_due ?? [];
    const futureCurrentlyDue = (acct as any).future_requirements?.currently_due ?? [];
    const disabledReason = acct.requirements?.disabled_reason ?? null;

    const onboarded =
      !!(acct as any).details_submitted &&
      currentlyDue.length === 0 &&
      futureCurrentlyDue.length === 0 &&
      !!acct.charges_enabled &&
      !!acct.payouts_enabled &&
      !disabledReason;

    sendOk(res, { accountId: acct.id, onboarded });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    sendBad(res, msg, 500);
  }
});
