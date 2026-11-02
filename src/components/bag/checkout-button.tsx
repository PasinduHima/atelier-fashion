"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "@/app/checkout/actions";

const initialState: CheckoutState = { status: "idle", message: "" };

/** Posts to the startCheckout action, which redirects to Stripe Checkout. */
export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(() => startCheckout(), initialState);

  return (
    <form action={formAction}>
      <button
        type="submit"
        className="btn btn-primary w-full aria-disabled:cursor-wait"
        disabled={disabled}
        aria-disabled={pending || undefined}
        onClick={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {pending ? "Redirecting to checkout…" : "Checkout"}
      </button>
      <p role="status" aria-live="polite" className="type-caption mt-3 min-h-[1.25em] text-center text-danger">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
