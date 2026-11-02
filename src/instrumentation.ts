/**
 * Runs once when a Next.js server instance starts, before it handles requests.
 * Fails fast on missing or inconsistent configuration so a bad deploy stops at startup instead
 * of answering /api/auth/* and catalog requests with 500s.
 *
 * The check lives here rather than in `@/lib/auth`, because the Better Auth CLI
 * (`npm run auth:generate`) imports that file outside the server.
 */

const REQUIRED_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
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

  // Better Auth only accepts requests from BETTER_AUTH_URL's origin, and Stripe
  // sends shoppers back to NEXT_PUBLIC_APP_URL: both must name this site.
  if (siteOrigin("BETTER_AUTH_URL") !== siteOrigin("NEXT_PUBLIC_APP_URL")) {
    throw new Error(
      "BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must be the same site URL (scheme, host and port), " +
        "for example https://your-domain in both.",
    );
  }
}

/** The origin of an env var that must hold this site's absolute http(s) URL. */
function siteOrigin(name: "BETTER_AUTH_URL" | "NEXT_PUBLIC_APP_URL"): string {
  const value = process.env[name]?.trim() ?? "";
  let url: URL | null = null;
  try {
    url = new URL(value);
  } catch {
    // Reported below.
  }
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
    throw new Error(`${name} must be an absolute URL such as https://your-domain (got "${value}").`);
  }
  return url.origin;
}
