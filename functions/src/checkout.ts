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

// CREATE CHECKOUT — DIRECT CHARGE on the creator's connected account + application fee to platform
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

    // (Optional but helpful) verify creator has card_payments capability for direct charges
    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(creatorAccountId);
    const cp = (acct as any)?.capabilities?.card_payments;
    if (cp !== "active") {
      sendBad(res, "Creator cannot accept direct charges (card_payments capability not active)."); return;
    }

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

    // Create the Session ON THE CONNECTED ACCOUNT (Direct charge) with an application fee to your platform
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url,
        cancel_url,
        customer_creation: "always",
        client_reference_id: uid,

        // Optional: show split to buyer (two line items)
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

        payment_intent_data: {
          // This moves 30% to YOUR platform the moment the charge succeeds
          application_fee_amount: platformFee,

          // DO NOT set on_behalf_of here when creating on the connected account
          transfer_group: transferGroup,
          description: chargeDescription,
          metadata: {
            uid,
            courseId,
            creatorUid: course.creatorUid!,
            baseAmountCents: String(baseAmount),
            platformFeeCents: String(platformFee),
            currency,
          },
        },

        // also on the session
        metadata: { uid, courseId, transferGroup },
      },
      { stripeAccount: creatorAccountId } // 👈 DIRECT charge context
    );

    // Save a tiny mapping so finalize knows which connected account to read from
    await db.doc(`checkoutSessions/${session.id}`).set({
      courseId,
      creatorAccountId,
      createdAt: FieldValue.serverTimestamp(),
    });

    sendOk(res, { url: session.url, id: session.id, totalAmount: baseAmount + platformFee });
  } catch (err) {
    logger.error("createCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
  }
});

// FINALIZE — read the session from the CONNECTED account, then grant access (no manual transfers needed)
export const finalizeCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res) => {
  try {
    const { uid, sessionId } = parseJson<{ uid?: string; sessionId?: string }>(req);
    if (!uid) { sendBad(res, "Missing uid"); return; }
    if (!sessionId) { sendBad(res, "Missing sessionId"); return; }

    // Look up which connected account the session belongs to
    const linkSnap = await db.doc(`checkoutSessions/${sessionId}`).get();
    if (!linkSnap.exists) { sendBad(res, "Unknown session"); return; }
    const { courseId, creatorAccountId } = linkSnap.data() as { courseId: string; creatorAccountId: string };

    const s = getStripe();

    // Retrieve session from the CONNECTED account
    const session = await s.checkout.sessions.retrieve(
      sessionId,
      { expand: ["payment_intent"] },
      { stripeAccount: creatorAccountId }
    );
    if (!session || session.mode !== "payment") { sendBad(res, "Invalid session"); return; }

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (!pi) { sendBad(res, "Missing payment_intent"); return; }

    const paid = session.payment_status === "paid" || pi.status === "succeeded";
    if (!paid) { sendBad(res, "Payment not completed"); return; }

    // (Optional sanity check)
    const metaUid = (session.metadata?.uid || (pi.metadata as any)?.uid) as string | undefined;
    if (metaUid && metaUid !== uid) { sendBad(res, "UID mismatch"); return; }

    // ✅ Direct charge economics:
    // - App fee (30%) is automatically sent to your platform.
    // - Stripe fees are deducted from the connected account.
    // - Remaining funds stay on the connected account and pay out on their schedule.
    // No manual transfer is needed here.

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
      paymentIntentId: typeof pi === "string" ? pi : pi.id,
      connectedAccountId: creatorAccountId,
    });
  } catch (err) {
    logger.error("finalizeCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
  }
});
