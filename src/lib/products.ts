import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { categories, collectionProducts, collections, products, productVariants } from "@/db/catalog-schema";
import type { Category, Collection, Product, ProductWithVariants, Variant } from "@/lib/catalog";

/**
 * Cached catalog reads for the storefront. Product queries include stock, so
 * they get a short cache life. Anything that writes products, variants or
 * stock must call `revalidateTag("products", "max")` (or `updateTag("products")`
 * in a server action); collection and category writes use the `collections`
 * and `categories` tags.
 *
 * These reads can be minutes stale. Never use them to decide whether
 * something can be bought: the cart checks live stock itself (`@/lib/cart`).
 */

/** Units across a product's active variants. */
const totalStock = sql<number>`coalesce((
  select sum(${productVariants.stock}) from ${productVariants}
  where ${productVariants.productId} = ${products.id} and ${productVariants.isActive}
), 0)`.mapWith(Number);

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  details: products.details,
  priceCents: products.priceCents,
  imageUrl: products.imageUrl,
  badge: products.badge,
  categorySlug: categories.slug,
  categoryName: categories.name,
  stock: totalStock,
};

/** Products joined to their category, with total stock. */
function selectProducts() {
  return db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
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

/** Active products in the "gifts" collection, for the home page rail. */
export async function getGiftEdit(): Promise<Product[]> {
  return getProductsByCollection("gifts");
}

/** An active product with its active variants, in display order. */
export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const [row] = await selectProducts()
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  if (!row) return null;

  const variants: Variant[] = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      size: productVariants.size,
      color: productVariants.color,
      priceCents: sql<number>`coalesce(${productVariants.priceCents}, ${products.priceCents})`.mapWith(Number),
      stock: productVariants.stock,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.productId, row.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));

  return { ...toProduct(row), variants };
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

/** Active products in one category, newest first. */
export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "categories");

  const rows = await selectProducts()
    .where(and(eq(products.isActive, true), eq(categories.slug, categorySlug)))
    .orderBy(desc(products.createdAt));
  return rows.map(toProduct);
}

/** Active products in one collection, newest first. */
export async function getProductsByCollection(collectionSlug: string): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "collections");

  const rows = await selectProducts()
    .innerJoin(collectionProducts, eq(collectionProducts.productId, products.id))
    .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
    .where(and(eq(products.isActive, true), eq(collections.slug, collectionSlug)))
    .orderBy(desc(products.createdAt));
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

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const [row] = await db
    .select({ slug: categories.slug, name: categories.name, image: categories.imageUrl, alt: categories.imageAlt })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ?? null;
}

const collectionColumns = { slug: collections.slug, name: collections.name, description: collections.description };

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections");

  return db.select(collectionColumns).from(collections).orderBy(asc(collections.sortOrder), asc(collections.name));
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections");

  const [row] = await db.select(collectionColumns).from(collections).where(eq(collections.slug, slug)).limit(1);
  return row ?? null;
}
