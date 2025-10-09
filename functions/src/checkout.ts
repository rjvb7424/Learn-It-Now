// functions/src/checkout.ts
import Stripe from "stripe";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import "./adminInit";

const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
// ✅ pin a real API version
const stripe = () => new Stripe(STRIPE_SECRET.value());

const MIN_PRICE_EUR_CENTS = 100;

const isValidUrl = (u?: string | null) => { try { new URL(String(u)); return true; } catch { return false; } };
const normalizeOrigin = (raw?: string) => {
  const fallback = "http://localhost:5173";
  const url = new URL(isValidUrl(raw) ? String(raw) : fallback);
  if (!/^localhost|127\.0\.0\.1$/i.test(url.hostname)) url.protocol = "https:";
  return `${url.protocol}//${url.host}`;
};
const buildUrl = (origin: string, path: string) => new URL(path, origin).toString();
const cents = (n: number) => Math.max(0, Math.round(Number(n) * 100));

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
    const course = courseSnap.data() as {
      title?: string; description?: string; price?: number; isFree?: boolean; creatorUid?: string
    };

    if (!course.creatorUid)                    { res.status(400).json({ error: "Course missing creatorUid" }); return; }
    if (course.isFree || !(course.price! > 0)) { res.status(400).json({ error: "Course is free" }); return; }

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

    // ---------- Pricing (EUR) ----------
    const currency = "eur";
    const baseAmount = cents(course.price!);

    // 🚫 Enforce the €1 minimum  // (fixed comment)
    if (baseAmount < MIN_PRICE_EUR_CENTS) {
      res.status(400).json({ error: "Minimum course price is €1.00." });
      return;
    }

    const platformFee = Math.round(baseAmount * 0.30);  // 30% fee (rounded)  // (fixed comment)
    const totalAmount = baseAmount + platformFee;

    // Create Checkout Session with two line items (course + fee)
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,

      // ✅ make every buyer a Stripe Customer on YOUR platform
      customer_creation: "always",
      client_reference_id: uid,
      // customer_email: buyerEmail ?? undefined,  // <- optional if you have it server-side

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
        transfer_data: { destination: creator.stripeAccountId! }, // funds to creator
        application_fee_amount: platformFee,                       // your platform fee
        metadata: { uid, courseId },
      },
      metadata: { uid, courseId },
    });


    res.json({ url: session.url, id: session.id, totalAmount });
  } catch (err: any) {
    try { logger.error("createCheckout", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { logger.error("createCheckout", err); }
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});

// ----- helper to estimate Stripe fees on the whole charge (tune these) -----
const estimateStripeFee = (amountCents: number, currency: string) => {
  // Pick sensible defaults; adjust to your account’s live rates.
  const cur = currency.toLowerCase();
  let pct = 0.015;    // 1.5%
  let fixed = 25;     // €0.25 (cents)

  if (cur === "gbp") { pct = 0.025; fixed = 20; } // 2.5% + £0.20 (UK example)

  return Math.round(amountCents * pct + fixed);
};

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

    const db = getFirestore();
    const courseSnap = await db.doc(`courses/${courseId}`).get();

    // Optional integrity check: expected total = base + 20% fee
    // Optional integrity check: expected total = base + 30% fee   // (fixed)
    if (courseSnap.exists && session.amount_total != null) {
      const base = cents((courseSnap.data() as any)?.price ?? 0);
      const fee  = Math.round(base * 0.30);
      const expectedTotal = base + fee;
      if (expectedTotal !== session.amount_total) {
        logger.warn("Amount mismatch on finalize", {
          expectedTotal, got: session.amount_total, courseId, sessionId
        });
      }
    }

    // Persist purchase with amounts for your dashboard
    const totalCents  = session.amount_total ?? 0; // buyer paid (course + fee)
    const feeCents    = typeof pi?.application_fee_amount === "number" ? pi.application_fee_amount : 0; // your fee
    const currency    = (session.currency || "eur").toUpperCase();
    const customerId  = typeof session.customer === "string" ? session.customer : session.customer?.id;

    // 💡 estimate Stripe processing fee on the whole charge so you see an internal "platform net"
    const estimatedStripeFeeCents = estimateStripeFee(totalCents, currency);
    const platformNetCents        = Math.max(0, feeCents - estimatedStripeFeeCents);

    await db.doc(`users/${uid}/purchases/${courseId}`).set(
      {
        acquiredAt: FieldValue.serverTimestamp(),
        currentLessonIndex: 0,

        // Buyer totals
        amount: totalCents / 100,                 // total paid by buyer (course + fee)
        currency,

        // Platform revenue views
        platformFee: feeCents / 100,              // your gross fee (from application_fee)
        platformProcessingEstimate: estimatedStripeFeeCents / 100,
        platformNet: platformNetCents / 100,      // "your money" after estimated processing

        // Creator gross before their own Stripe fees (in your current model creators don't pay fees)
        creatorGross: (totalCents - feeCents) / 100,

        stripe: {
          sessionId: session.id,
          paymentIntentId: typeof pi === "string" ? pi : pi?.id,
          customerId: customerId ?? null,         // ← lets you reconcile "New customers"
        },
      },
      { merge: true }
    );

    res.json({ ok: true, courseId, customerId });
  } catch (err: any) {
    try { logger.error("finalizeCheckout", JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { logger.error("finalizeCheckout", err); }
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});
