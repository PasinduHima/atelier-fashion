/**
 * Runs once when a Next.js server instance starts, before it handles requests.
 * Fails fast on missing configuration so a bad deploy stops at startup instead
 * of answering /api/auth/* and catalog requests with 500s.
 *
 * The check lives here rather than in `@/lib/auth`, because the Better Auth CLI
 * (`npm run auth:generate`) imports that file outside the server.
 */

const REQUIRED_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  // Test mode only: refuse live Stripe keys outright.
  if (/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "")) {
    throw new Error("STRIPE_SECRET_KEY is a live key. This store runs in Stripe test mode only; use an rk_test_ key.");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
        "Set them in .env for local development (see .env.example) and in your hosting " +
        "provider's environment settings for Preview and Production.",
    );
  }
}
