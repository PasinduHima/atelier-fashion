import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BagAnnouncer } from "@/components/bag/bag-announcer";
import { CheckoutButton } from "@/components/bag/checkout-button";
import { BAG_TITLE_ID } from "@/components/bag/ids";
import { QuantityControl } from "@/components/bag/quantity-control";
import { formatPrice } from "@/lib/catalog";
import { getCart, type CartLine } from "@/lib/cart";
import { quoteShipping } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

/** The heading renders immediately; the bag is per-visitor, so it streams in. */
export default function BagPage() {
  return (
    <div className="container-site pb-20">
      <header className="flex flex-col items-center gap-5 py-12 text-center md:py-16">
        <h1 id={BAG_TITLE_ID} tabIndex={-1} className="type-title-serif focus:outline-none">
          Your bag
        </h1>
      </header>
      <BagAnnouncer />
      <Suspense fallback={<BagSkeleton />}>
        <BagContents />
      </Suspense>
    </div>
  );
}

async function BagContents() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <div className="hairline-t flex flex-col items-center gap-6 py-20 text-center">
        <p className="type-body text-muted">Your bag is empty.</p>
        <Link href="/collections/new-in" className="btn btn-primary">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  const shipping = quoteShipping(cart.subtotalCents);
  const needsFixing = cart.lines.some((line) => !line.available || line.stock <= 0 || line.quantity > line.stock);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <section aria-labelledby="bag-items">
        <h2 id="bag-items" className="type-eyebrow hairline-b pb-4">
          {cart.count} {cart.count === 1 ? "item" : "items"}
        </h2>
        <ul>
          {cart.lines.map((line) => (
            <BagLine key={line.id} line={line} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="bag-summary" className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
        <h2 id="bag-summary" className="type-eyebrow hairline-b pb-4">
          Summary
        </h2>
        <dl className="type-meta flex flex-col gap-3 py-6">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Shipping</dt>
            <dd className="tabular-nums">{shipping.amountCents === 0 ? "Complimentary" : formatPrice(shipping.amountCents)}</dd>
          </div>
          <div className="hairline-t flex justify-between gap-4 pt-3">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(cart.subtotalCents + shipping.amountCents)}</dd>
          </div>
        </dl>
        {shipping.remainingForFreeCents > 0 ? (
          <p className="type-caption -mt-2 mb-6 text-muted">
            Add {formatPrice(shipping.remainingForFreeCents)} more for complimentary shipping.
          </p>
        ) : null}
        {needsFixing ? (
          <p className="type-caption mb-3 text-danger">Please update the items marked above before checking out.</p>
        ) : null}
        <CheckoutButton disabled={needsFixing} />
      </section>
    </div>
  );
}

function BagLine({ line }: { line: CartLine }) {
  const overStock = line.available && line.quantity > line.stock;
  const href = `/products/${line.productSlug}`;

  return (
    <li className="hairline-b grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-6 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-6">
      <Link href={href} tabIndex={-1} aria-hidden className="media-product block">
        <Image src={line.image} alt="" fill sizes="8rem" style={{ objectFit: "cover" }} />
      </Link>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="type-meta">
              <Link href={href} className="link">
                {line.productName}
              </Link>
            </h3>
            <p className="type-meta text-muted">
              {line.size === "One size" ? "One size" : `Size ${line.size}`}
              {line.color ? ` · ${line.color}` : null}
            </p>
            <p className="type-meta text-muted tabular-nums">{formatPrice(line.unitPriceCents)} each</p>
          </div>
          <p className="type-meta tabular-nums">{line.available ? formatPrice(line.lineTotalCents) : "—"}</p>
        </div>

        {!line.available ? (
          <p className="type-caption text-danger">No longer available. Please remove it from your bag.</p>
        ) : line.stock <= 0 ? (
          <p className="type-caption text-danger">Now sold out.</p>
        ) : overStock ? (
          <p className="type-caption text-danger">Only {line.stock} left. Please lower the quantity.</p>
        ) : null}

        <QuantityControl
          lineId={line.id}
          productName={line.productName}
          quantity={line.quantity}
          stock={line.stock}
          available={line.available}
        />
      </div>
    </li>
  );
}

function BagSkeleton() {
  return (
    <div aria-busy className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 md:grid-cols-[8rem_minmax(0,1fr)]">
            <div className="aspect-product animate-pulse bg-surface-2" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-2/3 bg-surface-2" />
              <div className="h-3 w-1/3 bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-40 bg-surface-2" />
    </div>
  );
}
