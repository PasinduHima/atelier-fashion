# CLAUDE.md

@AGENTS.md

## Next.js version warning

This project uses **Next.js 16.4** with **React 19.3**. APIs and conventions differ from older Next.js. Before writing Next.js code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`, etc.) and heed deprecation notices. `next dev` rewrites the block in `AGENTS.md`, so leave it alone.

Flags turned on in `next.config.ts` that change how you write code:
- `cacheComponents: true`: Cache Components mode. Dynamic data and caching follow the `"use cache"` / Suspense model, not the older `fetch` cache or route segment config. Read the docs before adding data fetching.
- Tailwind CSS v4 runs through a Turbopack loader rule (`@tailwindcss/turbopack`) for `*.css`. There is no PostCSS config. Theme tokens live in `src/app/globals.css` under `@theme inline`.

Typed route helpers such as `LayoutProps<"/">` and `PageProps` are global types that Next generates. Use them for layout and page props.

never read .env

## Setup / environment

Copy `.env.example` to `.env.local`. Required values: `DATABASE_URL` (the Neon **pooled** connection string), `BETTER_AUTH_SECRET` (generate with `npx auth@latest secret`), `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL`. `drizzle.config.ts` loads `.env.local` and then `.env` through dotenv. Both it and `src/db/index.ts` throw at import time if `DATABASE_URL` is missing.

## Architecture

- **DB layer**: `src/db/index.ts` exports a single `db`. It is Drizzle over the Neon **HTTP** driver (`drizzle-orm/neon-http`), with the full schema module attached so relational queries (`db.query.*`) work. The HTTP driver doesn't support interactive transactions. If you need them, switch to the Neon WebSocket/Pool driver.
- **Schema**: `src/db/schema.ts` is reserved for Better Auth and is **overwritten** by `npm run auth:generate`. It is currently empty, so auth will not work until you run `auth:generate` and then migrate. Better Auth looks up its tables by model name (`user`, `session`, `account`, `verification`).
- **Database conventions**:
  - App tables go in `src/db/catalog-schema.ts`, never `schema.ts`. If you add another schema file, register it in both `drizzle.config.ts` and `src/db/index.ts`.
  - Change the schema with versioned migrations: `db:generate`, review and commit `drizzle/*.sql`, then `db:migrate`. Don't use `db:push`.
  - Store money as integer cents (`price_cents`), never floats or numeric dollars.
  - Storefront reads go through the `"use cache"` functions in `src/lib/products.ts` (tags `products` / `categories`). Any write to products or stock must call `revalidateTag("products", "max")`, or `updateTag` in a server action.
- **Auth**:
  - Server: `src/lib/auth.ts` sets up `betterAuth` with the Drizzle adapter (`provider: "pg"`) and the `nextCookies()` plugin. That plugin lets server actions set auth cookies, and it must stay the last plugin in the list. Use `auth.api.*` (for example `auth.api.getSession({ headers: await headers() })`) in server components and actions.
  - When you add an auth method or plugin (email/password, OAuth, and so on), configure it in `auth.ts`. Add the matching client plugin in `auth-client.ts` if one exists, then rerun `auth:generate` and migrate.
