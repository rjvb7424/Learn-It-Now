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
      `Course: ${course.title || "Untitled"} • CourseID: ${courseId} • BuyerUID: ${uid} • CreatorUID: ${course.creatorUid}`;
    const transferGroup = `course:${courseId}`;

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,
      customer_creation: "always",
      client_reference_id: uid,
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
        transfer_data: { destination: creator.stripeAccountId! },
        application_fee_amount: platformFee,

        // clearer dashboard/exports
        description: chargeDescription,
        statement_descriptor_suffix: "LEARN IT NOW", // ≤22 chars
        transfer_group: transferGroup,

        metadata: {
          uid,
          courseId,
          creatorUid: course.creatorUid!,
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

    // Expand to get actual Stripe processing fee from balance transaction
    const session = await s.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "payment_intent.latest_charge.balance_transaction"],
    });
    if (!session || session.mode !== "payment") { sendBad(res, "Invalid session"); return; }

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (!pi) { sendBad(res, "Missing payment_intent"); return; }

    const paid = session.payment_status === "paid" || pi.status === "succeeded";
    if (!paid) { sendBad(res, "Payment not completed"); return; }

    const courseId = (session.metadata?.courseId || (pi.metadata as any)?.courseId) as string | undefined;
    const metaUid  = (session.metadata?.uid      || (pi.metadata as any)?.uid)      as string | undefined;
    if (!courseId || !metaUid || metaUid !== uid) { sendBad(res, "Metadata missing or UID mismatch"); return; }

    // Integrity check (base + 30% fee)
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (courseSnap.exists && session.amount_total != null) {
      const base = toCents((courseSnap.data() as any)?.price ?? 0);
      const fee  = Math.round(base * 0.30);
      const expectedTotal = base + fee;
      if (expectedTotal !== session.amount_total) {
        logger.warn("Amount mismatch on finalize", { expectedTotal, got: session.amount_total, courseId, sessionId });
      }
    }

    // Application fee (your 30%)
    const applicationFeeCents = typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : 0;

    // Stripe processing fee (actual) from balance transaction
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
      if (btx && typeof btx !== "string") {
        processingFeeCents = btx.fee ?? 0;
      } else if (typeof btx === "string") {
        const btObj = await s.balanceTransactions.retrieve(btx);
        processingFeeCents = btObj.fee ?? 0;
      }
    }

    const customerId  = typeof session.customer === "string" ? session.customer : session.customer?.id;

    await db.doc(`users/${uid}/purchases/${courseId}`).set({
      acquiredAt: FieldValue.serverTimestamp(),
      currentLessonIndex: 0,
    }, { merge: true });

    sendOk(res, { ok: true, courseId, customerId });
    return;
  } catch (err) {
    logger.error("finalizeCheckout", err as any);
    sendBad(res, (err as any)?.message || "Unknown error", 500);
    return;
  }
});
