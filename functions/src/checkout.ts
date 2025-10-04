// functions/src/checkout.ts
import Stripe from "stripe";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const stripe = () => new Stripe(STRIPE_SECRET.value(), { apiVersion: "2025-08-27.basil" });

const isValidUrl = (u?: string | null) => { try { new URL(String(u)); return true; } catch { return false; } };
const normalizeOrigin = (raw?: string) => {
  const fallback = "http://localhost:5173";
  const url = new URL(isValidUrl(raw) ? String(raw) : fallback);
  if (!/^localhost|127\.0\.0\.1$/i.test(url.hostname)) url.protocol = "https:";
  return `${url.protocol}//${url.host}`;
};
const buildUrl = (origin: string, path: string) => new URL(path, origin).toString();
const cents = (n: number) => Math.max(0, Math.round(Number(n) * 100));

/**
 * POST /createCheckout
 * Body: { uid: string, courseId: string, origin?: string }
 * Creates a Checkout Session that pays the creator (destination charge).
 */
export const createCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res): Promise<void> => {
  try {
    const { uid, courseId, origin: originFromClient } =
      (req.body ?? {}) as { uid?: string; courseId?: string; origin?: string };

    if (!uid)      { res.status(400).json({ error: "Missing uid" }); return; }
    if (!courseId) { res.status(400).json({ error: "Missing courseId" }); return; }

    const db = getFirestore();

    // Load course (server-trusted)
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) { res.status(404).json({ error: "Course not found" }); return; }
    const course = courseSnap.data() as { title?: string; description?: string; price?: number; isFree?: boolean; creatorUid?: string };

    if (!course.creatorUid)                        { res.status(400).json({ error: "Course missing creatorUid" }); return; }
    if (course.isFree || !(course.price! > 0))     { res.status(400).json({ error: "Course is free" }); return; }

    // Load creator's connected account
    const creatorSnap = await db.doc(`users/${course.creatorUid}`).get();
    const creator = creatorSnap.data() as { stripeAccountId?: string; stripeOnboarded?: boolean };
    if (!creator?.stripeAccountId || !creator?.stripeOnboarded) {
      res.status(400).json({ error: "Creator is not onboarded to Stripe" });
      return;
    }

    const origin = normalizeOrigin(originFromClient || (req.headers.origin as string | undefined));
    const success_url = buildUrl(origin, `/checkout/success?course=${encodeURIComponent(courseId)}&session_id={CHECKOUT_SESSION_ID}`);
    const cancel_url  = buildUrl(origin, `/?canceled=1`);

    const amount   = cents(course.price!);
    const currency = "eur"; // change to "gbp"/"usd" if you prefer
    const platformFee = 0;  // set >0 (in cents) if/when you take a fee

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: course.title || "Course",
            description: (course.description || "").slice(0, 500),
          },
        },
      }],
      payment_intent_data: {
        transfer_data: { destination: creator.stripeAccountId! },
        ...(platformFee > 0 ? { application_fee_amount: platformFee } : {}),
        metadata: { uid, courseId },
      },
      metadata: { uid, courseId },
    });

    res.json({ url: session.url, id: session.id });
  } catch (err: any) {
    try { logger.error("createCheckout", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { logger.error("createCheckout", err); }
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});

/**
 * POST /finalizeCheckout
 * Body: { uid: string, sessionId: string }
 * Server verifies the session is paid, then grants access in Firestore.
 */
export const finalizeCheckout = onRequest({ secrets: [STRIPE_SECRET], cors: true }, async (req, res): Promise<void> => {
  try {
    const { uid, sessionId } = (req.body ?? {}) as { uid?: string; sessionId?: string };
    if (!uid)       { res.status(400).json({ error: "Missing uid" }); return; }
    if (!sessionId) { res.status(400).json({ error: "Missing sessionId" }); return; }

    const s = stripe();
    const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });

    if (!session || session.mode !== "payment") { res.status(400).json({ error: "Invalid session" }); return; }

    const pi = typeof session.payment_intent === "string"
      ? await s.paymentIntents.retrieve(session.payment_intent)
      : session.payment_intent;

    const paid = session.payment_status === "paid" || pi?.status === "succeeded";
    if (!paid) { res.status(400).json({ error: "Payment not completed" }); return; }

    const courseId = (session.metadata?.courseId || (pi?.metadata as any)?.courseId) as string | undefined;
    const metaUid  = (session.metadata?.uid || (pi?.metadata as any)?.uid) as string | undefined;

    if (!courseId || !metaUid || metaUid !== uid) {
      res.status(400).json({ error: "Metadata missing or UID mismatch" });
      return;
    }

    // Optional: verify amount matches current course price
    const db = getFirestore();
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (courseSnap.exists && session.amount_total != null) {
      const expected = cents((courseSnap.data() as any)?.price ?? 0);
      if (expected !== session.amount_total) {
        logger.warn("Amount mismatch on finalize", { expected, got: session.amount_total, courseId, sessionId });
      }
    }

    // Idempotent grant
    await db.doc(`users/${uid}/purchases/${courseId}`).set(
      { acquiredAt: FieldValue.serverTimestamp(), currentLessonIndex: 0 },
      { merge: true }
    );

    res.json({ ok: true, courseId });
  } catch (err: any) {
    try { logger.error("finalizeCheckout", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { logger.error("finalizeCheckout", err); }
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});
