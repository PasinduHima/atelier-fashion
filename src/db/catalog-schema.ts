/**
 * App tables: categories, products, variants (with stock), collections and carts.
 *
 * Kept out of `schema.ts` on purpose: `npm run auth:generate` overwrites that
 * file with the Better Auth tables.
 */
import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./schema";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  imageAlt: text("image_alt").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    /** Composition, measurements and care, one fact per entry. */
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    /** Price in cents (USD). */
    priceCents: integer("price_cents").notNull(),
    imageUrl: text("image_url").notNull(),
    badge: text("badge"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    index("products_active_created_at_idx").on(t.isActive, t.createdAt.desc()),
    check("products_price_cents_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

/**
 * A purchasable size/colour of a product. Every product has at least one;
 * products without sizes get a single "One size" variant. Stock lives here.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    color: text("color"),
    sku: text("sku").notNull().unique(),
    /** Overrides the product price when set. Cents (USD). */
    priceCents: integer("price_cents"),
    /** Units available. 0 = sold out. */
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("product_variants_product_id_idx").on(t.productId),
    unique("product_variants_product_size_color_unique").on(t.productId, t.size, t.color).nullsNotDistinct(),
    check("product_variants_stock_non_negative", sql`${t.stock} >= 0`),
    check("product_variants_price_cents_non_negative", sql`${t.priceCents} IS NULL OR ${t.priceCents} >= 0`),
  ],
);

/** Merchandising groups (women, gifts, new-in…) that cut across categories. */
export const collections = pgTable("collections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId] }),
    index("collection_products_product_id_idx").on(t.productId),
  ],
);

/**
 * Shopping bags. A guest cart has no user and is found through the signed
 * `atelier_cart` cookie; a signed-in user has at most one cart. Prices are
 * never stored here; they are always read live from products/variants.
 */
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("cart_items_cart_variant_unique").on(t.cartId, t.variantId),
    index("cart_items_variant_id_idx").on(t.variantId),
    check("cart_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  collections: many(collectionProducts),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(collectionProducts),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, { fields: [collectionProducts.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionProducts.productId], references: [products.id] }),
}));
