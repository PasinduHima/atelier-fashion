"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db";
import { cartItems, carts, products, productVariants } from "@/db/catalog-schema";
import { getGuestCartId, getSessionUserId } from "@/lib/cart";
import { CART_COOKIE, cartCookieOptions, signCartId } from "@/lib/cart-cookie";
import { MAX_LINE_QUANTITY, mergeGuestCart } from "@/lib/cart-merge";

/**
 * Bag mutations. Every input is untrusted: ids and quantities are validated
 * here, prices never come from the client, and stock is checked against the
 * live row inside the same SQL statement that writes the line.
 */

export type CartActionState = { status: "idle" | "success" | "error"; message: string };

function parseId(value: unknown): number | null {
  const n = typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

function parseQuantity(value: unknown): number | null {
  const n = parseId(value);
  return n !== null && n <= MAX_LINE_QUANTITY ? n : null;
}

const error = (message: string): CartActionState => ({ status: "error", message });

/**
 * The viewer's cart id, creating the cart (and, for guests, the signed
 * cookie) when `create` is set. A signed-in user who still carries a guest
 * cookie gets that bag merged in first.
 */
async function resolveCart(create: boolean): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = await getSessionUserId();
  const guestCartId = await getGuestCartId();

  if (userId) {
    if (guestCartId) {
      await mergeGuestCart(userId, guestCartId);
      cookieStore.delete(CART_COOKIE);
    }
    if (create) {
      await db.insert(carts).values({ userId }).onConflictDoNothing({ target: carts.userId });
    }
    const [row] = await db
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.userId, userId))
      .returning({ id: carts.id });
    return row?.id ?? null;
  }

  if (guestCartId) {
    // Touch the cart and renew the cookie, so `updated_at` and the 30-day
    // expiry track activity (a future purge can drop stale guest carts).
    const [row] = await db
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(and(eq(carts.id, guestCartId), sql`${carts.userId} is null`))
      .returning({ id: carts.id });
    if (row) {
      cookieStore.set(CART_COOKIE, signCartId(row.id), cartCookieOptions);
      return row.id;
    }
  }
  if (!create) return null;

  const [created] = await db.insert(carts).values({}).returning({ id: carts.id });
  cookieStore.set(CART_COOKIE, signCartId(created.id), cartCookieOptions);
  return created.id;
}

/** Live stock and display name for a purchasable variant, or null if it can't be bought. */
async function getLiveVariant(variantId: number) {
  const [row] = await db
    .select({ stock: productVariants.stock, size: productVariants.size, name: products.name })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.isActive, true), eq(products.isActive, true)))
    .limit(1);
  return row ?? null;
}

const describe = (name: string, size: string) => (size === "One size" ? name : `${name}, size ${size}`);

export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const variantId = parseId(formData.get("variantId"));
  const quantity = parseQuantity(formData.get("quantity") ?? "1");
  if (variantId === null) return error("Please select a size.");
  if (quantity === null) return error("Please choose a valid quantity.");

  const variant = await getLiveVariant(variantId);
  if (!variant) return error("Sorry, this item is no longer available.");
  if (variant.stock <= 0) return error(`${describe(variant.name, variant.size)} is sold out.`);

  const cartId = await resolveCart(true);
  if (!cartId) return error("We couldn't open your bag. Please try again.");

  // Insert or increment in one statement, only while the result fits live stock.
  const result = await db.execute<{ quantity: number }>(sql`
    insert into cart_items (cart_id, variant_id, quantity)
    select ${cartId}, v.id, ${quantity}
    from product_variants v
    join products p on p.id = v.product_id
    where v.id = ${variantId} and v.is_active and p.is_active and v.stock >= ${quantity}
    on conflict (cart_id, variant_id) do update
      set quantity = cart_items.quantity + excluded.quantity, updated_at = now()
      where cart_items.quantity + excluded.quantity <= least(
        ${MAX_LINE_QUANTITY},
        (select stock from product_variants where id = excluded.variant_id)
      )
    returning quantity
  `);

  if (result.rows.length === 0) {
    const live = await getLiveVariant(variantId);
    if (!live || live.stock <= 0) return error(`${describe(variant.name, variant.size)} is sold out.`);
    const [line] = await db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
      .limit(1);
    const inBag = line?.quantity ?? 0;
    return error(
      inBag > 0
        ? `Only ${live.stock} left, and you already have ${inBag} in your bag.`
        : `Only ${live.stock} left in this size.`,
    );
  }

  refresh();
  return { status: "success", message: `${describe(variant.name, variant.size)} added to your bag.` };
}

export async function updateQuantity(lineId: number, quantity: number): Promise<CartActionState> {
  const id = parseId(lineId);
  const qty = parseQuantity(quantity);
  if (id === null || qty === null) return error("Please choose a valid quantity.");

  const cartId = await resolveCart(false);
  if (!cartId) return error("Your bag is empty.");

  // Scoped to the viewer's cart. Increases must fit live stock; decreases are
  // always allowed, so a line left above stock (stock fell) can step down.
  const updated = await db
    .update(cartItems)
    .set({ quantity: qty })
    .where(
      and(
        eq(cartItems.id, id),
        eq(cartItems.cartId, cartId),
        sql`(${qty} < ${cartItems.quantity} or ${qty} <= (select ${productVariants.stock} from ${productVariants} where ${productVariants.id} = ${cartItems.variantId}))`,
      ),
    )
    .returning({ id: cartItems.id });

  if (updated.length === 0) {
    const [line] = await db
      .select({ stock: productVariants.stock })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .where(and(eq(cartItems.id, id), eq(cartItems.cartId, cartId)))
      .limit(1);
    if (!line) return error("That item is no longer in your bag.");
    refresh();
    return error(line.stock <= 0 ? "This item is now sold out." : `Only ${line.stock} left.`);
  }

  refresh();
  return { status: "success", message: `Quantity updated to ${qty}.` };
}

export async function removeItem(lineId: number): Promise<CartActionState> {
  const id = parseId(lineId);
  if (id === null) return error("That item is no longer in your bag.");

  const cartId = await resolveCart(false);
  if (!cartId) return error("Your bag is empty.");

  await db.delete(cartItems).where(and(eq(cartItems.id, id), eq(cartItems.cartId, cartId)));
  refresh();
  return { status: "success", message: "Item removed from your bag." };
}
