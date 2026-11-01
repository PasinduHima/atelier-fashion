# Stripe integration plan: hosted Checkout

Status: **plan only**. No code, packages or Stripe objects exist yet. Build product variants and the cart first, then implement this plan.

Source: the Stripe plugin's `stripe-best-practices` guidance (plugin 0.11.17, November 2026). `stripe_implementation_planner` wasn't available because the Stripe MCP sign-in never completed. Before implementing, check the details against the planner or docs.stripe.com.

## 1. Context and decisions

| Topic | Decision |
| --- | --- |
| Mode | **Test mode only.** This is a portfolio/learning project. Stripe can't onboard live accounts in Sri Lanka, so never activate live mode under a different country. |
| Environment | A Stripe **sandbox**, not the account's shared test mode. Without a Stripe account, `npm i -g @stripe/cli` then `stripe sandbox create` makes one with no registration and issues test keys. Use a separate sandbox for CI if CI is added. |
| API surface | **Checkout Sessions API, hosted page** (`ui_mode` default/hosted). No Payment Element, PaymentIntents or Charges API. |
| API version / SDK | `2026-09-30.endive`, `stripe` Node SDK **23.x**. Pin `apiVersion` when constructing the client. |
| Currency | `usd`. Every amount is integer cents, taken straight from `price_cents`, with no float conversion. Stripe's minimum charge is $0.50. |
| Payment methods | **Don't pass `payment_method_types`.** Dynamic payment methods are managed in the Dashboard under Settings → Payment methods. |
| Tax | Off. Don't set `automatic_tax`. Before enabling it later, set up Stripe Tax registrations first, or no tax is collected. |
| Customers | Guests and signed-in Better Auth users (see §4). |
| Shipping | One flat rate, plus free shipping at or above a subtotal threshold (see §5). |
| Fulfillment | **Webhook-driven** (required, not optional). The success page only displays status. |

## 2. Keys and configuration

Add these to `.env` (git-ignored). Add placeholders to `.env.example`, and add the server-only values to the startup check in `src/instrumentation.ts`:

| Variable | Value | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `rk_test_…` | Use a **restricted key**, not `sk_`. Server only, never `NEXT_PUBLIC_`. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | The CLI prints one for local `stripe listen`; the Dashboard endpoint has its own. |

A publishable key isn't needed because hosted Checkout is a server-side redirect to `session.url`. Stripe.js isn't loaded.

Permissions for the restricted key (least privilege; add more only if a 403 shows up during testing):
- Checkout Sessions: **write** (create, retrieve, list line items, expire)
- Customers: **write** (create/reuse a customer for signed-in users)
- PaymentIntents: **read** (show the payment status/receipt when needed)
- Refunds: **write**, only if the automatic oversell refund in §7 is implemented

Hygiene:
- Create one `StripeClient` instance in `src/lib/stripe.ts` with `import "server-only"`. Don't use the global key pattern.
- Never log keys or include them in errors.
- Add a pre-commit check that rejects `sk_live_`, `rk_live_`, `sk_test_` and `rk_test_` strings.

## 3. Data model (`src/db/catalog-schema.ts`, versioned migration)

These tables assume the upcoming variants work adds `product_variants` (id, product_id, size/colour, sku, optional `price_cents` override), with stock moved to the variant level as `variant_stock`. Adjust the names to match whatever you build.

- **`orders`**
  - `id`, `public_id` (unguessable, used in URLs)
  - `user_id` (nullable FK to Better Auth `user.id`; null for guests), `email`
  - `status`: `pending | paid | payment_failed | expired | canceled | needs_attention`
  - `subtotal_cents`, `shipping_cents`, `total_cents`, `currency`
  - `stripe_checkout_session_id` (unique), `stripe_payment_intent_id`
  - `shipping_name`, `shipping_address` (jsonb), `paid_at`, timestamps
  - CHECKs: cents ≥ 0 and `total = subtotal + shipping`
- **`order_items`**
  - `order_id`, `variant_id`, `quantity` (> 0)
  - Snapshot columns: `product_name`, `variant_label`, `unit_price_cents`, `line_total_cents`
  - The snapshot keeps an order's history correct after catalog edits.
- **`stripe_customers`**
  - `user_id` (PK, FK to `user.id`), `stripe_customer_id` (unique)
  - This table lives here rather than in a column on `user`, because `npm run auth:generate` overwrites `schema.ts`.
- **`stripe_events`**
  - `id` (Stripe event id, PK), `type`, `processed_at`
  - Gives idempotency: Stripe redelivers events, and a duplicate insert means the event is skipped.

## 4. Creating the Checkout Session (server action `startCheckout`)

1. **Read the cart server-side.** The cart contains only `variantId` and `quantity`. Never trust prices, names or totals from the client.
2. **Load the variants, products and stock from the DB.**
   - Read the database directly, not through the `"use cache"` readers, so stock is fresh.
   - Reject inactive products and quantities above available stock.
   - Compute `subtotal_cents`.
3. **Pick the shipping option** (§5).
4. **Insert a `pending` order and its `order_items`.** Use one `db.batch([...])` call. The Neon HTTP driver runs a batch atomically, without needing interactive transactions.
5. **Call `stripe.checkout.sessions.create`** with:
   - `mode: "payment"`
   - `line_items`: one per item, using `price_data: { currency: "usd", unit_amount, product_data: { name, images: [imageUrl], metadata: { variant_id } } }` and `quantity`. There's no need to mirror the catalog as Stripe Products/Prices while prices live in Postgres.
   - `shipping_address_collection: { allowed_countries: [...] }`, the countries you ship to.
   - `shipping_options`: from §5.
   - `client_reference_id: order.public_id`
   - `metadata: { order_id }` and `payment_intent_data: { metadata: { order_id } }`
   - `success_url: ${NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`, `cancel_url: ${NEXT_PUBLIC_APP_URL}/bag`
   - `expires_at`: now + 30 minutes (the minimum), so abandoned orders close quickly.
   - `integration_identifier: "atelier-hosted-checkout-qzmvrkta"`, a fixed label with an 8-letter suffix for Dashboard tracking.
   - **Signed-in user:** `customer`, the existing or newly created customer from `stripe_customers`. Create it with `email` and `metadata.user_id`.
   - **Guest:** `customer_creation: "if_required"`. Checkout collects the email. Don't create customers for guests.
   - **Idempotency key:** `checkout-${order.public_id}`, so a double submit doesn't create two sessions.
   - **Never** pass `payment_method_types` or `automatic_tax`.
6. **Store the session id on the order**, then `redirect(session.url)` from the action.

## 5. Shipping

- Keep the config in code (`src/lib/shipping.ts`): `FLAT_RATE_CENTS` and `FREE_SHIPPING_THRESHOLD_CENTS`, with values to be decided.
- Decide eligibility server-side from the computed subtotal, before discounts (discounts are out of scope):
  - Subtotal ≥ threshold: pass a single `shipping_rate_data`, "Free shipping", with `fixed_amount.amount: 0`.
  - Below the threshold: pass a single "Standard shipping" rate at `FLAT_RATE_CENTS`, with `delivery_estimate` set.
- Use inline `shipping_rate_data` rather than Dashboard shipping-rate ids. This keeps rates in code and means no Stripe objects need creating.
- The bag page should show "$X away from free shipping", using the same constants.

## 6. Webhook endpoint: `src/app/api/stripe/webhook/route.ts`

- Use a Route Handler with the Node runtime. Read the **raw** body with `await request.text()`, then verify it with `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`. Return `400` if verification fails.
- Return `2xx` quickly. Let Stripe retry on `5xx`.
- Idempotency: insert the event id into `stripe_events` with `ON CONFLICT DO NOTHING`. If nothing was inserted, the event was already processed, so return 200.
- Events to subscribe to:

| Event | Action |
| --- | --- |
| `checkout.session.completed` | If `payment_status` is `paid` or `no_payment_required`, run **fulfill**. If it's `unpaid` (delayed payment method), leave the order `pending`. |
| `checkout.session.async_payment_succeeded` | Run **fulfill**. |
| `checkout.session.async_payment_failed` | Set the order to `payment_failed`. |
| `checkout.session.expired` | Set the order to `expired`. Stock was never decremented, so nothing needs releasing. |

**Fulfill** runs as one atomic `db.batch`:
1. `UPDATE orders SET status='paid', paid_at=now(), email, shipping, payment_intent … WHERE id = $1 AND status = 'pending' RETURNING id`. Only a transition from `pending` continues, which gives a second idempotency guard.
2. Decrement stock per item with a conditional update: `UPDATE variant_stock SET quantity = quantity - $n WHERE variant_id = $v AND quantity >= $n`.
3. If any decrement touched 0 rows, the item oversold. Set the order to `needs_attention` and, optionally, refund automatically with `stripe.refunds.create({ payment_intent })`.

After that, call `revalidateTag("products", "max")` so storefront stock updates (the CLAUDE.md rule). Recompute and display amounts from the **session** (`amount_subtotal`, `shipping_cost.amount_total`, `amount_total`), and if they don't match the order's totals, flag the order.

Stock is decremented on payment, not reserved at checkout start. That's simple and fine for a demo; the oversell window is handled by the refund path. If it matters later, add reservations with the `expires_at` TTL.

## 7. Pages

- **`/checkout/success`**
  - Dynamic. Under Cache Components, wrap it in `<Suspense>`.
  - Retrieve the session by `session_id`, look up the order by `metadata.order_id` and show its **DB status**: "Confirmed", or "Processing payment…" while still `pending`.
  - The page **doesn't fulfill** anything.
  - Clear the cart here, or once the order shows `paid`.
- **`/bag`**: the cancel destination. The cart is untouched and the pending order expires on its own.
- **`/account/orders`** (optional): the signed-in user's orders, by `user_id`.

## 8. Testing (test mode)

- **Local webhooks:**
  - Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
  - Copy the printed `whsec_` into `STRIPE_WEBHOOK_SECRET`.
  - Run `stripe logs tail` while testing to spot restricted-key 403s.
- **Test cards:**

| Card | Outcome |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | 3-D Secure |
| `4000 0000 0000 9995` | Declines (insufficient funds) |

- **Delayed payment:** enable a delayed method in the sandbox (for example US bank account/ACH) to exercise `async_payment_succeeded` and `async_payment_failed`.
- **Scenarios:**
  - Guest checkout
  - Signed-in checkout, including customer reuse on a second order
  - Subtotal just below and at the free-shipping threshold
  - Duplicate webhook delivery (`stripe events resend <id>`)
  - Abandoned session (expire it early with `stripe checkout sessions expire`)
  - Oversell (two sessions racing for the last unit)
  - Bad signature returns 400
- Verify with `npm run build` and `next start -p 3123`. Don't restart the dev server on :3000.

## 9. Implementation order (after variants and cart exist)

1. Set up the sandbox and the restricted key, add the env vars and the instrumentation check, and install `stripe@23`.
2. Add the schema (`orders`, `order_items`, `stripe_customers`, `stripe_events`), then run `db:generate`, review, and `db:migrate`.
3. Add `src/lib/stripe.ts` (the client) and `src/lib/shipping.ts`.
4. Add the `startCheckout` server action and wire it to the bag page.
5. Add the webhook route with fulfill, the stock decrement and `revalidateTag`.
6. Add the success page and order status.
7. Run through the testing checklist (§8).

## 10. Out of scope for now

Tax (Stripe Tax), discounts/promotion codes, multiple shipping tiers, saved payment methods, refunds UI, emails (Stripe's test-mode receipts are enough), CSP headers (needed only once Stripe.js is embedded), and going live.
