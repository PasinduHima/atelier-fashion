/**
 * Catalog tables: categories, products and stock.
 *
 * Kept out of `schema.ts` on purpose: `npm run auth:generate` overwrites that
 * file with the Better Auth tables.
 */
import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    isGift: boolean("is_gift").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    index("products_active_created_at_idx").on(t.isActive, t.createdAt.desc()),
    check("products_price_cents_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

export const productStock = pgTable(
  "product_stock",
  {
    productId: integer("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Units available. 0 = sold out. */
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamps.updatedAt,
  },
  (t) => [check("product_stock_quantity_non_negative", sql`${t.quantity} >= 0`)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  stock: one(productStock),
}));

export const productStockRelations = relations(productStock, ({ one }) => ({
  product: one(products, { fields: [productStock.productId], references: [products.id] }),
}));
