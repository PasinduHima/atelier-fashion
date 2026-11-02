import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { cartItems, carts, products, productVariants } from "@/db/catalog-schema";
import { auth } from "@/lib/auth";
import { CART_COOKIE, verifyCartCookie } from "@/lib/cart-cookie";

/**
 * Cart reads and the guest-to-user merge. Nothing here is cached with
 * "use cache": prices, stock and availability are always read live.
 * Mutations live in the server actions in `src/app/bag/actions.ts`.
 */

export type CartLine = {
  id: number;
  variantId: number;
  quantity: number;
  productSlug: string;
  productName: string;
  image: string;
  size: string;
  color: string | null;
  /** Live effective price in cents. */
  unitPriceCents: number;
  lineTotalCents: number;
  /** Live units available for this variant. */
  stock: number;
  /** False when the product or variant has been withdrawn. */
  available: boolean;
};

export type Cart = {
  lines: CartLine[];
  /** Total units in the bag. */
  count: number;
  /** Sum of available lines, in cents. */
  subtotalCents: number;
};

/**
 * The signed-in user's id, or null. One session lookup per request.
 *
 * `connection()` keeps every caller (the header's bag count and /bag) out of
 * prerenders and prefetched App Shells: Better Auth checks the session's
 * expiry against the current time, which Next forbids while prerendering, and
 * a bag count baked into a prefetched shell would go stale.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
});

/** The verified guest cart id from the cookie, or null. */
export async function getGuestCartId(): Promise<string | null> {
  return verifyCartCookie((await cookies()).get(CART_COOKIE)?.value);
}

/**
 * The cart that belongs to whoever is making this request: the user's cart
 * when signed in, otherwise the guest cart from the signed cookie. Never
 * creates a cart.
 */
export const getViewerCartId = cache(async (): Promise<string | null> => {
  const userId = await getSessionUserId();
  if (userId) {
    const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId)).limit(1);
    return row?.id ?? null;
  }
  const guestCartId = await getGuestCartId();
  if (!guestCartId) return null;
  // Only an unowned cart may be used as a guest cart.
  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.id, guestCartId), sql`${carts.userId} is null`))
    .limit(1);
  return row?.id ?? null;
});

export async function getCart(): Promise<Cart> {
  const cartId = await getViewerCartId();
  if (!cartId) return { lines: [], count: 0, subtotalCents: 0 };

  const rows = await db
    .select({
      id: cartItems.id,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      productSlug: products.slug,
      productName: products.name,
      image: products.imageUrl,
      size: productVariants.size,
      color: productVariants.color,
      unitPriceCents: sql<number>`coalesce(${productVariants.priceCents}, ${products.priceCents})`.mapWith(Number),
      stock: productVariants.stock,
      available: sql<boolean>`${productVariants.isActive} and ${products.isActive}`,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.id));

  const lines = rows.map((row) => ({ ...row, lineTotalCents: row.unitPriceCents * row.quantity }));
  return {
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: lines.filter((line) => line.available).reduce((sum, line) => sum + line.lineTotalCents, 0),
  };
}

/** Total units in the viewer's bag, for the header. */
export async function getCartCount(): Promise<number> {
  const cartId = await getViewerCartId();
  if (!cartId) return 0;
  const [row] = await db
    .select({ count: sql<number>`coalesce(sum(${cartItems.quantity}), 0)`.mapWith(Number) })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return row?.count ?? 0;
}
