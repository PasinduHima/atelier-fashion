# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS v4, with Better Auth, Drizzle ORM and Neon Postgres.

## Setup

Requires Node.js 20.9.0 or later.

1. `npm install`
2. `cp .env.example .env` and fill in:
   - `DATABASE_URL`: the Neon **pooled** connection string
   - `BETTER_AUTH_SECRET`: generate one with `npx auth@latest secret`
   - `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`: the site URL (`http://localhost:3000` in development)
3. `npm run db:migrate` to apply the committed migrations in `drizzle/` (the catalog tables).
4. `npm run db:seed` to load the sample catalog. `npm run build` fails while the products table is empty.
5. `npm run auth:generate` to generate the Better Auth tables into `src/db/schema.ts`, then
   `npm run db:generate` to write the migration. Review and commit the new SQL in `drizzle/`.
6. `npm run db:migrate` again to create the auth tables.
7. `npm run dev`

## Local checkout (Stripe, test mode)

Orders are only marked paid, stock reduced and the bag emptied when the **Stripe webhook** reaches
`/api/stripe/webhook`. Stripe can't call `localhost`, so locally the Stripe CLI must forward events,
**in a second terminal alongside `npm run dev`**:

```bash
npm run dev            # terminal 1
npm run stripe:listen  # terminal 2: forwards Checkout events to localhost:3000/api/stripe/webhook
```

Without `stripe:listen` running, test payments succeed in Stripe but orders stay `pending`, the
bag doesn't empty, and the confirmation page keeps saying it's still confirming the payment.

One-time setup:

1. Install the Stripe CLI (`npm i -g @stripe/cli`) and run `stripe login`, choosing the same sandbox
   your API key comes from.
2. In `.env`, set `STRIPE_SECRET_KEY` to a restricted test key (`rk_test_…`: Checkout Sessions write,
   Customers write, PaymentIntents read) and `STRIPE_WEBHOOK_SECRET` to the value printed by
   `stripe listen --print-secret`. It must be the CLI's secret, not a Dashboard endpoint's, or
   every forwarded event is rejected with a 400. Restart `npm run dev` after editing `.env`.

Test with Stripe's test cards, such as `4242 4242 4242 4242` (succeeds), `4000 0025 0000 3155`
(3-D Secure) or `4000 0000 0000 0002` (declined), with any future expiry and any CVC.

If an event was missed (for example the listener wasn't running), find it with
`stripe events list --type checkout.session.completed` and replay it with
`stripe events resend <event_id>` while `stripe:listen` runs. The handler skips events it has
already processed, so replays are safe.

## Deploying to Vercel

Every push to `master` becomes a production deployment. Before the first one, work through the
steps below in order: the build reads the catalog from the database, and the server refuses to
start without its environment variables.

### 1. Production database

Create a Neon branch (or project) for production and copy its **pooled** connection string. Then
create the tables and load the sample catalog from your machine, with `DATABASE_URL` set in the
shell. A shell variable takes precedence over `.env`, so `.env` is left alone:

```powershell
# PowerShell
$env:DATABASE_URL = "<production pooled connection string>"
npm run db:migrate
npm run db:seed
Remove-Item Env:DATABASE_URL
```

```bash
# bash
DATABASE_URL="<production pooled connection string>" npm run db:migrate
DATABASE_URL="<production pooled connection string>" npm run db:seed
```

- Seed before the first deploy: `npm run build` fails while the products table is empty.
- Running the seed again resets stock to the sample levels. It refuses to run with
  `NODE_ENV=production`, so leave that unset.
- For later schema changes, run `npm run db:migrate` against production **before** pushing the code
  that needs the new migration.

### 2. Stripe webhook endpoint

Decide the production URL first: usually `https://<project>.vercel.app`, or your own domain. Then,
in the Stripe Dashboard, in the same sandbox as `STRIPE_SECRET_KEY`, add a webhook endpoint:

- URL: `https://<your-domain>/api/stripe/webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed` and `checkout.session.expired`
- API version: `2026-10-28.endive`, the version pinned in `src/lib/stripe.ts`

Copy the endpoint's signing secret (`whsec_…`) for `STRIPE_WEBHOOK_SECRET`. Use the production
domain only: Vercel's Deployment Protection keeps Stripe out of preview and per-deployment URLs.

### 3. Vercel project

Import the GitHub repository with the Next.js preset and the default build settings. Under
**Settings → Functions**, set the function region next to your Neon region (Neon
`aws-ap-southeast-1` is Vercel `sin1`, Singapore). Add these environment variables for
**Production**:

| Variable | Local (`.env`) | Production (Vercel) |
| --- | --- | --- |
| `DATABASE_URL` | pooled string of your development branch | pooled string of the production branch |
| `BETTER_AUTH_SECRET` | any generated secret | a new one from `npx auth@latest secret` |
| `BETTER_AUTH_URL` | `http://localhost:3000` | `https://<your-domain>` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://<your-domain>`, the same as `BETTER_AUTH_URL` |
| `STRIPE_SECRET_KEY` | `rk_test_…` | `rk_test_…` from the sandbox that has the webhook endpoint |
| `STRIPE_WEBHOOK_SECRET` | printed by `stripe listen --print-secret` | the Dashboard endpoint's signing secret |

- Vercel uses these both when building and at runtime, so set all six before the first deploy.
- `NEXT_PUBLIC_APP_URL` is inlined at build time. Redeploy after changing it.
- The server refuses to start if a variable is missing, if the two URLs aren't the same site, or if
  the Stripe key is a live key. The function logs say which.

### 4. Deploy and check

Deploy, then on the production URL add something to the bag and pay with `4242 4242 4242 4242`. The
confirmation page should say "Thank you for your order", the bag should be empty, and the
endpoint's event deliveries in the Stripe Dashboard should show `200`.

When you move to another domain, update `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and the webhook
endpoint URL, then redeploy. Preview deployments (other branches) need their own Preview values,
or they won't start.

## Schema changes

Use versioned migrations: `npm run db:generate`, review and commit `drizzle/*.sql`, then `npm run db:migrate`.

`npm run db:push` is **local-only**: it changes the database without writing a migration. Use it only on a
throwaway local database, never on a shared or production one.

## Layout

- `src/db/index.ts` — Drizzle client over the Neon HTTP driver
- `src/db/schema.ts` — Better Auth tables, generated by `npm run auth:generate` (don't edit by hand)
- `src/db/catalog-schema.ts` — catalog tables (categories, products, stock)
- `src/lib/auth.ts` — Better Auth server instance (Drizzle adapter)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- `src/app/checkout/actions.ts` — starts Stripe Checkout from the bag (writes a `pending` order)
- `src/app/api/stripe/webhook/route.ts` — Stripe webhook: the only place orders become paid
- `src/lib/orders.ts` — fulfilment (order paid, stock reduced, bag emptied in one SQL statement)
- `drizzle.config.ts` — drizzle-kit config (migrations go to `./drizzle`)
