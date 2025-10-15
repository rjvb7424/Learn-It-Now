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

// CREATE CHECKOUT — charge on PLATFORM, then net transfer (base - processing fee) to creator
export const createCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, courseId } = parseJson<{ uid?: string; courseId?: string }>(req);
    if (!uid) { sendBad(res, "Missing uid"); return; }
    if (!courseId) { sendBad(res, "Missing courseId"); return; }

    // Load course
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
    const creatorAccountId = creator.stripeAccountId;

    // Success/Cancel URLs
    const SUCCESS_PATH = "/checkout/success";
    const origin = normalizeOrigin((req.headers.origin as string | undefined), FALLBACK_ORIGIN);
    const success_url = buildUrl(origin, `${SUCCESS_PATH}?course=${encodeURIComponent(courseId)}&session_id={CHECKOUT_SESSION_ID}`);
    const cancel_url  = buildUrl(origin, `/?canceled=1`);

    // Pricing (EUR)
    const currency = "eur";
    const baseAmount = toCents(course.price!);
    if (baseAmount < MIN_PRICE_EUR_CENTS) { sendBad(res, "Minimum course price is €1.00."); return; }
    const platformFee = Math.round(baseAmount * 0.30); // 30%

    // Dashboard strings
    const chargeDescription =
      `Course: ${course.title || "Untitled"} CourseID: ${courseId} BuyerUID: ${uid} CreatorUID: ${course.creatorUid}`;
    const transferGroup = `course:${courseId}`;

    // IMPORTANT: Create the Session on the PLATFORM (destination-style settlement after)
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,
      customer_creation: "always",
      client_reference_id: uid,

      // Optional split visibility for buyers
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: baseAmount,
            product_data: {
              name: course.title || "Course",
              description: (course.description || "").slice(0, 500),
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: platformFee,
            product_data: {
              name: "Service fee (30%)",
              description: "Platform service fee",
            },
          },
        },
      ],

      // Put the important info on the PI so we can compute & transfer later
      payment_intent_data: {
        transfer_group: transferGroup,
        description: chargeDescription,
        metadata: {
          uid,
          courseId,
          creatorUid: course.creatorUid!,
          creatorAccountId,
          baseAmountCents: String(baseAmount),
          platformFeeCents: String(platformFee),
          currency,
        },
      },

      // Session metadata (handy redundancy)
      metadata: { uid, courseId, transferGroup, creatorAccountId, baseAmountCents: String(baseAmount), platformFeeCents: String(platformFee) },
    });

    // Map session -> creator account for finalize
    await db.doc(`checkoutSessions/${session.id}`).set({
      courseId,
      creatorAccountId,
      baseAmountCents: baseAmount,
      platformFeeCents: platformFee,
      currency,
      transferGroup,
      createdAt: FieldValue.serverTimestamp(),
    });

    sendOk(res, { url: session.url, id: session.id, totalAmount: baseAmount + platformFee });
  } catch (err) {
    logger.error("createCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
  }
});

// FINALIZE — read the session & PI from the PLATFORM account, then transfer (base - processingFee) to creator, grant access
export const finalizeCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, sessionId } = parseJson<{ uid?: string; sessionId?: string }>(req);
    if (!uid) { sendBad(res, "Missing uid"); return; }
    if (!sessionId) { sendBad(res, "Missing sessionId"); return; }

    // Look up mapping data saved at checkout time
    const linkSnap = await db.doc(`checkoutSessions/${sessionId}`).get();
    if (!linkSnap.exists) { sendBad(res, "Unknown session"); return; }
    const { courseId, creatorAccountId, baseAmountCents, platformFeeCents, currency, transferGroup } =
      linkSnap.data() as { courseId: string; creatorAccountId: string; baseAmountCents: number; platformFeeCents: number; currency: string; transferGroup: string };

    const stripe = getStripe();

    // Retrieve the Session & expand to reach balance transaction (platform-side)
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ["payment_intent", "payment_intent.latest_charge.balance_transaction"] }
    );
    if (!session || session.mode !== "payment") { sendBad(res, "Invalid session"); return; }

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (!pi) { sendBad(res, "Missing payment_intent"); return; }

    // Confirm paid
    const paid = session.payment_status === "paid" || pi.status === "succeeded";
    if (!paid) { sendBad(res, "Payment not completed"); return; }

    // Optional sanity check
    const metaUid = (session.metadata?.uid || (pi.metadata as any)?.uid) as string | undefined;
    if (metaUid && metaUid !== uid) { sendBad(res, "UID mismatch"); return; }

    // We expanded latest_charge.balance_transaction when fetching the Session
    // (see the retrieve call below)
    const latestCharge = pi.latest_charge as Stripe.Charge | string | null;
    if (!latestCharge) { sendBad(res, "Missing charge"); return; }

    let chargeObj: Stripe.Charge;
    if (typeof latestCharge === "string") {
      // Fallback if for some reason it wasn’t expanded
      chargeObj = await stripe.charges.retrieve(latestCharge);
    } else {
      chargeObj = latestCharge;
    }

    let processingFeeCents = 0;
    const bt = chargeObj.balance_transaction as Stripe.BalanceTransaction | string | null | undefined;
    if (bt && typeof bt !== "string") {
      processingFeeCents = bt.fee ?? 0; // expanded balance transaction
    } else if (typeof bt === "string") {
      // fetch if we only got the ID
      const fetched = await stripe.balanceTransactions.retrieve(bt);
      processingFeeCents = fetched.fee;
    }

    // Compute exact Stripe fee for the total charge
    const grossCents = chargeObj.amount;                // total captured (base + platformFee)
    const totalFeeCents = processingFeeCents;           // from balance transaction

    // Sanity guards
    const base = Math.max(Number(baseAmountCents) || 0, 0);
    const plat = Math.max(Number(platformFeeCents) || 0, 0);
    const gross = Math.max(grossCents || base + plat, base + plat);

    // Prorate Stripe's total fee between base and platform fee so the creator
    // only pays the portion attributable to the base amount.
    const feeOnBase = Math.min(Math.round(totalFeeCents * (base / (gross || 1))), totalFeeCents);
    const feeOnPlatform = totalFeeCents - feeOnBase;

    // Creator payout = base - fee_on_base (never negative)
    const payout = Math.max(base - feeOnBase, 0);

    // --- Transfer payout to creator ---
    const idemKey = `transfer:${sessionId}`;
    if (payout > 0) {
      await stripe.transfers.create(
        {
          amount: payout,
          currency: currency || "eur",
          destination: creatorAccountId,
          transfer_group: transferGroup || `course:${courseId}`,
          metadata: {
            sessionId,
            courseId,
            uid,
            baseAmountCents: String(base),
            platformFeeCents: String(plat),
            grossChargeCents: String(gross),
            totalProcessingFeeCents: String(totalFeeCents),
            processingFeeOnBaseCents: String(feeOnBase),
            processingFeeOnPlatformCents: String(feeOnPlatform),
          },
        },
        { idempotencyKey: idemKey }
      );
    }


    // Grant access
    await db.doc(`users/${uid}/purchases/${courseId}`).set(
      {
        acquiredAt: FieldValue.serverTimestamp(),
        currentLessonIndex: 0,
      },
      { merge: true }
    );

    sendOk(res, {
      ok: true,
      courseId,
      customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      creatorPayoutCents: payout,
      processingFeeCents: totalFeeCents,
      platformFeeCents,
    });
  } catch (err) {
    logger.error("finalizeCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
  }
});
