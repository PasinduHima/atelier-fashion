import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

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
  // nextCookies() lets server actions set auth cookies; it must stay last.
  plugins: [nextCookies()],
});
