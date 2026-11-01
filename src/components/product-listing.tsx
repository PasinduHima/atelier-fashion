import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

type ProductListingProps = {
  /** Page heading; also the last breadcrumb item. */
  title: string;
  intro?: string;
  products: Product[];
};

/**
 * Listing page body: breadcrumb, serif heading and product count, then the
 * edge-to-edge 2 / 3 / 4-column product grid (or an empty state).
 */
export function ProductListing({ title, intro, products }: ProductListingProps) {
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
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1 className="type-title-serif">{title}</h1>
        {intro ? <p className="type-body max-w-md text-muted">{intro}</p> : null}
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
          <p className="type-body text-muted">Nothing here just yet. Check back soon.</p>
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

/** Loading placeholder with the same shape as ProductListing. */
export function ProductListingSkeleton() {
  return (
    <div aria-busy>
      <div className="container-site flex flex-col items-center gap-5 py-12 md:py-16 lg:py-20">
        <div className="h-4 w-32 bg-surface-2" />
        <div className="h-10 w-56 bg-surface-2 md:h-12" />
        <div className="h-4 w-20 bg-surface-2" />
      </div>
      <div className="product-grid bg-line hairline-t hairline-b">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-paper">
            <div className="aspect-product animate-pulse bg-surface-2" />
            <div className="flex flex-col gap-2 px-3 pt-3 pb-6 md:px-4 md:pt-4 md:pb-8">
              <div className="h-3 w-3/4 bg-surface-2" />
              <div className="h-3 w-1/3 bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
