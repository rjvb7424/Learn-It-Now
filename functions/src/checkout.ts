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

// FINALIZE — read the Session on PLATFORM, transfer payout to creator from the charge, grant access
export const finalizeCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, sessionId } = parseJson<{ uid?: string; sessionId?: string }>(req);
    if (!uid) { sendBad(res, "Missing uid"); return; }
    if (!sessionId) { sendBad(res, "Missing sessionId"); return; }

    const stripe = getStripe();

    // 1) Load our mapping (for amounts etc.)
    const linkSnap = await db.doc(`checkoutSessions/${sessionId}`).get();
    if (!linkSnap.exists) { sendBad(res, "Unknown session"); return; }
    const link = linkSnap.data() as {
      courseId: string;
      creatorAccountId: string;
      baseAmountCents: number;
      platformFeeCents: number;
      currency: string;
      transferGroup: string;
    };
    const { courseId, baseAmountCents, platformFeeCents, transferGroup } = link;

    // 2) Re-confirm creator account id from the course->user doc (avoid stale/mismatched IDs)
    const courseDoc = await db.doc(`courses/${courseId}`).get();
    if (!courseDoc.exists) { sendBad(res, "Course not found"); return; }
    const course = courseDoc.data() as { creatorUid?: string };
    if (!course?.creatorUid) { sendBad(res, "Course missing creatorUid"); return; }

    const creatorDoc = await db.doc(`users/${course.creatorUid}`).get();
    if (!creatorDoc.exists) { sendBad(res, "Creator not found"); return; }
    const creator = creatorDoc.data() as { stripeAccountId?: string; stripeOnboarded?: boolean };
    const creatorAccountId = creator?.stripeAccountId;
    if (!creatorAccountId || !creator?.stripeOnboarded) {
      sendBad(res, "Creator is not onboarded to Stripe"); return;
    }

    // 3) Retrieve Session & PI from PLATFORM and expand the latest charge & its balance txn
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ["payment_intent", "payment_intent.latest_charge.balance_transaction"] }
    );
    if (!session || session.mode !== "payment") { sendBad(res, "Invalid session"); return; }

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (!pi) { sendBad(res, "Missing payment_intent"); return; }

    const paid = session.payment_status === "paid" || pi.status === "succeeded";
    if (!paid) { sendBad(res, "Payment not completed"); return; }

    // (Optional) sanity check UID
    const metaUid = (session.metadata?.uid || (pi.metadata as any)?.uid) as string | undefined;
    if (metaUid && metaUid !== uid) { sendBad(res, "UID mismatch"); return; }

    // 4) Charge object (expanded). Fallback retrieve if needed.
    const latestCharge = pi.latest_charge as Stripe.Charge | string | null;
    if (!latestCharge) { sendBad(res, "Missing charge"); return; }
    const chargeObj: Stripe.Charge = typeof latestCharge === "string"
      ? await stripe.charges.retrieve(latestCharge)
      : latestCharge;

    // Real processing fee from the balance transaction
    let totalFeeCents = 0;
    const bt = chargeObj.balance_transaction as Stripe.BalanceTransaction | string | null | undefined;
    if (bt && typeof bt !== "string") {
      totalFeeCents = bt.fee ?? 0;
    } else if (typeof bt === "string") {
      const fetched = await stripe.balanceTransactions.retrieve(bt);
      totalFeeCents = fetched.fee;
    }

    // Amounts
    const base = Math.max(Number(baseAmountCents) || 0, 0);
    const plat = Math.max(Number(platformFeeCents) || 0, 0);
    const gross = Math.max(chargeObj.amount || base + plat, base + plat);
    const chargeCurrency = chargeObj.currency || "eur";

    // Prorate fee so creator only pays fee on base
    const feeOnBase = Math.min(Math.round(totalFeeCents * (base / (gross || 1))), totalFeeCents);
    const feeOnPlatform = totalFeeCents - feeOnBase;
    const payout = Math.max(base - feeOnBase, 0);

    // 5) Validate connected account can receive transfers
    const acct = await stripe.accounts.retrieve(creatorAccountId);
    const acctType = (acct as any)?.type; // "standard" | "express" | "custom"
    const transfersCap = (acct as any)?.capabilities?.transfers;

    // Transfers API is NOT supported for Standard accounts
    if (acctType === "standard") {
      sendBad(res,
        "Creator account is a Standard Connect account; transfers are not supported. " +
        "Use Direct charges with application_fee_amount, or switch creators to Express."
      );
      return;
    }

    // For Express/Custom we also require transfers capability
    const canTransfer = transfersCap === "active" || transfersCap === "pending";
    if (!canTransfer) {
      sendBad(res, "Creator account cannot receive transfers (transfers capability not active). Ask the creator to finish onboarding.");
      return;
    }

    // 6) Create the transfer FROM THIS CHARGE so it lands immediately in the connected balance
    const idemKey = `transfer:${sessionId}`;
    let transfer: Stripe.Response<Stripe.Transfer> | null = null;

    try {
      transfer = await stripe.transfers.create(
        {
          amount: payout,
          currency: chargeCurrency,
          destination: creatorAccountId,
          transfer_group: transferGroup || `course:${courseId}`,
          source_transaction: chargeObj.id, // key bit
          metadata: {
            sessionId,
            courseId,
            uid,
            creatorUid: course.creatorUid!,
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
    } catch (e: any) {
      // Some payment methods don’t allow source_transaction; fall back to a normal transfer
      if (e?.type === "invalid_request_error" || e?.code === "parameter_unknown") {
        transfer = await stripe.transfers.create(
          {
            amount: payout,
            currency: chargeCurrency,
            destination: creatorAccountId,
            transfer_group: transferGroup || `course:${courseId}`,
            metadata: {
              sessionId,
              courseId,
              uid,
              creatorUid: course.creatorUid!,
              baseAmountCents: String(base),
              platformFeeCents: String(plat),
              grossChargeCents: String(gross),
              totalProcessingFeeCents: String(totalFeeCents),
              processingFeeOnBaseCents: String(feeOnBase),
              processingFeeOnPlatformCents: String(feeOnPlatform),
              fallback_without_source_transaction: "true",
            },
          },
          { idempotencyKey: idemKey }
        );
      } else {
        logger.error("transfer.create failed", e);
        sendBad(res, e?.message || "Failed to transfer to creator");
        return;
      }
    }

    // 7) Grant access
    await db.doc(`users/${uid}/purchases/${courseId}`).set(
      { acquiredAt: FieldValue.serverTimestamp(), currentLessonIndex: 0 },
      { merge: true }
    );

    sendOk(res, {
      ok: true,
      courseId,
      chargeId: chargeObj.id,
      transferId: transfer?.id ?? null,
      customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      creatorPayoutCents: payout,
      processingFeeCents: totalFeeCents,
      processingFeeOnBaseCents: feeOnBase,
      processingFeeOnPlatformCents: feeOnPlatform,
      platformFeeCents: plat,
      currency: chargeCurrency,
      creatorAccountId,
      accountType: acctType,
      transfersCapability: transfersCap,
    });
  } catch (err) {
    logger.error("finalizeCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
  }
});
