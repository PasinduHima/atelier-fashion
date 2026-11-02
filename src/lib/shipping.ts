/**
 * Shipping rules, shared by the bag (display) and checkout (what Stripe
 * charges). Safe to import from server and client code. Cents (USD).
 */

export const FLAT_RATE_CENTS = 2500; // $25
export const FREE_SHIPPING_THRESHOLD_CENTS = 50_000; // $500

/** Countries Stripe Checkout accepts shipping addresses for. */
export const SHIPPING_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "IE",
  "FR",
  "DE",
  "IT",
  "ES",
  "NL",
  "BE",
  "AT",
  "SE",
  "DK",
  "CH",
] as const;

export type ShippingQuote = {
  label: string;
  amountCents: number;
  /** Cents still to add for free shipping; 0 once it applies. */
  remainingForFreeCents: number;
};

/** Free at or above the threshold (on the subtotal), otherwise the flat rate. */
export function quoteShipping(subtotalCents: number): ShippingQuote {
  const free = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  return {
    label: free ? "Complimentary shipping" : "Standard shipping",
    amountCents: free ? 0 : FLAT_RATE_CENTS,
    remainingForFreeCents: free ? 0 : FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents,
  };
}
