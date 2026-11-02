import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { stripeEvents } from "@/db/catalog-schema";
import { closeOrder, fulfillOrder } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook endpoint: the only place orders become paid. Verifies the
 * signature on the raw body, skips events it has already processed, and
 * returns 5xx on failure so Stripe retries.
 *
 * Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const [seen] = await db.select({ id: stripeEvents.id }).from(stripeEvents).where(eq(stripeEvents.id, event.id)).limit(1);
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Only a confirmed payment fulfils. Delayed payment methods complete while
        // still "unpaid" and are fulfilled by async_payment_succeeded instead.
        if (event.data.object.payment_status === "paid") await fulfillOrder(event.data.object);
        break;
      case "checkout.session.async_payment_succeeded":
        await fulfillOrder(event.data.object);
        break;
      case "checkout.session.async_payment_failed":
        await closeOrder(event.data.object, "payment_failed");
        break;
      case "checkout.session.expired":
        await closeOrder(event.data.object, "expired");
        break;
      default:
        break; // Not subscribed; acknowledge so Stripe stops sending it.
    }
  } catch (error) {
    console.error(`Failed to handle Stripe event ${event.id} (${event.type})`, error);
    return new Response("Handler error", { status: 500 });
  }

  // Recorded only after success, so a failed attempt is retried in full.
  await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return Response.json({ received: true });
}
