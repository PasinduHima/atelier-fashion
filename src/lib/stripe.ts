import "server-only";

import Stripe from "stripe";

/**
 * The one Stripe client. STRIPE_SECRET_KEY should be a restricted test key
 * (`rk_test_…`) with: Checkout Sessions write, Customers write,
 * PaymentIntents read. Never expose it to the browser or log it.
 */

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, {
      apiVersion: "2026-10-28.endive",
      appInfo: { name: "atelier-store" },
    });
  }
  return client;
}

/** Fixed label (with an 8-letter suffix) for comparing checkout flows in the Dashboard. */
export const CHECKOUT_INTEGRATION_ID = "atelier-hosted-checkout-qzmvrkta";
