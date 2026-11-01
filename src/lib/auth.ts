import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CART_COOKIE, cartCookieOptions, verifyCartCookie } from "@/lib/cart-cookie";
import { mergeGuestCart } from "@/lib/cart-merge";

/**
 * Better Auth server instance. Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL
 * from the environment (checked at startup in src/instrumentation.ts).
 */
export const auth = betterAuth({
  appName: "Atelier",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    // Whenever a request creates a session (sign-in or sign-up by any method),
    // fold the visitor's guest bag into their account bag.
    after: createAuthMiddleware(async (ctx) => {
      const userId = ctx.context.newSession?.user.id;
      if (!userId) return;
      const guestCartId = verifyCartCookie(ctx.getCookie(CART_COOKIE));
      if (!guestCartId) return;
      try {
        await mergeGuestCart(userId, guestCartId);
        ctx.setCookie(CART_COOKIE, "", { ...cartCookieOptions, maxAge: 0 });
      } catch (error) {
        // Never block sign-in over the bag; the cart actions retry the merge.
        console.error("Guest cart merge failed", error);
      }
    }),
  },
  // nextCookies() lets server actions set auth cookies; it must stay last.
  plugins: [nextCookies()],
});
