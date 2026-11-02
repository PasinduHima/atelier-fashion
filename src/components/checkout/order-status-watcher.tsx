"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // about 30 seconds

type OrderStatusWatcherProps = {
  orderId: string;
  /** The Stripe webhook hasn't confirmed the payment yet. */
  pending: boolean;
  /** Paid and fulfilled by the webhook (the bag has been emptied). */
  fulfilled: boolean;
};

/**
 * Keeps the confirmation page in step with the webhook. It only re-renders
 * the page (`router.refresh()`); it never changes the order or the bag.
 *
 * - While the order is pending, refreshes every 2 seconds for about 30
 *   seconds, then says so and offers "Check again".
 * - Once the order is fulfilled, refreshes once more so the header's bag
 *   count (rendered in the layout, possibly before the webhook landed) updates.
 *
 * `router.refresh()` keeps client state, so this component's state survives
 * each refresh.
 */
export function OrderStatusWatcher({ orderId, pending, fulfilled }: OrderStatusWatcherProps) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const refreshedAfterFulfilment = useRef<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      router.refresh();
      if (polls >= MAX_POLLS) {
        clearInterval(timer);
        setGaveUp(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pending, round, router]);

  useEffect(() => {
    if (!fulfilled || refreshedAfterFulfilment.current === orderId) return;
    refreshedAfterFulfilment.current = orderId;
    router.refresh();
  }, [fulfilled, orderId, router]);

  const stillWaiting = pending && gaveUp;

  return (
    <>
      {/* Always mounted (sr-only while empty, so it takes no space) so screen
          readers announce the message when it appears. */}
      <p role="status" aria-live="polite" className={stillWaiting ? "type-body max-w-md" : "sr-only"}>
        {stillWaiting ? "We’re still confirming your payment. Refresh in a moment." : ""}
      </p>
      {stillWaiting ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setGaveUp(false);
            setRound((r) => r + 1);
            router.refresh();
          }}
        >
          Check again
        </button>
      ) : null}
    </>
  );
}
