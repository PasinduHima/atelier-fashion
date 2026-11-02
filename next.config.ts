import type { NextConfig } from "next";

/**
 * Baseline security headers for every response.
 *
 * There is deliberately no script, image, connect or form-action policy:
 * Stripe Checkout is a full-page redirect (browsers apply form-action to the
 * redirect after a form post), and photos load straight from
 * images.unsplash.com. The only CSP directive stops other sites framing the
 * store. Permissions-Policy leaves `payment` alone for a future embedded
 * Stripe form.
 */
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" }, // frame-ancestors for older browsers
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Production builds only. Browsers ignore HSTS over plain http, but in dev
  // it would pin https://localhost (every port) to HTTPS for two years.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // Sample photography comes from Unsplash, whose CDN resizes images itself.
    // The loader asks it for each responsive width directly (see the file).
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
