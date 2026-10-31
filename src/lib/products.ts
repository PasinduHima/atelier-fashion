import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { categories, products, productStock } from "@/db/catalog-schema";
import type { Category, Product } from "@/lib/catalog";

/**
 * Catalog reads. Product queries include stock, so they get a short cache life;
 * anything that changes products or stock should call
 * `revalidateTag("products", "max")` (or `updateTag("products")` in a server action).
 */

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  details: products.details,
  priceCents: products.priceCents,
  imageUrl: products.imageUrl,
  badge: products.badge,
  isGift: products.isGift,
  categorySlug: categories.slug,
  categoryName: categories.name,
  stock: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
};

/** Active products joined to their category and stock. */
function selectProducts() {
  return db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .$dynamic();
}

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: { slug: row.categorySlug, name: row.categoryName },
    priceCents: row.priceCents,
    image: row.imageUrl,
    badge: row.badge,
    stock: row.stock,
    description: row.description,
    details: row.details,
    isGift: row.isGift,
  };
}

/** The newest active products, for the home page grid. */
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await selectProducts()
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows.map(toProduct);
}

/** Active products flagged for the gift edit. */
export async function getGiftEdit(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await selectProducts()
    .where(and(eq(products.isActive, true), eq(products.isGift, true)))
    .orderBy(desc(products.createdAt));
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const [row] = await selectProducts()
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  return row ? toProduct(row) : null;
}

/** Products to suggest on a product page: same category first, then the rest. */
export async function getRelatedProducts(productId: number, categorySlug: string, count = 4): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await selectProducts()
    .where(and(eq(products.isActive, true), ne(products.id, productId)))
    .orderBy(desc(sql`${categories.slug} = ${categorySlug}`), desc(products.createdAt))
    .limit(count);
  return rows.map(toProduct);
}

/** Slugs of every active product, for `generateStaticParams`. */
export async function getAllProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await db.select({ slug: products.slug }).from(products).where(eq(products.isActive, true));
  return rows.map((row) => row.slug);
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const rows = await db
    .select({ slug: categories.slug, name: categories.name, image: categories.imageUrl, alt: categories.imageAlt })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows;
}
