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
      accountId = (snap.data() as UserDoc | undefined)?.stripeAccountId || undefined;
    }
    if (!accountId) { sendBad(res, "No Stripe account found"); return; }

    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(accountId);

    const detailsSubmitted = (acct as any).details_submitted === true;
    const currentlyDue = acct.requirements?.currently_due ?? [];

    // ✅ Treat onboarding as complete when the user has submitted details
    // and Stripe has nothing CURRENTLY due (because you used collect: "currently_due")
    const onboarded = detailsSubmitted && currentlyDue.length === 0;

    sendOk(res, {
      accountId: acct.id,
      onboarded,
      details_submitted: detailsSubmitted,
      charges_enabled: !!acct.charges_enabled,
      payouts_enabled: !!acct.payouts_enabled,
      currently_due: currentlyDue,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    sendBad(res, msg, 500);
  }
});
