# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS v4, with Better Auth, Drizzle ORM and Neon Postgres.

## Setup

1. `npm install`
2. `cp .env.example .env.local` and fill in `DATABASE_URL` (Neon) and `BETTER_AUTH_SECRET`.
3. `npm run auth:generate` to generate the Better Auth tables into `src/db/schema.ts`.
4. `npm run db:push` (or `db:generate` + `db:migrate`) to apply the schema to Neon.
5. `npm run dev`

## Layout

- `src/db/index.ts` — Drizzle client over the Neon HTTP driver
- `src/db/schema.ts` — Drizzle tables
- `src/lib/auth.ts` — Better Auth server instance (Drizzle adapter)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- `drizzle.config.ts` — drizzle-kit config (migrations go to `./drizzle`)
