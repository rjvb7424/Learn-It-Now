import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import Stripe from "stripe";

admin.initializeApp();

// Initialize Stripe with secret key from Firebase config
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: "2024-06-20",
});

const app = express();
app.use(cors({ origin: true }));

// Test route
app.get("/hello", (req, res) => {
  res.send("Hello from Firebase + Stripe!");
});

// Export the API as a Firebase Function
export const api = functions.https.onRequest(app);
