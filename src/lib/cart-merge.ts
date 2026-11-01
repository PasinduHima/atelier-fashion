import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { carts } from "@/db/catalog-schema";

/** Most units of one variant a bag line may hold. */
export const MAX_LINE_QUANTITY = 99;

/**
 * Moves a guest cart's items into the user's cart, then deletes the guest
 * cart. Quantities add up but are capped at live stock; sold-out and
 * withdrawn lines are dropped. Runs as one atomic batch (the Neon HTTP driver
 * has no interactive transactions).
 *
 * Kept apart from `@/lib/cart` because `@/lib/auth` calls it on sign-in and
 * `@/lib/cart` imports `@/lib/auth`.
 */
export async function mergeGuestCart(userId: string, guestCartId: string): Promise<void> {
  await db.batch([
    db.insert(carts).values({ userId }).onConflictDoNothing({ target: carts.userId }),
    db.execute(sql`
      insert into cart_items (cart_id, variant_id, quantity)
      select uc.id, gi.variant_id, least(gi.quantity, v.stock, ${MAX_LINE_QUANTITY})
      from cart_items gi
      join carts gc on gc.id = gi.cart_id and gc.user_id is null
      join carts uc on uc.user_id = ${userId}
      join product_variants v on v.id = gi.variant_id and v.is_active
      join products p on p.id = v.product_id and p.is_active
      where gi.cart_id = ${guestCartId} and v.stock > 0
      on conflict (cart_id, variant_id) do update
        set quantity = least(
              cart_items.quantity + excluded.quantity,
              (select stock from product_variants where id = excluded.variant_id),
              ${MAX_LINE_QUANTITY}
            ),
            updated_at = now()
    `),
    db.delete(carts).where(and(eq(carts.id, guestCartId), sql`${carts.userId} is null`)),
  ]);
}
