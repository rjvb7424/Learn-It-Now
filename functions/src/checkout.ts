// functions/src/checkout.ts
import { onRequest } from "firebase-functions/v2/https";
import { getStripe, MIN_PRICE_EUR_CENTS, STRIPE_SECRET, FALLBACK_ORIGIN } from "./config";
import { buildUrl, normalizeOrigin } from "./url";
import { db } from "./firestore";
import { parseJson, sendBad, sendOk, toCents } from "./http";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import "./adminInit";

export const createCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, courseId } = parseJson<{ uid?: string; courseId?: string }>(req);
    if (!uid) { sendBad(res, "Missing uid"); return; }
    if (!courseId) { sendBad(res, "Missing courseId"); return; }

    // Load course (server-trusted)
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) { sendBad(res, "Course not found", 404); return; }

    const course = courseSnap.data() as {
      title?: string; description?: string; price?: number; isFree?: boolean; creatorUid?: string
    };

    if (!course.creatorUid) { sendBad(res, "Course missing creatorUid"); return; }
    if (course.isFree || !(course.price! > 0)) { sendBad(res, "Course is free"); return; }

    // Load creator connected account
    const creatorSnap = await db.doc(`users/${course.creatorUid}`).get();
    const creator = creatorSnap.data() as { stripeAccountId?: string; stripeOnboarded?: boolean } | undefined;
    if (!creator?.stripeAccountId || !creator?.stripeOnboarded) {
      sendBad(res, "Creator is not onboarded to Stripe"); return;
    }

    const SUCCESS_PATH = "/checkout/success";
    const origin = normalizeOrigin((req.headers.origin as string | undefined), FALLBACK_ORIGIN);
    const success_url = buildUrl(origin, `${SUCCESS_PATH}?course=${encodeURIComponent(courseId)}&session_id={CHECKOUT_SESSION_ID}`);
    const cancel_url  = buildUrl(origin, `/?canceled=1`);

    // ---------- Pricing ----------
    const currency = "eur";
    const baseAmount = toCents(course.price!);
    if (baseAmount < MIN_PRICE_EUR_CENTS) { sendBad(res, "Minimum course price is €1.00."); return; }
    const platformFee = Math.round(baseAmount * 0.30); // 30%

    // Human-readable description & grouping
    const chargeDescription =
      `Course: ${course.title || "Untitled"} CourseID: ${courseId} BuyerUID: ${uid} CreatorUID: ${course.creatorUid}`;
    const transferGroup = `course:${courseId}`;

    // 🔁 REMOVE transfer_data here (let's not auto-transfer at payment time)
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    success_url,
    cancel_url,
    customer_creation: "always",
    client_reference_id: uid,
    line_items: [
      /* ... your two items (base + 30% fee) ... */
    ],
    payment_intent_data: {
      // ❌ transfer_data: { destination: creator.stripeAccountId! },  <-- delete this line
      application_fee_amount: platformFee,  // ✅ you still collect your 30%

      // (nice-to-have clarity)
      description: chargeDescription,
      statement_descriptor_suffix: "LEARN IT NOW",
      transfer_group: transferGroup,
      metadata: {
        uid, courseId, creatorUid: course.creatorUid!,
        baseAmountCents: String(baseAmount),
        platformFeeCents: String(platformFee),
        currency,
      },
    },
    metadata: { uid, courseId, transferGroup },
  });


    // use session so TS doesn’t complain it’s unused
    sendOk(res, { url: session.url, id: session.id, totalAmount: baseAmount + platformFee });
    return;
  } catch (err) {
    logger.error("createCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
    return;
  }
});

export const finalizeCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, sessionId } = parseJson<{ uid?: string; sessionId?: string }>(req);
    if (!uid) { sendBad(res, "Missing uid"); return; }
    if (!sessionId) { sendBad(res, "Missing sessionId"); return; }

    const s = getStripe();

    // 1) Retrieve session + expand to get charge + balance transaction (for real Stripe fee)
    const session = await s.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "payment_intent.latest_charge.balance_transaction"],
    });
    if (!session || session.mode !== "payment") { sendBad(res, "Invalid session"); return; }

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (!pi) { sendBad(res, "Missing payment_intent"); return; }

    const paid = session.payment_status === "paid" || pi.status === "succeeded";
    if (!paid) { sendBad(res, "Payment not completed"); return; }

    // 2) Get metadata
    const courseId = (session.metadata?.courseId || (pi.metadata as any)?.courseId) as string | undefined;
    const metaUid  = (session.metadata?.uid      || (pi.metadata as any)?.uid)      as string | undefined;
    if (!courseId || !metaUid || metaUid !== uid) { sendBad(res, "Metadata missing or UID mismatch"); return; }

    // 3) Load course & creator
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) { sendBad(res, "Course not found"); return; }
    const course = courseSnap.data() as { price?: number; creatorUid?: string };

    if (!course?.creatorUid) { sendBad(res, "Course missing creatorUid"); return; }
    const creatorSnap = await db.doc(`users/${course.creatorUid}`).get();
    const creatorAccountId = (creatorSnap.data() as any)?.stripeAccountId as string | undefined;
    if (!creatorAccountId) { sendBad(res, "Creator has no Stripe account"); return; }

    // 4) Amounts
    const baseAmountCents = toCents(course.price ?? 0);
    const applicationFeeCents = typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : 0;

    // 5) Actual Stripe processing fee from the charge's balance transaction
    let processingFeeCents = 0;
    const latestCharge = pi.latest_charge as string | Stripe.Charge | null | undefined;
    let bt: string | Stripe.BalanceTransaction | null | undefined;

    if (latestCharge && typeof latestCharge !== "string") {
      bt = latestCharge.balance_transaction as string | Stripe.BalanceTransaction | null | undefined;
    }
    if (bt && typeof bt !== "string") {
      processingFeeCents = bt.fee ?? 0;
    } else if (typeof bt === "string") {
      const btObj = await s.balanceTransactions.retrieve(bt);
      processingFeeCents = btObj.fee ?? 0;
    } else if (typeof latestCharge === "string") {
      const chargeObj = await s.charges.retrieve(latestCharge, { expand: ["balance_transaction"] });
      const btx = chargeObj.balance_transaction as string | Stripe.BalanceTransaction | null | undefined;
      if (btx && typeof btx !== "string") processingFeeCents = btx.fee ?? 0;
      else if (typeof btx === "string") {
        const btObj = await s.balanceTransactions.retrieve(btx);
        processingFeeCents = btObj.fee ?? 0;
      }
    }

    // 6) Create manual transfer to creator: base - Stripe processing fee (never negative)
    const transferAmountCents = Math.max(0, baseAmountCents - processingFeeCents);
    const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
    if (!chargeId) { sendBad(res, "Missing charge id"); return; }

    const transfer = await s.transfers.create({
      amount: transferAmountCents,
      currency: (session.currency || "eur").toLowerCase(),
      destination: creatorAccountId,
      source_transaction: chargeId,
      transfer_group: session.metadata?.transferGroup || `course:${courseId}`,
      metadata: { courseId, creatorUid: course.creatorUid!, baseAmountCents: String(baseAmountCents) },
    });

    // 7) Compute your actual profit (your 30% − Stripe fee on the charge)
    const platformNetCents = Math.max(0, applicationFeeCents - processingFeeCents);

    // 8) Persist purchase
    const totalCents  = session.amount_total ?? 0; // buyer paid (base + your fee)
    const currency    = (session.currency || "EUR").toUpperCase();
    const customerId  = typeof session.customer === "string" ? session.customer : session.customer?.id;

    await db.doc(`users/${uid}/purchases/${courseId}`).set({
      acquiredAt: FieldValue.serverTimestamp(),
      currentLessonIndex: 0,

      amount: totalCents / 100,                 // total paid by buyer
      currency,

      platformFee: applicationFeeCents / 100,              // your 30% gross
      platformProcessingActual: processingFeeCents / 100,  // Stripe processing fee on the charge
      platformNet: platformNetCents / 100,                 // your profit
      creatorGross: transferAmountCents / 100,             // what creator actually received

      stripe: {
        sessionId: session.id,
        paymentIntentId: pi.id,
        customerId: customerId ?? null,
        chargeId,
        transferId: transfer.id,
      },
    }, { merge: true });

    sendOk(res, { ok: true, courseId, customerId });
    return;
  } catch (err) {
    logger.error("finalizeCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
    return;
  }
});
