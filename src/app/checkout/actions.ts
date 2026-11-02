"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { db } from "@/db";
import { orderItems, orders, stripeCustomers } from "@/db/catalog-schema";
import { getCart, getSessionUser, getViewerCartId } from "@/lib/cart";
import { quoteShipping, SHIPPING_COUNTRIES } from "@/lib/shipping";
import { CHECKOUT_INTEGRATION_ID, getStripe } from "@/lib/stripe";

/**
 * Starts Stripe Checkout for the viewer's bag. Everything is recomputed on the
 * server from live rows: the browser sends no items, prices or totals. A
 * `pending` order is written first; only the Stripe webhook marks it paid.
 */

export type CheckoutState = { status: "idle" | "error"; message: string };

// 30 minutes is Stripe's minimum session lifetime. One extra minute keeps
// request latency from pushing `expires_at` under it (Stripe rejects that).
const CHECKOUT_TTL_SECONDS = 31 * 60;

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function getOrCreateStripeCustomer(user: { id: string; email: string; name: string }): Promise<string> {
  const [existing] = await db
    .select({ id: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, user.id))
    .limit(1);
  if (existing) return existing.id;

  const customer = await getStripe().customers.create(
    { email: user.email, name: user.name, metadata: { user_id: user.id } },
    // Two concurrent first checkouts create one customer, not two.
    { idempotencyKey: `customer-${user.id}` },
  );
  await db.insert(stripeCustomers).values({ userId: user.id, stripeCustomerId: customer.id }).onConflictDoNothing();
  const [saved] = await db
    .select({ id: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, user.id))
    .limit(1);
  return saved.id;
}

/** Takes no arguments on purpose: nothing the browser sends is used. */
export async function startCheckout(): Promise<CheckoutState> {
  const [cart, cartId, user] = await Promise.all([getCart(), getViewerCartId(), getSessionUser()]);
  if (!cartId || cart.lines.length === 0) return { status: "error", message: "Your bag is empty." };

  const problems = cart.lines.flatMap((line) => {
    if (!line.available) return [`${line.productName} is no longer available.`];
    if (line.stock <= 0) return [`${line.productName} (${line.size}) is sold out.`];
    if (line.quantity > line.stock) return [`Only ${line.stock} of ${line.productName} (${line.size}) left.`];
    return [];
  });
  if (problems.length > 0) {
    return { status: "error", message: `Please update your bag first. ${problems.join(" ")}` };
  }

  const subtotalCents = cart.subtotalCents;
  const shipping = quoteShipping(subtotalCents);
  const orderId = crypto.randomUUID();

  // Order + lines in one atomic batch (no interactive transactions on Neon HTTP).
  await db.batch([
    db.insert(orders).values({
      id: orderId,
      userId: user?.id ?? null,
      cartId,
      email: user?.email ?? null,
      subtotalCents,
      shippingCents: shipping.amountCents,
      totalCents: subtotalCents + shipping.amountCents,
    }),
    db.insert(orderItems).values(
      cart.lines.map((line) => ({
        orderId,
        variantId: line.variantId,
        sku: line.sku,
        productName: line.productName,
        variantLabel: [line.size, line.color].filter(Boolean).join(" · "),
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
      })),
    ),
  ]);

  let session: Stripe.Checkout.Session;
  try {
    const customer = user ? await getOrCreateStripeCustomer(user) : null;
    session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: cart.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "usd",
            unit_amount: line.unitPriceCents,
            product_data: {
              name: line.productName,
              description: line.size === "One size" ? undefined : `Size ${line.size}`,
              images: [line.image],
              metadata: { variant_id: String(line.variantId), sku: line.sku },
            },
          },
        })),
        shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: shipping.label,
              type: "fixed_amount",
              fixed_amount: { amount: shipping.amountCents, currency: "usd" },
              delivery_estimate: {
                minimum: { unit: "business_day", value: 3 },
                maximum: { unit: "business_day", value: 7 },
              },
            },
          },
        ],
        ...(customer ? { customer } : { customer_creation: "if_required" as const }),
        client_reference_id: orderId,
        metadata: { order_id: orderId },
        payment_intent_data: { metadata: { order_id: orderId } },
        success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/bag`,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
        integration_identifier: CHECKOUT_INTEGRATION_ID,
      },
      { idempotencyKey: `checkout-${orderId}` },
    );
  } catch (error) {
    console.error("Stripe Checkout Session creation failed", error);
    await db.update(orders).set({ status: "canceled", note: "Checkout Session creation failed" }).where(eq(orders.id, orderId));
    return { status: "error", message: "We couldn't start checkout. Please try again in a moment." };
  }

  await db.update(orders).set({ stripeCheckoutSessionId: session.id }).where(eq(orders.id, orderId));
  if (!session.url) return { status: "error", message: "We couldn't start checkout. Please try again in a moment." };
  redirect(session.url);
}
