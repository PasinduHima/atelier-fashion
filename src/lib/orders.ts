import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { db } from "@/db";
import { orderItems, orders, type OrderStatus } from "@/db/catalog-schema";

/**
 * Order state changes driven by Stripe webhooks. Every transition starts
 * from `pending` and is guarded in SQL, so redelivered or out-of-order events
 * can't fulfil an order twice or decrement stock twice.
 */

const orderIdOf = (session: Stripe.Checkout.Session) => session.metadata?.order_id ?? null;

const idOf = (value: string | { id: string } | null) => (typeof value === "string" ? value : (value?.id ?? null));

/** Moves a pending order to a final non-paid status (expired, payment_failed…). */
export async function closeOrder(session: Stripe.Checkout.Session, status: Exclude<OrderStatus, "pending" | "paid">) {
  const orderId = orderIdOf(session);
  if (!orderId) return;
  await db
    .update(orders)
    .set({ status })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

/**
 * Marks a paid Checkout Session's order as paid, decrements stock and clears
 * the purchased lines from the bag, all in one SQL statement. If the amounts
 * Stripe charged don't match the order, or stock ran out between checkout and
 * payment, the order is flagged `needs_attention` instead.
 */
export async function fulfillOrder(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = orderIdOf(session);
  if (!orderId) {
    console.warn(`Checkout Session ${session.id} has no order_id metadata; ignoring.`);
    return;
  }

  const [order] = await db
    .select({ status: orders.status, subtotalCents: orders.subtotalCents, totalCents: orders.totalCents })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) {
    console.warn(`Checkout Session ${session.id} points at unknown order ${orderId}; ignoring.`);
    return;
  }
  if (order.status !== "pending") return; // Already handled.

  // Trust nothing the browser saw: compare what Stripe charged with what we priced.
  // With Adaptive Pricing the customer may pay in their local currency. On API
  // 2026-10-28 the session keeps `currency: "usd"` and reports the local amount
  // in `presentment_details` (verified with an LKR payment); older versions put
  // the USD amounts under `currency_conversion`, so prefer that when present.
  const conversion = session.currency_conversion;
  const charged = conversion
    ? { currency: conversion.source_currency, subtotal: conversion.amount_subtotal, total: conversion.amount_total }
    : { currency: session.currency, subtotal: session.amount_subtotal, total: session.amount_total };
  if (charged.currency !== "usd" || charged.subtotal !== order.subtotalCents || charged.total !== order.totalCents) {
    await db
      .update(orders)
      .set({
        status: "needs_attention",
        note: `Amount mismatch: Stripe charged ${charged.total} ${charged.currency}, order total ${order.totalCents} usd`,
        stripePaymentIntentId: idOf(session.payment_intent),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
    return;
  }

  const shipping = session.collected_information?.shipping_details ?? null;
  const address = shipping
    ? {
        line1: shipping.address.line1,
        line2: shipping.address.line2,
        city: shipping.address.city,
        state: shipping.address.state,
        postal_code: shipping.address.postal_code,
        country: shipping.address.country,
      }
    : null;

  const result = await db.execute<{ paid: number; decremented: number; items: number }>(sql`
    with paid as (
      update orders set
        status = 'paid',
        paid_at = now(),
        updated_at = now(),
        email = coalesce(${session.customer_details?.email ?? null}, email),
        shipping_name = ${shipping?.name ?? null},
        shipping_address = ${address ? JSON.stringify(address) : null}::jsonb,
        stripe_payment_intent_id = ${idOf(session.payment_intent)}
      where id = ${orderId} and status = 'pending'
      returning id, cart_id, user_id
    ),
    short as (
      select 1 from order_items oi
      join paid on oi.order_id = paid.id
      left join product_variants v on v.id = oi.variant_id
      where v.id is null or v.stock < oi.quantity
    ),
    dec as (
      update product_variants v set stock = v.stock - oi.quantity, updated_at = now()
      from order_items oi join paid on oi.order_id = paid.id
      where v.id = oi.variant_id and v.stock >= oi.quantity and not exists (select 1 from short)
      returning v.id
    ),
    cleared as (
      delete from cart_items ci
      using order_items oi, paid
      where oi.order_id = paid.id
        and ci.variant_id = oi.variant_id
        and ci.cart_id in (
          select c.id from carts c
          where c.id = paid.cart_id or (paid.user_id is not null and c.user_id = paid.user_id)
        )
      returning ci.id
    )
    select
      (select count(*) from paid)::int as paid,
      (select count(*) from dec)::int as decremented,
      (select count(*) from order_items where order_id = ${orderId})::int as items
  `);

  const outcome = result.rows[0];
  if (!outcome || outcome.paid === 0) return; // Another delivery got there first.

  if (outcome.decremented > 0) revalidateTag("products", "max");

  if (outcome.decremented < outcome.items) {
    // Paid, but at least one line sold out after checkout began. Needs a person (refund or restock).
    await db
      .update(orders)
      .set({
        status: "needs_attention",
        note: `Oversold: stock covered ${outcome.decremented} of ${outcome.items} lines after payment`,
      })
      .where(eq(orders.id, orderId));
    console.error(`Order ${orderId} was paid but is oversold; it needs attention.`);
  }
}

/**
 * Order summary for the confirmation page, found by its Checkout Session id
 * (stored on the order before the customer is sent to Stripe). Reads only our
 * database: no Stripe call, and it never changes the order or the bag.
 */
export async function getOrderSummaryBySession(checkoutSessionId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      subtotalCents: orders.subtotalCents,
      shippingCents: orders.shippingCents,
      totalCents: orders.totalCents,
    })
    .from(orders)
    .where(eq(orders.stripeCheckoutSessionId, checkoutSessionId))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      productName: orderItems.productName,
      variantLabel: orderItems.variantLabel,
      quantity: orderItems.quantity,
      lineTotalCents: orderItems.lineTotalCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.id);

  return { ...order, items };
}
