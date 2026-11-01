import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/products";

/** Most products shown on the page; newest first. */
const LIMIT = 24;

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest ready-to-wear, bags, shoes and accessories to arrive at Atelier.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(LIMIT);
  const count = products.length;

  return (
    <>
      <header className="container-site flex flex-col items-center gap-5 py-12 text-center md:py-16 lg:py-20">
        <nav aria-label="Breadcrumb">
          <ol className="type-eyebrow flex items-center gap-2 text-muted">
            <li>
              <Link href="/" className="transition-colors duration-(--duration-base) hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">New arrivals</li>
          </ol>
        </nav>
        <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-[-0.01em] md:text-5xl">
          New arrivals
        </h1>
        <p className="type-body max-w-md text-muted">
          The latest pieces from the atelier, newest first.
        </p>
        <p className="type-label">
          {count} {count === 1 ? "product" : "products"}
        </p>
      </header>

      {count > 0 ? (
        <div className="product-grid bg-line hairline-t hairline-b">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
          <GridFillers count={count} />
        </div>
      ) : (
        <div className="container-prose hairline-t flex flex-col items-center gap-6 py-20 text-center">
          <p className="type-body text-muted">Nothing new just yet. Check back soon.</p>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>
      )}
    </>
  );
}

/**
 * The grid's 1px gaps are the container's background showing through, so a
 * ragged last row would leave a grey block. Pad it with blank paper tiles,
 * sized per breakpoint (2 / 3 / 4 columns).
 */
function GridFillers({ count }: { count: number }) {
  const missing = (columns: number) => (columns - (count % columns)) % columns;
  return [1, 2, 3].map((i) => (
    <div
      key={i}
      aria-hidden
      className={`hidden bg-paper ${missing(2) >= i ? "max-md:block" : ""} ${
        missing(3) >= i ? "md:max-lg:block" : ""
      } ${missing(4) >= i ? "lg:block" : ""}`}
    />
  ));
}
