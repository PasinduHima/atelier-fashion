/**
 * App tables: categories, products, variants (with stock), collections, carts
 * and orders (with their Stripe links).
 *
 * Kept out of `schema.ts` on purpose: `npm run auth:generate` overwrites that
 * file with the Better Auth tables.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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

/**
 * Orders. A `pending` order is written before the Stripe Checkout Session is
 * created; only the Stripe webhook moves it on (paid / payment_failed /
 * expired / needs_attention). Lines snapshot names and prices so history
 * survives catalog edits. Money is integer cents.
 */
export const ORDER_STATUSES = ["pending", "paid", "payment_failed", "expired", "canceled", "needs_attention"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable(
  "orders",
  {
    /** Also the public order reference: unguessable, safe to show and put in Stripe metadata. */
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** The cart the order was placed from; its lines are cleared once paid. */
    cartId: uuid("cart_id").references(() => carts.id, { onDelete: "set null" }),
    email: text("email"),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    currency: text("currency").notNull().default("usd"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    shippingName: text("shipping_name"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, string | null>>(),
    /** Why an order needs a human (oversold, amount mismatch…). */
    note: text("note"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("orders_user_id_idx").on(t.userId),
    check(
      "orders_status_valid",
      sql`${t.status} in ('pending', 'paid', 'payment_failed', 'expired', 'canceled', 'needs_attention')`,
    ),
    check("orders_amounts_non_negative", sql`${t.subtotalCents} >= 0 and ${t.shippingCents} >= 0`),
    check("orders_total_matches", sql`${t.totalCents} = ${t.subtotalCents} + ${t.shippingCents}`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_non_negative", sql`${t.unitPriceCents} >= 0`),
    check("order_items_line_total_matches", sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`),
  ],
);

/** One Stripe Customer per signed-in user, reused across their orders. */
export const stripeCustomers = pgTable("stripe_customers", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamps.createdAt,
});

/** Stripe webhook events already handled, so redeliveries are skipped. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

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
