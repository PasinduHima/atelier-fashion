import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The guest cart cookie: `<cartId>.<signature>`. The cart id is a random UUID;
 * the HMAC (keyed from BETTER_AUTH_SECRET with a purpose label) means a value
 * can't be forged or edited to point at someone else's cart.
 */

export const CART_COOKIE = "atelier_cart";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const cartCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function signingKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  // Derive a purpose-specific key so the auth secret is never used directly.
  return createHmac("sha256", secret).update("cart-cookie:v1").digest();
}

function sign(cartId: string): string {
  return createHmac("sha256", signingKey()).update(cartId).digest("base64url");
}

export function signCartId(cartId: string): string {
  return `${cartId}.${sign(cartId)}`;
}

/** The cart id from a cookie value, or null if it is missing, malformed or tampered with. */
export function verifyCartCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const cartId = value.slice(0, dot);
  if (!UUID.test(cartId)) return null;

  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(cartId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return cartId;
}
