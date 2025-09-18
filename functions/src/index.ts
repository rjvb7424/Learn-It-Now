// External imports
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const STRIPE_SECRET = defineSecret("STRIPE_SECRET");

// Helper to build a Stripe client using the Stripe secret key
function makeStripe() {
  return new Stripe(STRIPE_SECRET.value(), {
    apiVersion: "2025-08-27.basil",
  });
}

/**
 * POST /createAccount
 * Creates a Stripe Express account and returns the account ID.
 */
export const createAccount = onRequest(
  { secrets: [STRIPE_SECRET] },
  async (req, res) => {
    try {
      const stripe = makeStripe();
      // create an Express account
      const account = await stripe.accounts.create({ type: "express" });
      res.json({ accountId: account.id });
    } catch (err) {
      logger.error("Failed to create Stripe account", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /createAccountLink
 * Body: { accountId?: string }
 * Creates an onboarding link for the given account.
 */
export const createAccountLink = onRequest(
  { secrets: [STRIPE_SECRET] }, // only Stripe secret is needed
  async (req, res) => {
    try {
      const stripe = makeStripe();
      // get accountId from the request body
      const { accountId } = (req.body ?? {}) as { accountId?: string };
      // if no accountId is provided, return an error
      if (!accountId) {
        res.status(400).json({ error: "Missing required field: accountId" });
        return;
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        // Hardcoded dev URLs for now
        return_url: `http://localhost:5173/return/${accountId}`,
        refresh_url: `http://localhost:5173/return/${accountId}`,
        type: "account_onboarding",
      });

      res.json({ url: link.url, expires_at: link.expires_at });
    } catch (err) {
      logger.error("Failed to create Stripe account link", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);
