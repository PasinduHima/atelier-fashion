import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderStatusWatcher } from "@/components/checkout/order-status-watcher";
import { formatPrice } from "@/lib/catalog";
import { getOrderSummaryBySession } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false },
};

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

/**
 * Where Stripe sends the customer after paying. It only displays the order's
 * status from the database; the webhook does the fulfilling (and empties the
 * bag), so a customer who never reaches this page still gets their order, and
 * visiting it never changes anything.
 */
export default function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="container-narrow flex flex-col items-center gap-8 py-16 text-center md:py-24">
      <Suspense fallback={<p className="type-body text-muted">Loading your order…</p>}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  // Live order state for one customer: render it only for a real request,
  // never in a prerender or prefetch (where Next forbids reading the clock).
  await connection();

  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" && SESSION_ID.test(session_id) ? session_id : null;
  const order = sessionId ? await getOrderSummaryBySession(sessionId) : null;

  if (!order) {
    return (
      <>
        <h1 className="type-title-serif">We couldn&rsquo;t find that order</h1>
        <p className="type-body text-muted">If you were charged, your confirmation email from Stripe has the details.</p>
        <Link href="/bag" className="btn btn-secondary">
          Back to your bag
        </Link>
      </>
    );
  }

  const heading = {
    paid: "Thank you for your order",
    pending: "Confirming your payment…",
    needs_attention: "Thank you, we’re reviewing your order",
    payment_failed: "Your payment didn’t go through",
    expired: "This checkout has expired",
    canceled: "This checkout was canceled",
  }[order.status];

  const message = {
    paid: "Your payment is confirmed and your order is being prepared.",
    pending: "This usually takes a few seconds. This page checks again on its own.",
    needs_attention: "Your payment is confirmed. We’ll be in touch shortly about one of your items.",
    payment_failed: "No money was taken. Your bag is saved, so you can try again.",
    expired: "No money was taken. Your bag is saved, so you can try again.",
    canceled: "No money was taken. Your bag is saved, so you can try again.",
  }[order.status];

  return (
    <>
      <p className="type-eyebrow text-muted">Order {order.id.slice(0, 8).toUpperCase()}</p>
      <h1 className="type-title-serif" aria-live="polite">
        {heading}
      </h1>
      <p className="type-body max-w-md text-muted">{message}</p>
      {/* Same position on every render, so its state survives router.refresh(). */}
      <OrderStatusWatcher
        orderId={order.id}
        pending={order.status === "pending"}
        fulfilled={order.status === "paid" || order.status === "needs_attention"}
      />

      <section aria-labelledby="order-items" className="w-full text-left">
        <h2 id="order-items" className="type-eyebrow hairline-b pb-4">
          Summary
        </h2>
        <ul>
          {order.items.map((item) => (
            <li key={item.id} className="hairline-b type-meta flex justify-between gap-4 py-4">
              <span>
                {item.productName}
                <span className="block text-muted">
                  {item.variantLabel} · Qty {item.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatPrice(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="type-meta flex flex-col gap-2 py-4">
          <div className="flex justify-between gap-4 text-muted">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted">
            <dt>Shipping</dt>
            <dd className="tabular-nums">{order.shippingCents === 0 ? "Complimentary" : formatPrice(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <Link href={order.status === "paid" || order.status === "pending" ? "/" : "/bag"} className="btn btn-primary">
        {order.status === "paid" || order.status === "pending" ? "Continue shopping" : "Back to your bag"}
      </Link>
    </>
  );
}
