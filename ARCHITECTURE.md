# NexonEcom Platform Architecture

**Status:** Target architecture for MongoDB/Mongoose → Supabase PostgreSQL/Prisma migration
**Scope:** B2B solar hardware ecommerce, expanding into CRM, sales pipeline, quotes, inventory, warehouses, installers, payments, invoices, credit accounts, reporting, and an admin panel.
**Audience:** Engineering team. This is a decision record, not a tutorial — no implementation code is included by design.

This document reflects the actual current domain (read from the existing Mongoose models: B2B `User` accounts with ABN/company/GST fields, solar-specific `Product` attributes, Stripe-backed `Order`, `Cart`, `Favourite`, `Category`, `Brand`) and extends it forward to the roadmap above. Where the current system has a real gap (e.g. no refresh-token revocation, in-memory rate limiting, no audit trail), this document calls it out explicitly and fixes it in the target design rather than carrying the gap forward.

---

## 1. Overall System Architecture

**Decision: modular monolith, not microservices.**

At this team size and this stage of the business, microservices would add deployment/operational overhead (service discovery, distributed tracing, network-call failure modes, data consistency across service boundaries) that isn't earned yet. A modular monolith gives the same internal boundaries — enforced by folder structure and import rules, not network calls — with none of that tax. It can be decomposed into services later, one module at a time, if a specific module (e.g. reporting, or a future public partner API) genuinely needs independent scaling or a different deployment cadence.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Next.js App Router (SSR/ISR pages) + React client components │
└───────────────────────────┬───────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼───────────────────────────────────┐
│                Next.js Route Handlers (app/api)                │
│        Thin HTTP layer — auth check, parse, delegate            │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                  Domain Service Layer (/server)                 │
│  Identity · Catalog · Commerce · CRM · Inventory · Billing       │
│           (each module: service → repository → Prisma)          │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Prisma Client (typed data access)             │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│         Supabase Postgres (pooled connection via PgBouncer)      │
└─────────────────────────────────────────────────────────────────┘

Cross-cutting, outside the request/response path:
  - Background job queue (async email, PDF invoices, stock sync, webhooks)
  - Redis/Upstash (cache + rate limiting + session/refresh-token store)
  - Object storage (Supabase Storage) for product images, datasheets, invoice PDFs
  - Centralized structured logging + audit log sink
```

**Why Supabase specifically, and what we use from it vs. what we don't:**
- **Use:** managed Postgres, connection pooler (PgBouncer), Storage (for datasheets/images/invoice PDFs), point-in-time recovery/backups, and optionally Realtime later (e.g. live order status in the admin panel).
- **Do not use:** Supabase Auth (`auth.users`). Reasoning is in §5 — a B2B platform with company accounts, credit terms, and a future CRM needs a first-class `Organization` entity and full schema control that Supabase Auth's managed user table doesn't cleanly give us. We keep Postgres as "just a database" and own auth ourselves via Prisma, exactly as the current custom JWT system already does — we're upgrading it, not replacing its philosophy.
- Postgres Row-Level Security (RLS) is still enabled on every table as defense-in-depth (§6), even though the primary access path is the trusted Next.js server using a service-role connection.

---

## 2. Backend Architecture

**Layering, strictly enforced by folder boundaries (see §4):**

1. **Route Handlers** (`app/api/**/route.js`) — HTTP concerns only: parse request, verify auth/session, call one service method, map the result/error to an HTTP response. No Prisma imports here, no business logic.
2. **Services** (`server/modules/*/services/*.js`) — business logic, orchestration, transaction boundaries. This is where "can this user place this order," "does this email already belong to an organization," "recompute cart total" live.
3. **Repositories** (`server/modules/*/repositories/*.js`) — the only layer allowed to import the Prisma client. Encapsulates queries; services never write raw Prisma calls inline.
4. **Prisma Client / Postgres** — data persistence.

Dependency direction is one-way: routes → services → repositories → Prisma. A repository never calls a service; a service never imports another module's repository directly — it calls the other module's service (see §4 module boundary rule). This is what keeps "modular" in "modular monolith" real instead of aspirational.

**Background/async work:** anything that (a) calls an external API (Stripe, email provider), (b) is slow (PDF generation), or (c) must survive a request timeout, does not run inline in a route handler. Recommend **pg-boss** (a Postgres-native job queue — no new infrastructure, transactionally enqueue jobs in the same transaction as the triggering write) for v1; revisit Inngest/Trigger.dev only if job volume or fan-out complexity outgrows it.

**Module list (v1 — Identity, Catalog, Commerce) and roadmap modules (CRM, Inventory, Billing):** see §16 for the domain modeling detail. Each module owns its own tables, services, and repositories; it never reaches into another module's tables directly.

---

## 3. Database Architecture

**Single Supabase Postgres database, split into Postgres schemas by bounded context** (not separate databases — we want cross-module joins and one transaction boundary; but logical separation matters as the CRM/inventory/billing modules land):

- `identity` — Organization, User, OrganizationMember, Session (refresh tokens), Role/Permission
- `catalog` — Category, Brand, Product, ProductImage
- `commerce` — Cart, CartItem, Order, OrderItem, Address, Favourite
- `crm` — Contact, Lead, Opportunity, Quote, QuoteItem, Activity, Note (future)
- `inventory` — Warehouse, StockLocation, StockMovement, Installer (future)
- `billing` — Payment, Invoice, CreditAccount, CreditLedgerEntry (future)
- `audit` — AuditLog (append-only, all modules write to it)

Prisma's `multiSchema` preview feature maps each model to its Postgres schema (`@@schema("catalog")` etc.) while still allowing FK relations and joins across schemas — we get logical separation without operational overhead of multiple databases/connection pools.

### 3.1 Core entities carried over from the current system (Mongo → Postgres mapping)

| Current Mongoose model | Target Postgres/Prisma model(s) | Key change |
|---|---|---|
| `User` (fullName, email, password, abn, companyName, tradingName, businessAddress, gst, phone, role, hearAboutUs, installations) | `Organization` (abn, companyName, tradingName, businessAddress, gst, hearAboutUs, installations) + `User` (fullName, email, password, phone) + `OrganizationMember` (userId, organizationId, role) | **Company split from person.** This is the single most important schema change — see rationale below. |
| `Category` | `Category` | direct port |
| `Brand` | `Brand` | direct port |
| `Product` (+ solar fields: wattage, cellType, technology, frameColor, cellNumber, manufacturer, efficiency, warranty, datasheet) | `Product` (all fields carried over 1:1), `ProductImage` (Product.images array → own table for ordering/alt-text/future per-image metadata) | array → child table |
| `Cart` / embedded `items[]` | `Cart`, `CartItem` | embedded array → child table (Postgres has no native embedded-array-of-objects with FK integrity; this is the correct relational shape) |
| `Order` / embedded `items[]` + `shippingAddress` | `Order`, `OrderItem` (name/price snapshot preserved — this pattern was already correct in Mongo, keep it exactly), `Address` | embedded → child table; snapshot-at-time-of-order pattern retained |
| `Favourite` (user → products[]) | `Favourite` (organizationId or userId, productId) — join table | embedded array → join table |

**Why split `User` into `Organization` + `User` + `OrganizationMember` now, even though today it's one person per account:** every future roadmap item (CRM, sales pipeline, credit accounts, quotes, invoices) is fundamentally *company*-centric in B2B, not person-centric. A credit account belongs to a company, not to whichever employee happened to register. A sales rep is assigned to a company's account, not to one login. If we ship the migration with `User` still conflating person+company, every one of those future features has to retrofit a company concept onto a person table — expensive and error-prone. Doing the split now, while there's exactly one user per company, costs almost nothing (the migration script creates one `Organization` + one `User` + one `OrganizationMember` row per existing Mongo `User` document) and unblocks every roadmap item cleanly.

### 3.2 Primary keys

**Decision: UUIDv7 (time-ordered UUIDs) as primary keys**, generated at the database via `pg_uuidv7` extension (or application-layer generation if the extension isn't available on the Supabase plan in use — fall back to ULID stored in a `uuid`-typed column).

Reasoning: random UUIDv4 (Mongo's `ObjectId` equivalent mindset) causes B-tree index fragmentation and poor insert locality at scale because new rows scatter randomly across the index rather than appending. UUIDv7 encodes a timestamp in the high bits, so IDs sort roughly chronologically — index-friendly like an auto-increment integer, but still globally unique and unguessable-enough for public-facing IDs (order numbers, invoice numbers) without leaking sequence/volume information the way a plain serial integer would (competitors shouldn't be able to infer "how many orders has this platform processed" from an order ID).

### 3.3 Timestamps and soft delete columns (standard on every table)

`created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (maintained via trigger, not application code — see §12), `deleted_at timestamptz null` (only on soft-deletable entities, §12).

---

## 4. Folder Structure

```
/app                              # Next.js App Router — HTTP + UI only
  /(marketing)/...
  /(shop)/products, /category, /brands
  /(account)/account, /login, /signup, /checkout
  /api
    /v1
      /auth/{login,register,logout,refresh,me}
      /organizations
      /products
      /categories
      /brands
      /cart
      /orders
      /favourites
      /crm/...          (added when CRM ships)
      /admin/...        (admin panel endpoints, separately authorized)

/server                           # framework-agnostic backend domain code
  /modules
    /identity
      /services/{authService.js, userService.js, organizationService.js}
      /repositories/{userRepository.js, organizationRepository.js, sessionRepository.js}
      /validators/{authSchemas.js}
      /types.js                 (JSDoc typedefs — see §20, no TS)
    /catalog
      /services/{productService.js, categoryService.js, brandService.js}
      /repositories/...
      /validators/...
    /commerce
      /services/{cartService.js, orderService.js, checkoutService.js}
      /repositories/...
      /validators/...
    /crm            (future — leads, opportunities, quotes, activities)
    /inventory       (future — warehouses, stock, installers)
    /billing         (future — payments, invoices, credit accounts)
  /shared
    /errors/{AppError.js, errorTypes.js}
    /http/{withErrorHandling.js, respond.js}   # route-handler wrapper + response envelope
    /logger/{logger.js}
    /audit/{auditLogger.js}
    /middleware/{withAuth.js, withRateLimit.js, withOrgScope.js}
    /jobs/{queue.js}            # pg-boss setup + job registration
    /cache/{redisClient.js}

/prisma
  schema.prisma                 # organized by @@schema per bounded context
  /migrations
  /seed

/lib                             # infra singletons: prisma client, redis client, storage client, email client
/components                      # React UI components (unchanged)
/store                            # Redux (unchanged)
/tests
  /unit          (services, pure logic)
  /integration   (route handlers against a real test DB via Prisma)
```

**Boundary rule enforced in code review (and ideally via an ESLint import-restriction rule):** a module's `services/` may import another module's `services/` (the public API of that module), but never another module's `repositories/`. This is the one rule that keeps the monolith "modular" rather than a ball of mud, and it's what makes a future extraction (e.g. pulling Billing out into its own service) a mechanical exercise instead of an archaeology project.

---

## 5. Authentication Strategy

**Decision: keep the existing custom JWT + httpOnly-cookie model — it's the right shape — but close its production gaps.**

Current system (`lib/auth.js`, `middleware.js`, `app/api/auth/*`): bcrypt-hashed passwords, a single JWT signed with `JWT_SECRET`, 7-day httpOnly cookie, verified in middleware via `jose`. This is fundamentally sound. The gaps for a production, multi-million-dollar system:

1. **No revocation.** A single long-lived JWT (7 days) can't be invalidated before it expires — if a laptop is stolen or an employee is terminated, their session is live for up to a week with no way to kill it. **Fix:** short-lived access token (10–15 min, JWT, stateless, verified at the edge exactly as today) + a long-lived refresh token that is *opaque* (random, not a JWT) and stored **hashed** in an `identity.sessions` table. Refresh endpoint checks the hash against the DB — this is what makes revocation possible ("delete this session row" = "log this device out now"), and what makes "log out everywhere" a real, implementable feature.
2. **Refresh token rotation with reuse detection.** Every refresh issues a new refresh token and invalidates the old one. If an already-used (rotated-out) refresh token is presented again, treat it as a stolen-token signal and revoke the entire session family — standard practice for detecting token theft.
3. **Password hashing:** bcrypt cost 10 → 12 as a floor. Argon2id is the current best-practice algorithm, but it requires the Node.js runtime (not Edge) — fine, since password hashing only ever happens in the login/register route handlers, which already run on Node, not in middleware. Recommend Argon2id for the new system; bcrypt-12 is an acceptable fallback if the hosting environment makes Argon2id native bindings inconvenient.
4. **Email verification** — required before an account can place an order (not required to browse). Currently absent entirely.
5. **Password reset** — currently a static "coming soon" stub. Needs a real token-based flow (single-use, short-lived, hashed-at-rest reset token, invalidate all sessions on successful reset).
6. **MFA** — not needed for v1 customer accounts, but flag as a requirement for **admin, finance/credit-manager, and any role that can touch credit accounts or payments** once the admin panel and billing module exist (§14).

**Session/cookie mechanics stay the same shape as today:** httpOnly, `secure` in production, `sameSite=lax`, scoped `path=/`. The access token cookie now carries a 10–15 min `maxAge`; a separate refresh cookie (also httpOnly) carries the longer-lived opaque token.

---

## 6. Authorization Strategy

**v1: Role-Based Access Control (RBAC).** Roles live on `OrganizationMember` (role is "this person's role within this organization," not a global user attribute — a person could in principle belong to more than one organization later, e.g. an installer who also has a customer account).

**Roadmap: RBAC → policy-based authorization.** As CRM/sales/warehouse/finance roles multiply (`sales_rep`, `credit_manager`, `warehouse_staff`, `installer`, `admin`), scattering `if (user.role === 'admin')` checks through route handlers stops scaling and becomes an audit nightmare. Introduce a single central authorization function per module — `canManageCredit(actor, organization)`, `canViewQuote(actor, quote)` — that all routes call, so "who can do X" is answered in exactly one place per action, not re-derived at every call site.

**Organization scoping is mandatory and centralized:** almost every resource (orders, quotes, invoices, credit accounts, carts) belongs to an `Organization`. The `organizationId` used for a query must always come from the authenticated session (`withOrgScope` middleware resolves it once), **never** from a client-supplied request parameter — this is the single most important authorization rule in a multi-tenant-shaped B2B system, and the most common place such systems get breached (IDOR: user A requests `/api/orders/123` where 123 belongs to organization B).

**Row-Level Security (RLS) as defense-in-depth:** enable RLS on every table, with policies scoping rows to `organization_id = current_setting('app.current_org_id')`. The Next.js server is the trusted path (application-layer authorization above is the real gate), but RLS means that if any future surface — an admin dashboard querying Supabase directly, a reporting tool, a bug that skips the app-layer check — still can't cross an organization boundary. Defense-in-depth, not the primary mechanism.

---

## 7. Database Naming Conventions

- **Tables:** snake_case, plural — `organizations`, `order_items`, `credit_ledger_entries`.
- **Columns:** snake_case — `created_at`, `organization_id`. Prisma models stay camelCase/PascalCase in application code via `@map`/`@@map`, so JS code never sees snake_case.
- **Primary key column:** always `id`.
- **Foreign keys:** `<singular_referenced_table>_id` — `organization_id`, `product_id`, never just `org` or `product`.
- **Booleans:** `is_` / `has_` prefix — `is_active`, `is_featured`, `has_gst`.
- **Timestamps:** `created_at`, `updated_at`, `deleted_at` — always `timestamptz`, never bare `timestamp`.
- **Enums:** Prisma enum type PascalCase (`OrderStatus`), underlying Postgres enum type snake_case with a `_enum` suffix (`order_status_enum`) so it's unambiguous in `\dT` / migration SQL that it's a type, not a table.
- **Junction/join tables:** `<a>_<b>` alphabetical-ish by convention, singular table names joined — `organization_members`, `product_categories` (if ever many-to-many).
- **Indexes:** explicit names, `idx_<table>_<column(s)>` — e.g. `idx_orders_organization_id_created_at`. Never rely on Prisma's autogenerated index names in a table you expect to hand-tune later.
- **Constraints:** explicit names too — `chk_products_price_nonnegative`, `uq_users_email_active` (the partial unique index from §12).

---

## 8. API Design Standards

- **Versioned from day one:** `/api/v1/...`. The current unversioned `/api/auth/*` etc. gets a `v1` prefix in the rebuild — cheap now, expensive to retrofit once an admin panel, a future mobile app, or partner integrations depend on the current shape.
- **Resource-based, plural nouns, shallow nesting:** `/api/v1/organizations/:id/orders`, not `/api/v1/organizations/:id/orders/:orderId/items/:itemId/detail` — one level of nesting max; deeper relationships are fetched by their own top-level resource with a filter (`/api/v1/order-items?orderId=...`) if ever needed server-side at all (usually the parent resource just includes its children).
- **Standard response envelope**, consistent across every endpoint (today's code mixes `{ user }`, `{ error }`, `{ success: true }` shapes ad hoc):
  - Success: `{ "data": <resource or array>, "meta": { ...pagination etc. } }`
  - Error: `{ "error": { "code": "INVALID_EMAIL", "message": "Invalid email address" } }`
- **Pagination: cursor/keyset-based**, not offset-based, for any list endpoint that can grow unbounded (products, orders, audit log). Offset pagination (`?page=3`) degrades badly past tens of thousands of rows and is unstable under concurrent writes (rows shift between pages). Keyset pagination on `(created_at, id)` is stable and stays fast regardless of table size.
- **Filtering/sorting:** consistent query param shape — `?filter[status]=paid&sort=-created_at`.
- **Idempotency keys required on financial mutation endpoints** (`POST /orders`, `POST /payments`): client supplies an `Idempotency-Key` header; the server stores it against the resulting resource and returns the original result on retry instead of creating a duplicate. This is non-negotiable once real payments exist — network retries must never double-charge or double-create an order.
- **HTTP status codes used precisely** and consistently: 400 validation, 401 unauthenticated, 403 unauthorized (authenticated but not allowed), 404 not found, 409 conflict (duplicate email, stock conflict), 422 semantically invalid, 429 rate-limited, 500 unexpected.

---

## 9. Error Handling Standards

- **A typed error hierarchy**, not ad hoc `Response.json({error: '...'}, {status: n})` scattered per route: `AppError` base class carrying `httpStatus` and a stable `code`, with subclasses — `ValidationError` (400), `UnauthenticatedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitedError` (429).
- **One central `withErrorHandling` wrapper** around every route handler: catches thrown errors, maps known `AppError` subclasses to their status/body, logs and returns a generic 500 for anything unrecognized. This replaces the current pattern of a hand-written try/catch with a duplicated generic-500 fallback in every single route file — same safety, a fraction of the repetition, and it guarantees no route can accidentally forget the fallback.
- **Never leak internals to the client** in production: no stack traces, no raw DB driver error messages, no "column violates constraint xyz" text. Full detail goes to the server log (§10) keyed by a request/correlation ID; the client response includes that same ID so a support agent or the user can reference it without exposing internals.
- **Validation errors are structured, not a single string**, where the caller is a form (register/checkout): `{ error: { code: "VALIDATION_ERROR", fields: { email: "Invalid email address", password: "Must be at least 8 characters" } } }` — lets the UI highlight the specific field instead of a single top-of-form banner for multi-field forms like registration/checkout.

---

## 10. Logging Strategy

- **Structured JSON logs** via `pino` (fast, works in serverless/edge-adjacent Node runtimes, first-class in the Next.js ecosystem) — never bare `console.log` in production code paths.
- **Levels:** `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Production default `info`; `debug`/`trace` enabled per-request via a header or short-lived flag when actively investigating an incident, not left on globally (log volume/cost).
- **Every request gets a correlation/request ID** (generated at the edge/middleware layer if not supplied by an upstream proxy), propagated through every service/repository call and included in every log line and every error response for that request — this is what makes "find everything that happened for this one failed checkout" possible without grepping timestamps.
- **No PII or secrets in logs, ever:** redact password fields, tokens, cookies, and (once Billing exists) any payment/card data at the logger's serialization layer, not by developer discipline at each call site — a redaction list configured once on the logger instance.
- **Ship logs off the compute instance** to a centralized sink (Vercel log drains → Axiom/Better Stack/Datadog — pick one during infra setup) so logs survive instance recycling and are searchable/alertable, rather than only living in ephemeral serverless function logs.

---

## 11. Audit Logging Strategy

Distinct from application logs (§10): audit logs answer "who changed what, from what value, to what value, when" for compliance, dispute resolution, and internal investigation — not for debugging.

- **`audit.audit_log` table**, append-only: `id, actor_id, actor_type (user | system | api_key), action, entity_type, entity_id, organization_id, before jsonb, after jsonb, ip_address, user_agent, created_at`.
- **Append-only is enforced at the database level**, not just by convention: a Postgres `REVOKE UPDATE, DELETE` on the table for the application's runtime role (only `INSERT` and `SELECT` granted). An audit log that can be edited by the same actors it's auditing isn't an audit log.
- **Auto-capture via a Prisma Client Extension**, not developer memory: intercept writes on a designated list of sensitive models (`Organization`, `User`, `Order`, `CreditAccount`, `CreditLedgerEntry`, `Product.price`, `Invoice`, and any future `Quote`) and write the audit row as part of the same transaction as the business write, so an audit entry can never be silently skipped because someone forgot to call a logging function.
- **Retention:** indefinite for anything touching money (orders, invoices, payments, credit ledger) — these are financial records. Given the ABN/GST fields already present in the domain, this is presumably an Australian business; ATO recordkeeping requirements are typically 5 years minimum — confirm the exact figure with the business/finance stakeholder before finalizing a retention/deletion policy, but default to "keep, don't auto-purge" until that's confirmed.

---

## 12. Soft Delete Strategy

- **Soft-deletable entities:** `Organization`, `User`, `Product`, `Category`, `Brand`, `Contact`, `Warehouse` — anything that might be referenced by historical records (an order referencing a since-discontinued product must still render correctly) or might need an "undo".
- **Never delete (hard or soft) financial records:** `Order`, `OrderItem`, `Invoice`, `Payment`, `CreditLedgerEntry` are append-only by nature. "Cancelling" an order is a `status` transition, not a delete of any kind — the record must exist forever for accounting/audit purposes.
- **Mechanism:** `deleted_at timestamptz null` column. Centralize the behavior with a **Prisma Client Extension** so individual query sites can't get it wrong: reads automatically filter `WHERE deleted_at IS NULL` unless a query explicitly opts into including deleted rows (admin "restore" screens), and `.delete()` calls on soft-deletable models are intercepted and rewritten to `UPDATE ... SET deleted_at = now()`.
- **Unique constraints must be partial indexes that respect soft delete:** `CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE deleted_at IS NULL` — otherwise a "deleted" user permanently blocks that email from ever being used again, which is both wrong and a support headache.
- **Cascading soft-delete is a business decision per entity, not automatic:** e.g. soft-deleting a `Category` should probably not soft-delete every `Product` in it. Each such cascade needs an explicit product decision, documented at the point it's built, not inferred from the ORM.

---

## 13. Transactions Strategy

- **Use Prisma's `$transaction` (interactive transactions) for every multi-table write that must be atomic:** order placement (create order + order items + decrement stock + clear cart), registration (create organization + user + membership), any credit account movement (ledger entry insert + balance recompute).
- **Concurrency control on stock:** two simultaneous orders for the last unit of a product is a real race. Use either row locking (`SELECT ... FOR UPDATE` on the product row inside the transaction before decrementing stock) or optimistic concurrency (a `version` column, `UPDATE ... WHERE id = ? AND version = ?`, retry on conflict). Recommend row locking for stock (simpler to reason about, and stock-touching transactions are short) and optimistic concurrency for less contended, longer-lived aggregates if any emerge later.
- **Financial ledger operations (credit accounts) use `Serializable` isolation** — the strictest level — because a running balance derived from a ledger is exactly the kind of computation that's vulnerable to subtle races under weaker isolation levels (`ReadCommitted`, Postgres's default, allows two concurrent transactions to each read the same "current balance" and both apply their delta against the stale value). Serializable trades a small amount of throughput for correctness guarantees that matter a great deal more for money than for, say, updating a product's view count.
- **Never call an external API inside a database transaction.** Stripe calls, email sends, and PDF generation do not belong inside a `$transaction` block — if the external call hangs, the DB transaction (and any row locks it holds) hangs with it. Pattern: commit the DB transaction first (e.g. order created with status `pending_payment`), then trigger external side effects via the job queue (§2) outside the transaction. For flows where "the DB write and the external call must not disagree" (e.g. "order was created but payment webhook never arrived"), use an **outbox pattern**: write an `outbox_events` row in the same transaction as the business write, and a separate worker reads and dispatches outbox rows — guarantees the event is never lost even if the process crashes right after commit.

---

## 14. Security Recommendations

- **Rate limiting on all mutating endpoints, not just auth.** The current in-memory `Map`-based limiter (documented as known tech debt in `lib/rateLimit.js`) is fine for a single instance but doesn't survive multiple serverless instances or a restart. Once traffic justifies horizontal scale, move the same interface to **Redis/Upstash** (a sliding-window or token-bucket counter keyed by IP + route) — same call sites, different backing store; the current code was intentionally written so this swap is localized to one file.
- **Schema validation at every boundary** using a runtime validator (Zod works fine in plain JavaScript, no TypeScript required) — one schema per endpoint, shared between "does this look like a valid request" and (where useful) generating the structured validation error response from §9.
- **No raw/unparameterized SQL.** Prisma parameterizes by default; explicitly forbid `$queryRawUnsafe`/string-interpolated `$queryRaw` in code review — if raw SQL is ever truly necessary (a reporting query Prisma's query builder can't express), it must use `$queryRaw` tagged templates (parameterized), never string concatenation.
- **Secrets management:** DB URL, JWT signing secret, Stripe keys live in the hosting platform's encrypted environment variables, never in a committed file. (Flagging directly: the current `.env.example` in this repo contains what look like real Mongo Atlas credentials and a real JWT secret rather than placeholders — rotate both before or during the migration, and make sure the new `.env.example` ships with placeholder values only.)
- **Least-privilege database roles:** the runtime Prisma connection uses a Postgres role that can `SELECT/INSERT/UPDATE/DELETE` on application tables but cannot `DROP`/`ALTER`, cannot touch `audit.audit_log` beyond `INSERT`/`SELECT` (§11), and is a different role from the one migrations run as.
- **CORS locked to known origins**; no wildcard `*` on any endpoint that accepts credentials.
- **CSRF:** cookie-based auth with `sameSite=lax` mitigates most cross-site CSRF already (no cookie sent on cross-site `POST`/state-changing requests under `lax`). For the highest-value actions once they exist — placing an order, moving money in a credit account, changing payment methods — add an explicit double-submit CSRF token as a second layer; the cost of implementing it is trivial next to the cost of a forged financial transaction.
- **PCI scope stays minimal:** never store raw card data. Continue the existing pattern of Stripe-hosted checkout/tokenization (already reflected in the current `Order` model's `stripeSessionId`/`stripePaymentIntentId` fields) — the platform should never see a card number, keeping it out of PCI-DSS scope almost entirely.
- **Dependency hygiene:** `npm audit` and Dependabot (or equivalent) wired into CI; a security-relevant dependency bump shouldn't wait for the next unrelated PR.

---

## 15. Scalability Recommendations

- **Stateless application tier** (already true — Next.js on serverless/Vercel-style infrastructure) with the one current exception being the in-memory rate limiter (§14) — every other piece of request-handling state must be externalized (Redis, Postgres) before scaling past one instance matters in practice.
- **Connection pooling is mandatory, not optional**, with Postgres + serverless: Postgres has a hard cap on concurrent connections, and a burst of serverless function invocations can each open their own connection and exhaust it in minutes. Use Supabase's pooled connection string (PgBouncer, transaction mode) for all runtime traffic; use the direct (unpooled) connection string only for migrations, which need session-level features PgBouncer's transaction mode doesn't support.
- **Read replicas** for reporting/analytics once the Reporting module (§16 area) exists, so a heavy monthly sales report doesn't contend with live checkout traffic on the primary.
- **Background work scales independently of the web tier** via the job queue (§2/§13) — a spike in orders shouldn't be gated by how fast invoice PDFs can be generated inline.
- **Large append-only tables get partitioned by time once they earn it** (`audit_log`, and eventually `stock_movements`) — monthly or quarterly range partitions on `created_at` keep individual indexes small and keep `VACUUM` fast, deferred until volume actually warrants it (no need to partition a table with ten thousand rows).

---

## 16. Future CRM Considerations

The single highest-leverage decision for everything in this section is already made in §3: **Organization is the anchor entity**, not User. Every CRM concept below hangs off `Organization` (or a `Contact`/`Lead` that later converts into one), which is exactly how B2B sales actually works — you sell to a company, multiple people at that company are involved, and the relationship outlives any one person's login.

- **`Contact` is distinct from `User`.** Not every person a sales rep talks to has portal login access — a purchasing manager who only ever emails a rep is a `Contact`, not a `User`. A `Contact` can later be "promoted" to a `User` (given portal access) without re-keying data, by linking rather than duplicating.
- **Pipeline as a linear state machine:** `Lead` → `Opportunity`/`Deal` → `Quote` → `Order`, each stage carrying a reference back to the `Organization`/`Contact` and an `owner_id` (the assigned sales rep) for pipeline reporting ("show me my open deals," "show me deals stuck in `Quote` stage for 30+ days").
- **Quotes need versioning and an expiry**, and must convert into an `Order` using the exact same **price/name snapshot pattern** the current `Order`/`OrderItem` model already gets right (never trust a live product price for a historical record — a quote is a promise of a price for a window of time, and an order created from it must freeze that price at conversion, not re-read the live catalog).
- **`Activity`/`Task`/`Note` as a polymorphic timeline** (`entity_type` + `entity_id`, e.g. `("organization", org_id)` or `("opportunity", deal_id)`) — this is the backbone of a CRM's activity feed, and building it once, generically, avoids a bespoke "notes" table per entity type later.
- **Credit accounts are ledgers, not mutable balances.** A `CreditAccount.balance` column that gets directly incremented/decremented is both an audit and a correctness liability (see §13's Serializable isolation note). Model it as `CreditLedgerEntry` rows (append-only debits/credits); the balance is always *derived* (`SUM(entries)`), never stored as ground truth (a cached/denormalized balance column for fast reads is fine, but the ledger is the source of truth it's derived from, recomputable at any time).
- **Reporting** (explicitly in the roadmap) will want a read-optimized shape eventually — materialized views or a read replica (§15) rather than ad hoc heavy aggregation queries against the live OLTP tables once dashboards exist.

---

## 17. Performance Recommendations

- **No N+1 queries:** Prisma's `include`/`select` must be used deliberately for any list endpoint that renders related data (a product list showing brand/category names is one query with a join, not one query per product). Flag any loop that calls a repository method per iteration in code review.
- **Select only needed columns** on list endpoints — a product listing page doesn't need `description`/`datasheet` for every row; fetch those only on the detail page.
- **Pagination happens in the database**, never "fetch everything, `.slice()` in JS" — ties to the keyset pagination standard in §8.
- **Cache expensive, low-volatility reads** (category tree, brand list, homepage featured products) — ties to §19; these are read constantly and change rarely, the textbook cache case.
- **`EXPLAIN ANALYZE` before merging any new query against a table expected to exceed roughly 100k rows** — cheap insurance against a query that works fine in dev against seed data and falls over in production against real catalog/order volume.

---

## 18. Indexing Recommendations

- **Every foreign key column gets an explicit index.** This is a common and expensive surprise for teams moving from MongoDB (where a reference is just a value, no auto-indexing either, but the mental model of "collections" doesn't prompt the same assumption) to Postgres: **Postgres does not automatically index foreign key columns** the way it indexes the primary key. Every `*_id` column used in a join or a `WHERE` clause needs its own index, added deliberately, not assumed.
- **Composite indexes matched to real query shapes:** `(organization_id, created_at)` on `orders` for "this company's recent orders," `(category_id, is_active)` on `products` for category browse pages, rather than single-column indexes that don't match how the data is actually queried together.
- **Partial indexes for soft-deleted tables:** `WHERE deleted_at IS NULL` on the indexes that back the common "active records only" query path, and the unique-constraint variant from §12 for uniqueness-among-active-rows.
- **Full-text search migration path:** the current Mongo `text` index on `Product.name`/`description` becomes a generated `tsvector` column with a GIN index in Postgres for v1 (native, no new infrastructure). Once the catalog grows into the thousands of SKUs and faceted/typo-tolerant search starts to matter for conversion, revisit a dedicated search service (Algolia, Meilisearch, or Typesense) — flagged now as a known future migration, not built prematurely.
- **Don't over-index write-heavy, append-only tables** (`audit_log`, future `stock_movements`) — every index is a write-time cost; index only the columns reporting actually queries on those tables, not everything that might someday be useful.

---

## 19. Caching Recommendations

- **Layered, by volatility:**
  1. **Edge/CDN + Next.js ISR** for public, mostly-static catalog pages (product/category/brand pages) — these are read by anyone, unauthenticated, and change infrequently; this is the cheapest and highest-leverage cache layer.
  2. **Application cache (Redis/Upstash)** for computed, moderately dynamic data — category tree, homepage featured products, brand list — with a real invalidation strategy (below), not TTL-only.
  3. **No caching on the transactional path, ever.** Cart contents, checkout pricing, and live stock must always read the current database state. Caching a stale price or stale stock count at the exact moment a customer is buying is the one caching mistake that directly costs money and trust — the rule is simple and absolute: browse can be cached, checkout cannot.
- **Invalidation is entity-keyed, not TTL-only:** updating a `Product` busts `product:{id}` and any list/collection cache keys it participates in (its category page, "featured" list if applicable) at write time, in the same service call that performs the update — not "wait five minutes for the TTL," which guarantees a window of visibly wrong prices/stock on every price change.
- **Consolidate infrastructure:** once Redis/Upstash is introduced for caching, the rate limiter (§14) and the refresh-token/session store (§5) belong on the same instance rather than each reaching for a different piece of infrastructure — one operational dependency to run and monitor, not three.

---

## 20. Coding Standards

- **JavaScript only, no TypeScript** — consistent with the existing codebase. Use JSDoc typedef comments in `/server/modules/*/types.js` where a shape genuinely needs documenting for other engineers, not as a blanket practice.
- **Services are HTTP-agnostic:** a service function never sees `req`/`res`/`NextRequest` — it receives plain arguments and returns plain data or throws an `AppError` subclass (§9). This is what makes services independently testable without spinning up an HTTP server, and portable if a module is ever extracted into its own service.
- **No business logic in route handlers beyond**: parse input → call one service method → map result/error to response. If a route handler has an `if` statement encoding a business rule, that rule belongs in the service layer instead.
- **No business logic in the Prisma schema** beyond structural constraints (types, required-ness, foreign keys, check constraints, uniqueness) — `schema.prisma` describes shape and invariants, not workflow.
- **Naming:** files kebab-case (`order-service.js`), exported functions/variables camelCase, Prisma models PascalCase singular (`Organization`, not `Organizations` — Prisma's convention, and it reads correctly as `prisma.organization.findMany()`).
- **Module boundary rule from §4 is enforced in review** (and ideally by an ESLint `no-restricted-imports` rule keyed to folder paths): a module may import another module's `services/`, never its `repositories/` or Prisma models directly.
- **Comment philosophy:** no comments explaining *what* code does — names should already do that. A comment is only warranted for a non-obvious *why* (a workaround, a subtle invariant, a regulatory constraint) — e.g. the existing `// price: snapshot — never trust live product.price for historical orders` comment in the current `Order` model is exactly the right kind of comment to keep and to replicate for the equivalent `Quote`/`Invoice` snapshot fields later.
- **Every schema change ships with its migration file committed in the same PR** — no drift between `schema.prisma` and the actual database. CI runs `prisma migrate diff` (or equivalent) against the target database to catch any undeclared drift before merge, not after a production incident reveals it.
- **Formatting/linting is automated, not reviewed by eye:** Prettier + ESLint run in a pre-commit hook and in CI; style is never a human code-review discussion.

---

## Summary of the most consequential decisions in this document

1. **Split `User` into `Organization` + `User` + `OrganizationMember` now**, before CRM/credit/quotes are built — this is the one change that, if deferred, becomes expensive to retrofit later.
2. **Keep custom JWT auth, don't adopt Supabase Auth** — add refresh-token rotation + revocation, which the current single-JWT model structurally cannot support.
3. **Modular monolith with hard-enforced module boundaries** (services-only cross-module imports) — gets microservice-grade separation of concerns without microservice operational cost, and stays decomposable later.
4. **Ledgers, not mutable balances, for anything financial** (credit accounts) — balance is always derived, never directly written.
5. **Soft-delete and audit-log enforcement live in a Prisma Client Extension, not developer discipline** — both are the kind of rule that silently rots if left to "remember to filter `deleted_at`" at every call site.
