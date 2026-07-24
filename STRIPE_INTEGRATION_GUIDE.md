# Stripe Integration Implementation Guide

> **Status of this project:** The database schema and architecture are fully designed for Stripe integration. The actual API routes and webhook handlers are **not yet implemented**. This guide documents the complete design — the database tables, architectural decisions, data flow, and implementation plan — so that another project can reproduce the same integration from scratch.

---

## 1. High-Level Architecture

### Overview

This is a B2B solar energy e-commerce platform (nexon-ecom) built with Next.js 16, Prisma 7, Supabase (PostgreSQL), and Stripe for payment processing.

The payment flow follows a **Stripe-hosted Checkout** pattern — the platform never sees raw card numbers, keeping it out of PCI-DSS scope.

### The Complete Payment Flow

```
User browses catalog → adds items to cart
        ↓
User clicks "Checkout" → enters shipping address
        ↓
POST /api/orders → creates Order (status: pending_payment) + clears cart
        ↓
POST /api/checkout → creates Stripe Checkout Session
        ↓
User redirected to Stripe-hosted payment page
        ↓
User completes payment (or cancels)
        ↓
Stripe calls webhook → POST /api/webhooks/stripe
        ↓
Webhook verifies signature → processes event
        ↓
Order status updated to "paid"
        ↓
Payment record created (billing.payments)
        ↓
If credit account used: ledger entry created (billing.credit_ledger_entries)
        ↓
Order fulfillment begins (processing → shipped → delivered)
```

### How Everything Connects

| Component | Role |
|-----------|------|
| **Stripe** | Hosted checkout UI, payment processing, webhook delivery |
| **Next.js 16 (App Router)** | Server components for pages, API routes for checkout/webhook/orders |
| **Supabase (PostgreSQL)** | Single database with 8 Postgres schemas (identity, commerce, billing, crm, catalog, inventory, audit, shared) |
| **Prisma 7** | ORM with interactive transactions (`$transaction`) for atomic multi-table writes |
| **Webhooks** | Stripe delivers events to `POST /api/webhooks/stripe` — signature verified with `stripe.webhooks.constructEvent()` |
| **Credit Accounts** | Append-only ledger (`CreditLedgerEntry`); balance is derived (`SUM(amount)`), never directly mutated |
| **Database** | Postgres with PgBouncer connection pooling (session mode, port 5432, required for Prisma interactive transactions) |

### Key Architectural Decision: Never Call Stripe Inside a DB Transaction

From `ARCHITECTURE.md` line 280:

> Never call an external API inside a database transaction. Stripe calls, email sends, and PDF generation do not belong inside a `$transaction` block — if the external call hangs, the DB transaction hangs with it.

**Pattern:** Commit the DB transaction first (order created with `status: 'pending_payment'`), then call Stripe's API outside the transaction. For critical flows, use an **outbox pattern**: write an `outbox_events` row in the same transaction as the business write, and a worker dispatches from the outbox.

---

## 2. Database

All Stripe/payment-related tables live in two Postgres schemas: `commerce` and `billing`.

### `commerce.orders` (Order table)

**Purpose:** The financial/legal record of a placed order. Belongs to the Organization, not the User (B2B).

**Stripe-relevant columns:**

| Column | Type | Null | Purpose |
|--------|------|------|---------|
| `stripe_checkout_session_id` | TEXT | YES | The Stripe Checkout Session ID (e.g. `cs_test_...`) — stored when the checkout session is created, used to look up the order when the webhook arrives |
| `stripe_payment_intent_id` | TEXT | YES | The Stripe PaymentIntent ID (e.g. `pi_...`) — stored when the webhook processes `checkout.session.completed` |

**Status enum (`OrderStatus`):**
```
pending_payment   ← order created, awaiting Stripe checkout
paid              ← webhook confirmed payment
processing        ← fulfillment started
shipped
delivered
cancelled
refunded
```

**Indexes:**
- `idx_orders_stripe_payment_intent_id` on `stripe_payment_intent_id` — used by webhook handler to find the order by PaymentIntent ID
- `idx_orders_organization_id_placed_at (organization_id, placed_at DESC)` — used for "my orders" page
- `idx_orders_status` — used for admin order management

**Key rules:**
- Never deleted (hard or soft). Cancellation is a `status` value, not a row deletion.
- `order_items.order_id` uses `ON DELETE RESTRICT`, making it structurally impossible to delete an order.

### `commerce.order_items`

**Purpose:** Immutable line items — snapshots of product name, SKU, and price at order time. Never updated. No `updatedAt` column.

**Stripe relevance:** The line items' `lineTotal` values are summed into the order's `total`, which is the amount charged via Stripe.

### `billing.payments`

**Purpose:** Record of every payment. Never deleted — refunds are new rows pointing back at the original.

| Column | Type | Null | Purpose |
|--------|------|------|---------|
| `stripe_payment_intent_id` | TEXT | YES | Stripe PaymentIntent ID — links to the Stripe charge |
| `stripe_charge_id` | TEXT | YES | Stripe Charge ID (from `payment_intent.charges.data[0].id`) |
| `amount` | NUMERIC(12,2) | NO | Amount charged in AUD |
| `currency_code` | CHAR(3) | NO | Always 'AUD' |
| `method` | PaymentMethod enum | NO | `card`, `bank_transfer`, or `credit_account` |
| `status` | PaymentStatus enum | NO | `pending` → `succeeded` / `failed` / `refunded` / `partially_refunded` |
| `organization_id` | UUID | NO | FK → `identity.organizations` |
| `order_id` | UUID | YES | FK → `commerce.orders` |
| `invoice_id` | UUID | YES | FK → `billing.invoices` |
| `refunded_payment_id` | UUID | YES | Self-referencing — points to the original payment this refunds |
| `failure_reason` | TEXT | YES | Stored when status = `failed` |

**Indexes:**
- `idx_payments_stripe_payment_intent_id` — deduplication / idempotency lookups
- `idx_payments_organization_id` — "this organization's payment history"
- `idx_payments_order_id` — "payments for order X"
- `idx_payments_invoice_id` — "payments for invoice X"

### `billing.credit_accounts`

**Purpose:** One credit facility per organization. Think of it as a "store credit" or "purchasing account" for B2B customers.

| Column | Type | Null | Purpose |
|--------|------|------|---------|
| `organization_id` | UUID | NO | One credit account per organization (unique while active) |
| `credit_limit` | NUMERIC(12,2) | NO | Maximum credit the organization can use (default 0 = no credit) |
| `cached_balance` | NUMERIC(12,2) | NO | **Derived** from `SUM(credit_ledger_entries.amount)` — fast read, but NOT authoritative |
| `status` | CreditAccountStatus | NO | `active`, `suspended`, `closed` |
| `currency_code` | CHAR(3) | NO | Always 'AUD' |

**Critical rule:** `cached_balance` is a denormalized cache. The source of truth is `CreditLedgerEntry`. A reconciliation job must periodically verify `cached_balance = SUM(ledger_entries)`. Before closing a credit account, the application must verify `cached_balance = 0`.

### `billing.credit_ledger_entries`

**Purpose:** Append-only debit/credit ledger — the actual source of truth for balance.

| Column | Type | Null | Purpose |
|--------|------|------|---------|
| `credit_account_id` | UUID | NO | FK → `credit_accounts` |
| `entry_type` | CreditLedgerEntryType | NO | `invoice_charge`, `payment`, `credit_note`, `adjustment` |
| `amount` | NUMERIC(12,2) | NO | **Sign convention:** positive = charge (increases owed balance), negative = payment/credit |
| `reference_type` | TEXT | YES | Polymorphic — e.g. `'order'`, `'payment'`, `'invoice'` |
| `reference_id` | UUID | YES | Polymorphic — the ID of the referenced entity |
| `description` | TEXT | YES | Human-readable description |
| `created_by_user_id` | UUID | YES | Who created this entry |

**Key rules:**
- No `updatedAt`, no soft delete. A correction is a new offsetting entry, never an edit.
- `referenceId` has no FK — it's polymorphic (same pattern as Activity.entityId).
- All ledger operations use **Serializable isolation** to prevent balance races.

### `billing.invoices`

**Purpose:** Issued to the customer after payment. No `deletedAt` — voided via `status = 'void'`.

Stripe-relevant: An invoice is created post-payment (or when using credit accounts), not before Stripe checkout. The Order itself is the pre-payment record.

---

## 3. Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Server (API routes) | Stripe secret key (`sk_live_...` or `sk_test_...`). Used to create Checkout Sessions and verify webhook signatures. **Never exposed to the client.** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client (Checkout page) | Stripe publishable key (`pk_live_...` or `pk_test_...`). Used to redirect to Stripe's hosted checkout. Safe to expose. |
| `STRIPE_WEBHOOK_SECRET` | Server (webhook route) | Webhook signing secret (`whsec_...`). Used by `stripe.webhooks.constructEvent()` to verify webhook payloads came from Stripe, not an attacker. |
| `DATABASE_URL` | Prisma | Supabase Postgres connection string (session mode, port 5432). Required for Prisma interactive transactions. |
| `DIRECT_URL` | Prisma migrations | Direct (unpooled) connection string for migrations. PgBouncer transaction mode doesn't support migration DDL. |

**Where they go:**
- `.env.local` for local development
- Vercel/cloud platform environment variables for production
- Never committed to git

---

## 4. Stripe Configuration

### Checkout Session Creation

The checkout session is created by `POST /api/checkout` (not yet implemented). The request body contains the `orderId` from the previously created order.

```javascript
// Pseudocode — not yet implemented in this project
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],

  // Line items come from the order's items (already snapshotted)
  line_items: order.items.map(item => ({
    price_data: {
      currency: 'aud',
      product_data: {
        name: item.productNameSnapshot,
      },
      unit_amount: Math.round(Number(item.unitPriceSnapshot) * 100), // Stripe uses cents
    },
    quantity: item.quantity,
  })),

  // Customer information
  customer_email: user.email, // from authenticated session
  client_reference_id: order.id, // our internal order UUID

  // URLs
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?cancelled=true`,

  // Metadata for webhook processing
  metadata: {
    orderId: order.id,
    orderNumber: order.orderNumber,
    organizationId: order.organizationId,
  },

  // Australian business — charge in AUD
  currency: 'aud',

  // Tax is already calculated and included in the line item prices
  // Stripe's tax collection is NOT used — we handle GST ourselves
});
```

### Success URL

`/checkout/success?session_id={CHECKOUT_SESSION_ID}`

This page:
1. Reads the session ID from the URL
2. Retrieves the session from Stripe to confirm payment status
3. Shows a confirmation page with order details
4. Does NOT update order status — the webhook handles that (more reliable)

### Cancel URL

`/checkout?cancelled=true`

Returns the user to the checkout page with a "payment cancelled" message. The order remains in `pending_payment` status and can be retried.

### Metadata

Every Stripe object carries our internal IDs in `metadata`:
- `orderId` — our internal order UUID
- `orderNumber` — human-readable (e.g. "ORD-000042")
- `organizationId` — the B2B organization placing the order

This metadata is the bridge between Stripe's world and our database. The webhook handler reads `metadata.orderId` to find the right order.

### Currency

Everything is in AUD (Australian Dollars). The database and Stripe both use `aud`. GST (10%) is calculated server-side and baked into the line item prices.

### Customer Information

`customer_email` is set from the authenticated user's email. The shipping address is already stored in `orders.shipping_address_snapshot` (JSONB). Stripe's `shipping_address_collection` can be enabled for address collection on Stripe's side if desired.

### Webhook Endpoint

```
POST /api/webhooks/stripe
```

Configured in the Stripe Dashboard at: https://dashboard.stripe.com/webhooks

Events to listen for:
- `checkout.session.completed` — payment succeeded
- `checkout.session.expired` — session timed out (24h), order can be cancelled
- `payment_intent.payment_failed` — card declined

### Webhook Secret

The `STRIPE_WEBHOOK_SECRET` (`whsec_...`) is used by `stripe.webhooks.constructEvent()`:

```javascript
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
```

This verifies that the webhook payload genuinely came from Stripe and hasn't been tampered with. **Without this verification, anyone could POST fake payment confirmations to the endpoint.**

---

## 5. Wallet / Credit Account Top-up Flow

This project uses **credit accounts** (not prepaid wallets). The intended flow is:

```
Organization requests a credit limit increase
        ↓
Admin approves and sets CreditAccount.creditLimit
        ↓
Organization places order → chooses "credit account" as payment method
        ↓
Order created with status "pending_payment"
        ↓
System checks: cachedBalance + order.total <= creditLimit
        ↓
If approved: CreditLedgerEntry created (positive amount = charge)
        ↓
cachedBalance recomputed: cachedBalance + amount
        ↓
Order status → "paid"
        ↓
Payment record created (method: credit_account, status: succeeded)
```

**Note:** This flow is NOT a traditional "top-up wallet" where users add funds first. It's a B2B credit facility — organizations are extended a credit line, purchase against it, and pay invoices later.

### Balance Inquiry

```javascript
// Balance is derived, not stored:
const balance = await prisma.creditLedgerEntry.aggregate({
  where: { creditAccountId: accountId },
  _sum: { amount: true },
});
// balance._sum.amount = current owed balance
// creditAccount.creditLimit - balance._sum.amount = available credit
```

---

## 6. Webhook Flow

### Events Listened To

| Event | What Happens |
|-------|-------------|
| `checkout.session.completed` | Payment succeeded. Update order status to `paid`, create Payment record, update credit account if applicable. |
| `checkout.session.expired` | Session timed out (24 hours). Mark order as `cancelled` if still `pending_payment`. |
| `payment_intent.payment_failed` | Card declined. Log the failure, keep order as `pending_payment` so user can retry. |

### `checkout.session.completed` — Step by Step

```
1. Stripe sends POST to /api/webhooks/stripe
2. Extract stripe-signature header
3. Verify signature with stripe.webhooks.constructEvent()
4. Extract event.data.object (the Checkout Session)
5. Read metadata.orderId from the session
6. Read stripe_payment_intent_id from the session
7. Look up order by id
8. If order.status !== 'pending_payment' → return 200 (idempotency: already processed)
9. Start Prisma $transaction (Serializable isolation):
   a. Update order: status = 'paid', stripePaymentIntentId = pi_xxx
   b. Create Payment record: amount = order.total, method = 'card',
      status = 'succeeded', stripePaymentIntentId = pi_xxx
   c. If credit account involved: create CreditLedgerEntry
10. Return 200 to Stripe
11. Enqueue post-payment tasks (invoice generation, email) via job queue — NOT inline
```

### Duplicate Protection / Idempotency

Stripe may deliver webhooks more than once. Duplicate protection is critical:

1. **Check order status before processing.** If the order is already `paid`, skip everything and return 200. This is safe because order status transitions are monotonic: `pending_payment → paid → processing → ...`

2. **Stripe's idempotency key.** Stripe includes `event.id` in every webhook. Storing processed event IDs and skipping re-delivery is an additional layer.

3. **Database-level protection.** The `$transaction` block means that even if two webhooks arrive simultaneously, the second one will either see the order already `paid` or fail on a constraint.

### Error Handling

```javascript
try {
  // Verify signature
  const event = stripe.webhooks.constructEvent(rawBody, sig, secret);
} catch (err) {
  return Response.json({ error: 'Invalid signature' }, { status: 400 });
}

try {
  // Process event
  await handleCheckoutCompleted(event.data.object);
} catch (err) {
  console.error('Webhook processing failed:', err);
  // Return 500 so Stripe retries
  return Response.json({ error: 'Processing failed' }, { status: 500 });
}

// Success
return Response.json({ received: true });
```

**Key rule:** Only return 200 when processing succeeded. If you return 4xx/5xx, Stripe will retry with exponential backoff (up to 3 days for `checkout.session.completed`).

---

## 7. Wallet / Credit Account Logic

This project uses an **append-only ledger** pattern, not a mutable balance column.

### Increment Balance (Charge)

When an organization purchases on credit:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. Insert ledger entry
  await tx.creditLedgerEntry.create({
    data: {
      creditAccountId: account.id,
      entryType: 'invoice_charge',
      amount: orderTotal, // positive = charge (increases owed balance)
      referenceType: 'order',
      referenceId: orderId,
      description: `Order ${orderNumber}`,
    },
  });

  // 2. Update cached balance
  await tx.creditAccount.update({
    where: { id: account.id },
    data: {
      cachedBalance: { increment: orderTotal },
    },
  });
}, { isolationLevel: 'Serializable' });
```

### Decrement Balance (Payment)

When an organization pays their invoice:

```javascript
await prisma.$transaction(async (tx) => {
  await tx.creditLedgerEntry.create({
    data: {
      creditAccountId: account.id,
      entryType: 'payment',
      amount: -paymentAmount, // negative = payment (decreases owed balance)
      referenceType: 'payment',
      referenceId: paymentId,
      description: `Payment received — ${paymentMethod}`,
    },
  });

  await tx.creditAccount.update({
    where: { id: account.id },
    data: {
      cachedBalance: { decrement: paymentAmount },
    },
  });
}, { isolationLevel: 'Serializable' });
```

### Balance Check

```javascript
const account = await prisma.creditAccount.findUnique({
  where: { organizationId },
});

const available = Number(account.creditLimit) - Number(account.cachedBalance);

if (orderTotal > available) {
  throw new Error('Insufficient credit');
}
```

### Transaction History

```javascript
const entries = await prisma.creditLedgerEntry.findMany({
  where: { creditAccountId: account.id },
  orderBy: { createdAt: 'desc' },
});
```

### Reconciliation

Since `cachedBalance` is a denormalized cache, a periodic reconciliation job is required:

```javascript
const computed = await prisma.creditLedgerEntry.aggregate({
  where: { creditAccountId: account.id },
  _sum: { amount: true },
});

if (Number(account.cachedBalance) !== Number(computed._sum.amount ?? 0)) {
  // Log discrepancy, alert, update cachedBalance
}
```

---

## 8. Quote Acceptance Flow

This project has a `Quote` model in the CRM module. Quotes convert into Orders. The Stripe/wallet interaction for quote acceptance:

```
1. Sales rep creates Quote (status: draft) → sends to customer (status: sent)
2. Customer reviews quote → accepts (status: accepted)
3. System converts Quote → Order:
   a. Create Order with line items from QuoteItem (price snapshots)
   b. Status: pending_payment
   c. Update Quote: status = 'converted', convertedOrderId = order.id
4. Customer pays via Stripe (checkout session) OR uses credit account
5. Webhook: order status → paid
6. Payment record created
7. If credit account: CreditLedgerEntry inserted (invoice_charge, positive amount)
8. Platform fee deduction (if applicable):
   - CreditLedgerEntry for platform fee (adjustment, positive amount)
9. Booking/InstallationJob created
10. Invoice generated (via background job queue)
```

**Platform fee:** If the platform takes a fee from the transaction, it's recorded as a separate `credit_ledger_entries` row with `entryType: 'adjustment'`.

**Booking:** After payment, an `InstallationJob` record is created linking the order to an installer.

---

## 9. Files

### Files That Exist

| File | Responsibility | When Executed |
|------|---------------|---------------|
| `prisma/schema.prisma` | Database schema definition. Defines Order, Payment, CreditAccount, CreditLedgerEntry, Invoice models with Stripe columns. | Prisma migrations (`npx prisma migrate dev`) |
| `prisma/migrations/0001_initial/migration.sql` | Initial migration creating all tables including Stripe columns. | Deployed migration |
| `app/api/orders/route.js` | Order creation endpoint. Creates order with `status: 'pending_payment'`, snapshot line items, clear cart — all in one `$transaction`. | `POST /api/orders` |
| `app/checkout/page.js` | Checkout page (server component). Verifies auth, fetches cart, passes to client. | Navigate to `/checkout` |
| `components/CheckoutClient.jsx` | Checkout form (client component). Collects shipping address, POSTs to `/api/orders`. Has placeholder for Stripe redirect: `// Redirect to confirmation — Day 6 will replace this with Stripe redirect` | Rendering checkout page |
| `ARCHITECTURE.md` | Master architecture document. Defines the patterns: never call Stripe inside transactions, use $transaction for all multi-table writes, Serializable isolation for financial operations, outbox pattern for external API calls. | Reference during development |
| `DATABASE_SCHEMA.md` | Complete database schema documentation with every column, index, and design decision explained. | Reference during development |
| `package.json` | Dependencies: `stripe@^22.2.3` (server), `@stripe/stripe-js@^9.8.0` (client) | `npm install` |

### Files That Need to Be Created

| File | Responsibility | When Executed |
|------|---------------|---------------|
| `app/api/checkout/route.js` | Creates Stripe Checkout Session for an order. Returns the session URL for client redirect. | `POST /api/checkout` |
| `app/api/webhooks/stripe/route.js` | Receives Stripe webhook events. Verifies signature, processes `checkout.session.completed`. | Stripe POSTs to this endpoint |
| `app/checkout/success/page.js` | Post-payment confirmation page. Shows order details after successful Stripe payment. | Redirected by Stripe after payment |
| `lib/stripe.js` | Stripe SDK singleton. Initializes Stripe with secret key, exports the instance. | Imported by checkout and webhook routes |
| `lib/checkout-service.js` | Business logic for checkout. Creates session, handles credit account validation. | Called by checkout route |
| `lib/webhook-service.js` | Business logic for webhook processing. Idempotency, order updates, payment creation. | Called by webhook route |

---

## 10. Sequence Diagram

```
Client                  Next.js API              Stripe                  Database
  │                         │                      │                        │
  │  POST /api/orders       │                      │                        │
  │  (shipping address)     │                      │                        │
  │────────────────────────>│                      │                        │
  │                         │──── $transaction ──────────────────────────>│
  │                         │  create Order                                │
  │                         │  (pending_payment)                           │
  │                         │  create OrderItems (snapshots)               │
  │                         │  clear Cart                                  │
  │                         │<── commit ─────────────────────────────────│
  │                         │                      │                        │
  │  201 { order }          │                      │                        │
  │<────────────────────────│                      │                        │
  │                         │                      │                        │
  │  POST /api/checkout     │                      │                        │
  │  { orderId }            │                      │                        │
  │────────────────────────>│                      │                        │
  │                         │── stripe.checkout    │                        │
  │                         │   .sessions.create() │                        │
  │                         │─────────────────────>│                        │
  │                         │<── session.url ──────│                        │
  │                         │                      │                        │
  │                         │── UPDATE order       │                        │
  │                         │   stripeSessionId ──────────────────────────>│
  │                         │                      │                        │
  │  200 { url }            │                      │                        │
  │<────────────────────────│                      │                        │
  │                         │                      │                        │
  │  window.location = url  │                      │                        │
  │────────────────────────────────────────────────>│                        │
  │  [Stripe Checkout UI]   │                      │                        │
  │  User pays / cancels    │                      │                        │
  │                         │                      │                        │
  │  [Redirect: success_url │                      │
  │   or cancel_url]        │                      │                        │
  │                         │                      │                        │
  │                         │   POST webhook       │                        │
  │                         │   checkout.session   │                        │
  │                         │   .completed         │                        │
  │                         │<─────────────────────│                        │
  │                         │                      │                        │
  │                         │── constructEvent()   │                        │
  │                         │   verify signature   │                        │
  │                         │                      │                        │
  │                         │── $transaction ─────────────────────────────>│
  │                         │   UPDATE order: paid                         │
  │                         │   INSERT payment (succeeded)                 │
  │                         │   [if credit: INSERT ledger entry]           │
  │                         │<── commit ─────────────────────────────────│
  │                         │                      │                        │
  │                         │   200 { received }    │                        │
  │                         │─────────────────────>│                        │
  │                         │                      │                        │
  │  [Success page loads]   │                      │                        │
  │  Shows order confirmed  │                      │                        │
```

---

## 11. Security

### Why Webhook Verification Exists

Without signature verification, anyone could POST to `/api/webhooks/stripe` with a fake `checkout.session.completed` event and mark their orders as paid. The `stripe-signature` header contains an HMAC signature created with your `STRIPE_WEBHOOK_SECRET` — only Stripe knows this secret, so only Stripe can produce valid signatures.

```javascript
// The verification step:
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
// If signature is invalid, constructEvent throws an error
```

### Why Secret Keys Stay Server-side

- `STRIPE_SECRET_KEY` — can create charges, refund payments, access customer data. **Must never reach the browser.**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — can only tokenize card details. Safe for client-side use.
- `STRIPE_WEBHOOK_SECRET` — verifies webhook authenticity. Server-side only.

All three go in `.env.local` (or platform env vars), never committed to git.

### How Duplicate Payments Are Avoided

1. **Order status guard:** Webhook handler checks if order is already `paid` before processing. If yes, returns 200 immediately.
2. **Database constraint:** Order status transitions are enforced in application logic.
3. **Stripe idempotency:** Stripe's API supports idempotency keys for session creation — same `Idempotency-Key` header, same result.
4. **PaymentIntent idempotency:** Look up by `stripePaymentIntentId` before creating a Payment record.

### Common Security Mistakes

| Mistake | Consequence | Prevention |
|---------|------------|------------|
| Not verifying webhook signatures | Anyone can mark orders as paid | Always use `constructEvent()` |
| Exposing secret key to client | Anyone can issue refunds, access all Stripe data | Only use `NEXT_PUBLIC_` prefix for publishable keys |
| Trusting `success_url` for order fulfillment | Users can bookmark/reshare the URL; orders fulfilled without payment | Always drive fulfillment from webhooks, never from success page visits |
| Processing webhooks without idempotency | Duplicate payments, double ledger entries | Check order status before processing |
| Calling Stripe inside a DB transaction | Connection pool exhaustion if Stripe API is slow | Call Stripe outside the transaction; use outbox pattern for critical flows |
| Using client-side price calculation for the charged amount | Users can manipulate price in browser devtools | Always read prices from the database at order creation time (snapshotted) |

---

## 12. Implementation Checklist

### Phase 1: Foundation

- [ ] Install Stripe SDK: `npm install stripe @stripe/stripe-js`
- [ ] Add environment variables: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Create `lib/stripe.js` — Stripe SDK singleton
- [ ] Create database tables (if not already present via Prisma migration)
- [ ] Add `stripe_checkout_session_id` and `stripe_payment_intent_id` columns to orders table
- [ ] Create `payments` table with Stripe columns
- [ ] Create `credit_accounts` and `credit_ledger_entries` tables (if credit accounts are needed)
- [ ] Add indexes: `idx_orders_stripe_payment_intent_id`, `idx_payments_stripe_payment_intent_id`

### Phase 2: Checkout Session

- [ ] Create `POST /api/checkout` route
- [ ] Validate user is authenticated
- [ ] Look up the order by ID, verify it belongs to the user's organization
- [ ] Verify order status is `pending_payment`
- [ ] Create Stripe Checkout Session with line items from order
- [ ] Set `client_reference_id` to order ID
- [ ] Set metadata: `orderId`, `orderNumber`, `organizationId`
- [ ] Configure `success_url` and `cancel_url`
- [ ] Store `stripeCheckoutSessionId` on the order
- [ ] Return session URL to client
- [ ] Update `CheckoutClient.jsx` to call `/api/checkout` instead of redirecting directly

### Phase 3: Stripe Redirect (Client)

- [ ] After order creation, call `POST /api/checkout` to get session URL
- [ ] Redirect user to Stripe's hosted checkout page
- [ ] Handle cancel: redirect back with `?cancelled=true`, show message
- [ ] Create `/checkout/success` page that reads `session_id` from URL

### Phase 4: Webhook Handler

- [ ] Create `POST /api/webhooks/stripe` route
- [ ] Read raw request body (critical: Next.js may parse JSON; need raw body for signature verification)
- [ ] Verify `stripe-signature` header with `constructEvent()`
- [ ] Handle `checkout.session.completed`:
  - [ ] Extract `metadata.orderId` and PaymentIntent ID
  - [ ] Look up order
  - [ ] Check idempotency (order already paid? → return 200)
  - [ ] Update order status to `paid`
  - [ ] Create Payment record
  - [ ] If credit account: create CreditLedgerEntry, update cachedBalance
- [ ] Handle `checkout.session.expired`: cancel order if still pending
- [ ] Handle `payment_intent.payment_failed`: log failure
- [ ] Return 200 to Stripe (only after successful processing)
- [ ] Register webhook endpoint in Stripe Dashboard
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Phase 5: Credit Accounts (if applicable)

- [ ] Create credit account for each organization (or on admin approval)
- [ ] Implement balance check before allowing credit account orders
- [ ] Implement ledger entry creation on payment
- [ ] Implement cached balance reconciliation job
- [ ] Ensure all ledger operations use `Serializable` isolation

### Phase 6: Post-Payment

- [ ] Create invoice after payment (via background job queue)
- [ ] Send order confirmation email
- [ ] Create InstallationJob for fulfillment
- [ ] Update order status to `processing`

### Phase 7: Polish

- [ ] Add error boundaries on checkout and success pages
- [ ] Add loading states during checkout session creation
- [ ] Handle edge cases: empty cart at checkout, order already paid, session timeout
- [ ] Add rate limiting on checkout and webhook endpoints
- [ ] Add logging/monitoring for failed webhooks

---

## 13. Testing Checklist

### Stripe Test Mode

Use Stripe test keys (`sk_test_...`) and test card numbers:
- **Success:** `4242 4242 4242 4242` (any future expiry, any CVC)
- **Decline:** `4000 0000 0000 0002` (generic decline)
- **3D Secure:** `4000 0000 0000 3220`

### Manual Tests

- [ ] **Successful payment:** Place order → redirect to Stripe → use test card `4242...` → verify redirect to success page → verify order status is `paid` in DB → verify Payment record created → verify webhook logs show 200
- [ ] **Cancelled payment:** Place order → redirect to Stripe → click back/cancel → verify redirect to checkout with `?cancelled=true` → verify order still `pending_payment`
- [ ] **Webhook delivery:** Use Stripe CLI to simulate: `stripe trigger checkout.session.completed` → verify order updated → verify Payment created
- [ ] **Duplicate webhook:** Simulate same event twice → verify only one Payment record → verify order status unchanged on second attempt
- [ ] **Idempotency:** Two checkout sessions for same order → verify second returns existing session instead of creating new
- [ ] **Credit account balance update:** Pay via credit → verify ledger entry created → verify cachedBalance updated → verify SUM(ledger) = cachedBalance
- [ ] **Transaction history:** Query `GET /api/account/payments` → verify payment appears
- [ ] **Card decline:** Use decline card `4000...0002` → verify webhook `payment_intent.payment_failed` → verify order still `pending_payment` → verify failure recorded
- [ ] **Expired session:** Create checkout → wait/expire → verify webhook cancels order
- [ ] **Auth required:** Try `POST /api/checkout` without auth token → verify 401
- [ ] **Wrong organization:** Try to pay another organization's order → verify 403

### Stripe CLI for Local Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.payment_failed
```

---

## 14. Common Pitfalls

### 1. Not reading raw body for webhook signature verification

Next.js App Router may parse the request body as JSON before your route handler runs. Stripe's `constructEvent()` needs the **raw** body bytes, not the parsed JSON.

**Fix:** Use `request.text()` to read the raw body in the webhook route:
```javascript
const rawBody = await request.text();
const event = stripe.webhooks.constructEvent(rawBody, sig, secret);
```

### 2. Calling Stripe inside a Prisma transaction

If `stripe.checkout.sessions.create()` is called inside `prisma.$transaction()`, and the Stripe API is slow (or down), the database transaction holds locks and blocks other requests.

**Fix:** Always call Stripe outside the transaction. Create the order first (committed), then create the Stripe session. If the Stripe call fails, the order sits in `pending_payment` (acceptable — it's not lost).

### 3. Using client-computed prices for Stripe charges

If the checkout amount comes from the client (browser), a user can manipulate it with DevTools and pay $1 for a $10,000 solar panel.

**Fix:** At order creation time (`POST /api/orders`), read product prices from the database and snapshot them into `order_items`. The Stripe checkout session always reads from these snapshotted order items, never from client input.

### 4. Trusting the success page for fulfillment

A user could bookmark the success URL and revisit it, or share it. If your fulfillment logic runs on the success page, you'd fulfill orders without payment.

**Fix:** The only place that updates order status is the webhook handler. The success page is purely informational — it reads and displays, never writes.

### 5. Duplicate webhook processing

Stripe may deliver the same event multiple times. Without idempotency checks, you'd create duplicate Payment records and double-charge credit accounts.

**Fix:** Check if the order is already `paid` before processing. Database constraints and transaction isolation provide additional protection.

### 6. PgBouncer transaction mode vs session mode

Supabase offers two connection pooler ports:
- Port 6543: Transaction mode — breaks Prisma interactive transactions (`$transaction`)
- Port 5432: Session mode — required for `$transaction`

**Fix:** Use port 5432 for `DATABASE_URL`. Use the direct (unpooled) connection for `DIRECT_URL` (migrations only).

### 7. Currency mismatch

Stripe expects amounts in the smallest currency unit (cents for AUD). If you pass `amount: 99.95`, Stripe interprets it as $0.9995, not $99.95.

**Fix:** Always multiply by 100: `unit_amount: Math.round(price * 100)`.

### 8. GST/Tax handling

Stripe can calculate tax automatically, but this project calculates GST server-side and bakes it into the line item prices.

**Fix:** Do NOT enable Stripe Tax if you're calculating tax yourself. The `unit_amount` passed to Stripe should be the **GST-inclusive** price if you want the customer to see the final price. Alternatively, pass GST-exclusive prices and add tax separately — but be consistent.

### 9. Missing indexes on Stripe columns

Without indexes on `stripe_payment_intent_id`, the webhook handler's lookup query does a full table scan on every payment notification.

**Fix:** The schema already has `idx_orders_stripe_payment_intent_id` and `idx_payments_stripe_payment_intent_id`. Keep them.

### 10. Environment variable not prefixed with `NEXT_PUBLIC_`

Next.js only exposes variables prefixed with `NEXT_PUBLIC_` to the browser. If you name it `STRIPE_PUBLISHABLE_KEY` instead of `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, the client-side Stripe redirect will fail.

**Fix:** Always use the `NEXT_PUBLIC_` prefix for the publishable key.

---

## Appendix: Quick Reference

### Stripe SDK Singleton (`lib/stripe.js`)

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-15',
});

export default stripe;
```

### Database Connection Note

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres  # Session mode (port 5432)
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres     # Direct for migrations
```

### Stripe Test Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 9995` | Insufficient funds |

### Order Status Lifecycle

```
pending_payment → paid → processing → shipped → delivered
                 ↓                       ↓
              cancelled               refunded
```

### Payment Status Lifecycle

```
pending → succeeded
        → failed
        → refunded
        → partially_refunded
```
