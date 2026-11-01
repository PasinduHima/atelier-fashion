"use client";

import Link from "next/link";
import { startTransition, useActionState, useId, useState } from "react";
import { addToCart, type CartActionState } from "@/app/bag/actions";
import { StockStatus } from "@/components/product/stock-status";
import { formatPrice, getStockState, type Variant } from "@/lib/catalog";

type PurchasePanelProps = {
  /** Product price, used if the product somehow has no variants. */
  basePriceCents: number;
  variants: Variant[];
};

const initialState: CartActionState = { status: "idle", message: "" };

/**
 * Price, stock, size picker and Add to bag. The size picker is a native radio
 * group (arrow keys, labels and form submission for free); sold-out sizes are
 * disabled. The server action re-checks everything, so these props are only
 * a (possibly stale) display hint.
 */
export function PurchasePanel({ basePriceCents, variants }: PurchasePanelProps) {
  const single = variants.length === 1 ? variants[0] : null;
  const [selectedId, setSelectedId] = useState<number | null>(single && single.stock > 0 ? single.id : null);
  const [state, formAction, pending] = useActionState(addToCart, initialState);
  // Re-keys the message so an identical result (adding the same size twice) is announced again.
  const [submissions, setSubmissions] = useState(0);
  const statusId = useId();

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const prices = variants.map((v) => v.priceCents);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : basePriceCents;
  const pricesVary = new Set(prices).size > 1;
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const soldOut = totalStock <= 0;

  const buttonLabel = soldOut ? "Sold out" : pending ? "Adding…" : selected ? "Add to bag" : "Select a size";

  return (
    <form
      action={formAction}
      // Submit manually so React doesn't reset the form after the action,
      // which would uncheck the chosen size while it still looks selected.
      // `action` stays as the no-JavaScript fallback.
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        setSubmissions((n) => n + 1);
        startTransition(() => formAction(formData));
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="type-body">
          {selected ? formatPrice(selected.priceCents) : `${pricesVary ? "From " : ""}${formatPrice(lowestPrice)}`}
        </p>
        <StockStatus state={getStockState(selected ? selected.stock : totalStock)} />
      </div>

      {single ? (
        <input type="hidden" name="variantId" value={single.id} />
      ) : (
        <fieldset className="mt-8" aria-describedby={state.status === "error" ? statusId : undefined}>
          <legend className="type-eyebrow mb-3">
            Size{selected ? <span className="text-muted">: {selected.size}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const out = variant.stock <= 0;
              return (
                <label key={variant.id} className="size-chip type-meta">
                  <input
                    type="radio"
                    name="variantId"
                    value={variant.id}
                    checked={selectedId === variant.id}
                    disabled={out}
                    onChange={() => setSelectedId(variant.id)}
                  />
                  {variant.size}
                  {out ? <span className="sr-only">, sold out</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <input type="hidden" name="quantity" value="1" />

      {/* aria-disabled while pending (not `disabled`) so the focused button keeps focus. */}
      <button
        type="submit"
        className="btn btn-primary mt-8 w-full aria-disabled:cursor-wait"
        disabled={soldOut || !selected}
        aria-disabled={pending || undefined}
      >
        {buttonLabel}
      </button>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`type-meta mt-3 min-h-[1.5em] ${state.status === "error" ? "text-danger" : "text-ink"}`}
      >
        <span key={submissions}>
          {state.message}
          {state.status === "success" ? (
            <>
              {" "}
              <Link href="/bag" className="link-underline">
                View bag
              </Link>
            </>
          ) : null}
        </span>
      </p>
    </form>
  );
}
