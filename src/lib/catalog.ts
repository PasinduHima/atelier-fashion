/**
 * Catalog types and pure helpers, safe to import from server and client code.
 * Database queries live in `@/lib/products`.
 */

export type ProductCategory = {
  slug: string;
  name: string;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: ProductCategory;
  /** Price in cents (USD). */
  priceCents: number;
  image: string;
  badge: string | null;
  /**
   * Units available across all active variants. 0 = sold out;
   * 1 to LOW_STOCK_THRESHOLD = low stock.
   */
  stock: number;
  description: string;
  /** Composition, measurements and care, one fact per line. */
  details: string[];
};

/** A purchasable size/colour of a product. */
export type Variant = {
  id: number;
  sku: string;
  /** e.g. "M", "EU 38" or "One size". */
  size: string;
  color: string | null;
  /** Effective price in cents: the variant override, else the product price. */
  priceCents: number;
  stock: number;
};

export type ProductWithVariants = Product & { variants: Variant[] };

export type Category = {
  slug: string;
  name: string;
  image: string;
  alt: string;
};

export type Collection = {
  slug: string;
  name: string;
  description: string;
};

/** Collection URL for a category slug, e.g. "ready-to-wear" -> /collections/ready-to-wear. */
export const categoryHref = (slug: string) => `/collections/${slug}`;

export const LOW_STOCK_THRESHOLD = 3;

export type StockState =
  | { status: "in-stock"; label: string }
  | { status: "low-stock"; label: string }
  | { status: "sold-out"; label: string };

export function getStockState(stock: number): StockState {
  if (stock <= 0) return { status: "sold-out", label: "Sold out" };
  if (stock <= LOW_STOCK_THRESHOLD) return { status: "low-stock", label: `Only ${stock} left` };
  return { status: "in-stock", label: "In stock" };
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

/** Formats a price in cents, e.g. 245000 -> "$2,450", 199950 -> "$1,999.50". */
export const formatPrice = (cents: number) => priceFormatter.format(cents / 100);
