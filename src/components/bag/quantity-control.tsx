"use client";

import { useState, useTransition } from "react";
import { removeItem, updateQuantity, type CartActionState } from "@/app/bag/actions";
import { announce } from "@/components/bag/bag-announcer";
import { BAG_TITLE_ID } from "@/components/bag/ids";

type QuantityControlProps = {
  lineId: number;
  productName: string;
  quantity: number;
  /** Live stock when the page rendered; the server re-checks on every change. */
  stock: number;
  available: boolean;
};

/**
 * − / quantity / + stepper and Remove for one bag line. Buttons use
 * aria-disabled rather than `disabled`, so a focused button never drops focus
 * to <body> while an update is pending or when it reaches its limit.
 */
export function QuantityControl({ lineId, productName, quantity, stock, available }: QuantityControlProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (action: () => Promise<CartActionState>, onSuccess?: () => void) => {
    if (pending) return;
    startTransition(async () => {
      const result = await action();
      setError(result.status === "error" ? result.message : "");
      announce(result.message);
      if (result.status === "success") onSuccess?.();
    });
  };

  // Decreasing is always allowed down to 1, even when stock has fallen below the quantity.
  const canDecrease = quantity > 1;
  const canIncrease = available && quantity < stock;
  const stepClass = "btn-icon aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-6">
        <div className="hairline flex items-center" aria-busy={pending}>
          <button
            type="button"
            className={stepClass}
            aria-label={`Decrease quantity of ${productName}`}
            aria-disabled={pending || !canDecrease}
            onClick={() => canDecrease && run(() => updateQuantity(lineId, quantity - 1))}
          >
            <span aria-hidden>−</span>
          </button>
          <span className="type-meta w-8 text-center tabular-nums">
            <span className="sr-only">Quantity </span>
            {quantity}
          </span>
          <button
            type="button"
            className={stepClass}
            aria-label={`Increase quantity of ${productName}`}
            aria-disabled={pending || !canIncrease}
            onClick={() => canIncrease && run(() => updateQuantity(lineId, quantity + 1))}
          >
            <span aria-hidden>+</span>
          </button>
        </div>
        <button
          type="button"
          className="type-meta link-underline cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
          aria-disabled={pending}
          onClick={() =>
            run(
              () => removeItem(lineId),
              // The line unmounts; keep keyboard users in a sensible place.
              () => document.getElementById(BAG_TITLE_ID)?.focus(),
            )
          }
        >
          Remove<span className="sr-only"> {productName}</span>
        </button>
      </div>
      {error ? <p className="type-caption text-danger">{error}</p> : null}
    </div>
  );
}
