import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

// Keep secret definition exported so each function can reference it in onRequest({ secrets: [...] })
export const STRIPE_SECRET = defineSecret("STRIPE_SECRET");

/** Centralized Stripe client factory (pin version here if/when desired) */
export const getStripe = () => new Stripe(STRIPE_SECRET.value());

// Optionally: export global constants used across handlers
export const FALLBACK_ORIGIN = "http://localhost:5173";
export const MIN_PRICE_EUR_CENTS = 100; // €1.00