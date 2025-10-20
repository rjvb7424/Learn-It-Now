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

    const acct = await getStripe().accounts.retrieve(accountId);

    // Strict completion condition (recommended):
    const onboarded =
      !!(acct as any).details_submitted &&
      (acct.requirements?.currently_due?.length ?? 0) === 0 &&
      !!acct.charges_enabled &&
      !!acct.payouts_enabled;

    sendOk(res, { accountId: acct.id, onboarded });
    } catch (e: any) {
    sendBad(res, e?.message ?? "Unknown error", 500);
    }
});
