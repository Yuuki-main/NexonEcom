# RLS Security Audit — nexon-ecom

**Date:** 2026-08-26
**Scope:** Row-Level Security (RLS) posture across all application tables
**Mode:** Read-only investigation. No database objects, policies, code, or configuration were modified.
**Database:** Supabase-hosted PostgreSQL (project `sbccvnelvhzftzpqbscl`, region `ap-northeast-1`)

---

## 1. Executive Summary

The application uses **Supabase only as a managed PostgreSQL host**. There is **no Supabase client library** (`@supabase/supabase-js`), no anon key, and no service-role key anywhere in the codebase. All database access flows through **Prisma** (`@prisma/adapter-pg`) using the **`postgres` connection role** over a pooled connection string (`DATABASE_URL`).

Three facts dominate the RLS strategy:

1. **RLS is disabled on all 39 application tables and zero RLS policies exist** (verified: `pg_policy` = 0 rows, all 39 app tables `relrowsecurity = f`).
2. **The application tables are not exposed to PostgREST roles.** The 8 custom schemas (`audit`, `billing`, `catalog`, `commerce`, `crm`, `identity`, `inventory`, `shared`) have **no `USAGE` grant to `anon`, `authenticated`, or `service_role`** (verified via `has_schema_privilege`). Only `public`, `storage`, `graphql_public`, `realtime` are exposed. The only table in `public` is Prisma's internal `_prisma_migrations`.
3. **The app connects as `postgres`, which has `rolbypassrls = true`.** This is equivalent to a service-role connection: even if RLS were enabled today, the app's own queries would bypass it.

**Net conclusion:** RLS is currently a *defense-in-depth* control, not an actively-enforced boundary. Cross-tenant isolation is enforced **entirely in application code** (JWT → `userId` → `organizationId` scoping in each route). The highest-value work is therefore (a) protecting the actively-accessed tenant data with RLS so a single forgotten `where` clause cannot cause a cross-organization breach, and (b) resolving the `postgres`-bypass issue so RLS can actually take effect.

---

## 2. Current RLS State

Verified against the live database (read-only catalog queries):

| Metric | Value |
| --- | --- |
| Application tables (8 custom schemas) | 39 |
| Tables with RLS enabled | **0** |
| Tables with RLS disabled | **39** |
| Tables with `FORCE ROW LEVEL SECURITY` | 0 |
| Total RLS policies (`pg_policy`) | **0** |
| App-schema functions | `uuid_generate_v7`, `set_updated_at`, `block_mutation`, `protect_quote` (all non-SECURITY-DEFINER triggers/helpers) |

Supabase system schemas (for completeness): `auth` has 16 of 23 tables with RLS on (0 policies), `storage` has 8/8 RLS on (0 policies), `realtime` 1/3 on, `vault.secrets` off. **Because there are zero policies, even those RLS-on system tables are effectively deny-all for non-bypass roles.** No RLS policies are configured anywhere in this database.

---

## 3. Database / Table Inventory

Application schemas (from `prisma/schema.prisma`, `datasource.schemas`):

| # | Schema | Table | PK | Key FKs / scoping columns | Data class |
| --- | --- | --- | --- | --- | --- |
| 1 | shared | `countries` | `iso_code` | — | Reference |
| 2 | shared | `addresses` | `id` | `country_code` → countries | PII (indirect tenancy) |
| 3 | identity | `organizations` | `id` | `account_owner_user_id` | Tenant root + PII (ABN, addresses) |
| 4 | identity | `users` | `id` | — | Auth + PII (`password_hash`) |
| 5 | identity | `organization_members` | `id` | `organization_id`, `user_id` | Tenant membership (RBAC) |
| 6 | identity | `organization_addresses` | `id` | `organization_id`, `address_id` | Tenant → address join |
| 7 | identity | `organization_team_members` | `id` | `organization_id` | Tenant + PII (name/email/phone) |
| 8 | identity | `roles` | `id` | — | Reference (staff roles) |
| 9 | identity | `user_roles` | `(user_id, role_id)` | — | Staff RBAC join |
| 10 | identity | `sessions` | `id` | `user_id` | Auth (refresh token hash) |
| 11 | identity | `password_reset_tokens` | `id` | `user_id` | Auth token |
| 12 | identity | `email_verification_tokens` | `id` | `user_id` | Auth token |
| 13 | catalog | `categories` | `id` | `parent_category_id` | Reference |
| 14 | catalog | `brands` | `id` | — | Reference |
| 15 | catalog | `products` | `id` | `category_id`, `brand_id` | Catalog (public) |
| 16 | catalog | `product_images` | `id` | `product_id` | Catalog child |
| 17 | commerce | `carts` | `id` | `user_id` (unique) | User-owned |
| 18 | commerce | `cart_items` | `id` | `cart_id`, `product_id` | User-owned (via cart) |
| 19 | commerce | `orders` | `id` | `organization_id`, `placed_by_user_id` | Tenant + financial + PII (address snapshots) |
| 20 | commerce | `order_items` | `id` | `order_id`, `product_id` | Tenant (via order) |
| 21 | commerce | `favourites` | `id` | `user_id`, `product_id` | User-owned |
| 22 | crm | `contacts` | `id` | `organization_id`, `linked_user_id` | Tenant + PII |
| 23 | crm | `leads` | `id` | `organization_id?`, `owner_user_id` | Tenant + PII |
| 24 | crm | `opportunities` | `id` | `organization_id`, `owner_user_id` | Tenant + financial |
| 25 | crm | `quotes` | `id` | `organization_id`, `opportunity_id` | Tenant + financial |
| 26 | crm | `quote_items` | `id` | `quote_id`, `product_id` | Tenant (via quote) |
| 27 | crm | `activities` | `id` | `entity_id` (polymorphic, **no FK**) | Polymorphic + PII |
| 28 | inventory | `warehouses` | `id` | `address_id` | Global operational |
| 29 | inventory | `stock_items` | `id` | `warehouse_id`, `product_id` | Global operational |
| 30 | inventory | `stock_movements` | `id` | `warehouse_id`, `product_id` | Global ledger |
| 31 | inventory | `installers` | `id` | `organization_id` (unique) | Tenant (partner org) |
| 32 | inventory | `installation_jobs` | `id` | `order_id`, `installer_id` | Tenant (via order) |
| 33 | billing | `credit_accounts` | `id` | `organization_id` (unique) | Tenant + financial |
| 34 | billing | `credit_ledger_entries` | `id` | `credit_account_id` | Tenant + financial |
| 35 | billing | `invoices` | `id` | `organization_id`, `order_id` | Tenant + financial |
| 36 | billing | `invoice_items` | `id` | `invoice_id` | Tenant (via invoice) |
| 37 | billing | `payments` | `id` | `organization_id`, `order_id`, `invoice_id` | Tenant + financial + Stripe IDs |
| 38 | billing | `stripe_events` | `id` | `stripe_event_id` (unique) | Internal (webhook dedup) |
| 39 | audit | `audit_log` | `id` | `actor_id`, `organization_id` (no FK) | Audit (append-only) |

Plus `public._prisma_migrations` (Prisma's internal migration-tracking table, not application data).

---

## 4. Application Access Architecture

```
Browser (React 'use client' components)
   │  fetch('/api/...')  +  httpOnly JWT cookie ("token")
   ▼
Next.js API route handlers / Server Components  (Node runtime)
   │  Prisma ORM  (lib/prisma.js → @prisma/adapter-pg)
   ▼
PostgreSQL on Supabase — role: postgres (rolbypassrls = true)
```

- **No `@supabase/supabase-js`** (0 matches). **No `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_*`** anywhere.
- **No direct `pg`/`postgres` driver usage** in application code — only Prisma's `PrismaPg` adapter (evidence: `lib/prisma.js:1-9`, `package.json` deps).
- **No PostgREST / RPC calls** in code.
- Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_APP_URL` are browser-visible.
- **Prisma is imported only in server files** (28 files: `lib/*`, `app/api/**/route.js`, and server-component `app/**/page.js`). No `'use client'` component imports Prisma. Client components use `fetch('/api/...')` exclusively.

### Which tables are actually accessed at runtime (vs dormant)

From a `prisma.<model>` sweep of the codebase:

**Actively accessed:** `user`, `organization`, `organizationMember`, `organizationTeamMember`, `cart`, `cartItem`, `order`, `favourite`, `product`, `brand`, `category`, `productImage` (via include), `payment`, `stripeEvent`.

**Seed-only (CLI script `prisma/seed.mjs`):** `country`, `role`, `userRole`, `address`, `warehouse`, `stockItem`, `productImage`, `organization`, `user`, `organizationMember`, `category`, `brand`, `product`.

**Defined + migrated but not yet wired into runtime code (dormant):** `session`, `passwordResetToken`, `emailVerificationToken`, `organizationAddress`, `contact`, `lead`, `opportunity`, `quote`, `quoteItem`, `activity`, `stockMovement`, `installer`, `installationJob`, `invoice`, `invoiceItem`, `creditAccount`, `creditLedgerEntry`, `auditLog`. (Credit tables appear only in `STRIPE_INTEGRATION_GUIDE.md` documentation, not in executable code.)

This dormancy matters for RLS prioritization: ~half the schema has no runtime access path yet, so those tables are "future modules" whose RLS should be designed now but is not yet exploitable.

---

## 5. Authentication & Authorization Model

- **Authentication:** custom JWT (`lib/auth.js`, `jsonwebtoken` + `bcryptjs`). Password hash in `identity.users.password_hash`. JWT `{ userId, role: 'user' }` stored in an `httpOnly` cookie `token`. `middleware.js` verifies the JWT (`jose`) and gates `/account`, `/checkout`, `/products/[slug]`.
- **Current-user resolution:** read cookie → `verifyToken(token)` → `payload.userId`.
- **Organization resolution:** `organizationMember.findFirst({ where: { userId, status: 'active' } })` → `organizationId`.
- **Authorization location:** 100% application-layer, inside each route. Examples:
  - `app/api/orders/route.js` — resolves `organizationId` and queries `order.findMany({ where: { organizationId } })`.
  - `app/api/cart/route.js`, `app/api/favourites/route.js` — `where: { userId }`.
  - `lib/account/getTeamAccess.js` — restricts team management to `owner`/`admin`.
  - `app/api/account/company-profile/route.js` — 403 unless role is `owner`/`admin`.
  - `app/api/track-order/route.js` — (recently fixed) requires `orderNumber` + matching member `email`.

There is **no RLS, no DB grants, and no Postgres role** enforcing any of this. The `postgres` role bypasses everything.

---

## 6. Organization / Tenant Relationship Map

Derived from `prisma/schema.prisma` relations:

```
User ──┬── OrganizationMember ── Organization
       │        (role, status)         │
       │                               ├── OrganizationTeamMember (name/email/phone)
       │                               ├── OrganizationAddress ── Address
       │                               ├── Contact
       │                               ├── Lead (owner_user_id)
       │                               ├── Opportunity (owner_user_id)
       │                               ├── Quote ── QuoteItem
       │                               ├── Invoice ── InvoiceItem
       │                               ├── Payment
       │                               ├── CreditAccount ── CreditLedgerEntry
       │                               └── Order ── OrderItem
       │                                        ├── InstallationJob ── Installer
       │                                        └── Payment
       ├── Session (user_id)
       ├── PasswordResetToken (user_id)
       ├── EmailVerificationToken (user_id)
       ├── Cart (user_id) ── CartItem
       └── Favourite (user_id, product_id)
```

Authorization should conceptually flow: **authenticated user → active `organization_members` row → `organization_id` → rows whose `organization_id` matches**. User-owned tables (`carts`, `favourites`, `sessions`, tokens) scope directly on `user_id`.

---

## 7. Table-by-Table RLS Classification

Legend — **Current access path:** SRVC = server component, API = API route, SEED = seed script only, DORMANT = no runtime access, WEBHK = webhook.
**Client accessible (PostgREST)?** — NO for all 39 (schemas not granted `USAGE` to anon/authenticated; see §8). "Potential" reflects future exposure risk.

| Table | Sensitive? | Tenant/User scoped? | Client accessible? | Current access path | Current app auth | RLS Priority |
| --- | --- | --- | --- | --- | --- | --- |
| identity.users | Yes (PII + password hash) | User | No (potential HIGH) | API | JWT lookup by id/email | **HIGH** |
| identity.organizations | Yes (PII/ABN/addresses) | Tenant | No (potential HIGH) | API/SRVC/SEED | scoped by membership | **HIGH** |
| identity.organization_members | Yes (RBAC) | Tenant | No (potential HIGH) | API/SRVC/SEED | scoped by userId | **HIGH** |
| identity.organization_team_members | Yes (PII) | Tenant | No | API/SRVC | scoped by orgId | **HIGH** |
| commerce.orders | Yes (PII + financial) | Tenant | No (potential HIGH) | API/SRVC/WEBHK | scoped by orgId | **HIGH** |
| commerce.carts | Yes | User | No | API/SRVC | scoped by userId | **HIGH** |
| commerce.cart_items | Yes | User (via cart) | No | API | scoped via cart.userId | **HIGH** |
| commerce.favourites | Yes | User | No | API | scoped by userId | **HIGH** |
| billing.payments | Yes (financial + Stripe IDs) | Tenant | No | WEBHK | service-only | **HIGH** |
| commerce.order_items | Yes | Tenant (via order) | No | nested create | via order | MEDIUM |
| identity.organization_addresses | Yes | Tenant | No | DORMANT | — | MEDIUM |
| identity.sessions | Yes (refresh token) | User | No | DORMANT | — | MEDIUM |
| identity.password_reset_tokens | Yes (token) | User | No | DORMANT | — | MEDIUM |
| identity.email_verification_tokens | Yes (token) | User | No | DORMANT | — | MEDIUM |
| crm.contacts | Yes (PII) | Tenant | No | DORMANT | — | MEDIUM |
| crm.leads | Yes (PII) | Tenant/owner | No | DORMANT | — | MEDIUM |
| crm.opportunities | Yes | Tenant/owner | No | DORMANT | — | MEDIUM |
| crm.quotes | Yes (financial) | Tenant | No | DORMANT | — | MEDIUM |
| crm.quote_items | Yes | Tenant (via quote) | No | DORMANT | — | MEDIUM |
| billing.invoices | Yes (financial) | Tenant | No | DORMANT | — | MEDIUM |
| billing.invoice_items | Yes | Tenant (via invoice) | No | DORMANT | — | MEDIUM |
| billing.credit_accounts | Yes (financial) | Tenant | No | DORMANT | — | MEDIUM |
| billing.credit_ledger_entries | Yes (financial) | Tenant | No | DORMANT | — | MEDIUM |
| inventory.installers | Yes (license) | Tenant (partner) | No | DORMANT | — | MEDIUM |
| inventory.installation_jobs | Yes | Tenant (via order) | No | DORMANT | — | MEDIUM |
| audit.audit_log | Yes (before/after PII) | Partial (`organization_id`, no FK) | No | DORMANT | — | LOW |
| billing.stripe_events | Low (event payload) | No | No | WEBHK | service-only | LOW |
| shared.countries | No | No (global) | No | SEED | none | NONE |
| catalog.categories | No | No (global) | No | API/SRVC | none (public) | NONE |
| catalog.brands | No | No (global) | No | API/SRVC | none (public) | NONE |
| catalog.products | No | No (global) | No | API/SRVC/SEED | none (public catalog) | NONE |
| catalog.product_images | No | No (global) | No | via product | none (public) | NONE |
| identity.roles | No | No (staff ref) | No | SEED | none | NONE |
| identity.user_roles | Yes (staff RBAC) | No (staff) | No | SEED | none | NONE |
| inventory.warehouses | Low | No (global) | No | SEED | none | NONE |
| inventory.stock_items | Low | No (global) | No | SEED | none | NONE |
| inventory.stock_movements | Low | No (global) | No | SEED | none | NONE |
| shared.addresses | Yes (PII) | **Indirect** (via `organization_addresses` / `warehouse.address_id`) | No | SEED | — | **INVESTIGATE** |
| crm.activities | Yes (notes/body) | Polymorphic (`entity_id`, no FK) | No | DORMANT | — | **INVESTIGATE** |

### Category summary

- **Category A — RLS REQUIRED / HIGH (9):** `users`, `organizations`, `organization_members`, `organization_team_members`, `orders`, `carts`, `cart_items`, `favourites`, `payments`.
- **Category B — RLS RECOMMENDED / MEDIUM (16):** `order_items`, `organization_addresses`, `sessions`, `password_reset_tokens`, `email_verification_tokens`, `contacts`, `leads`, `opportunities`, `quotes`, `quote_items`, `invoices`, `invoice_items`, `credit_accounts`, `credit_ledger_entries`, `installers`, `installation_jobs`.
- **LOW / OPTIONAL (2):** `audit_log`, `stripe_events`.
- **RLS PROBABLY NOT REQUIRED (10):** `countries`, `categories`, `brands`, `products`, `product_images` (global/public) + `roles`, `user_roles`, `warehouses`, `stock_items`, `stock_movements` (server-only/internal).
- **NEEDS INVESTIGATION (2):** `addresses`, `activities`.

---

## 8. Supabase RLS / Database Configuration (verified)

- **Schema exposure:** `has_schema_privilege('anon'|'authenticated'|'service_role', <app schema>, 'USAGE')` = **false for all 8 app schemas**; `postgres` = true. Exposed schemas: `public`, `storage`, `graphql_public`, `realtime`.
- **Table privileges:** `role_table_grants` shows **no app-table grants** to anon/authenticated/service_role. Grants exist only on `public._prisma_migrations`, `realtime.*`, `storage.*`, `vault.*`.
- **Default ACLs:** only `public`, `storage`, `graphql`, `graphql_public` (Supabase system schemas) grant anon/authenticated/service_role; **no default privileges on the 8 custom schemas**.
- **Roles:** `postgres` `rolbypassrls = t`, `service_role` `rolbypassrls = t`, `anon`/`authenticated` `rolbypassrls = f`.
- **RLS:** all 39 app tables `relrowsecurity = f`; **0 policies** database-wide.

**Conclusion (evidence-backed):** the application's tables are **not reachable by `anon`/`authenticated` via PostgREST**. RLS is currently not a live boundary for these tables; enabling it is defense-in-depth. **Assumption (cannot verify from DB):** the exact `PGRST_DB_SCHEMAS` PostgREST setting is a dashboard-level config not stored in the DB; however, even if a schema were added to PostgREST, the missing `USAGE` grants would still block `anon`/`authenticated` unless grants are also added.

### Notable finding

`public._prisma_migrations` is **RLS-disabled and granted full CRUD to `anon`, `authenticated`, and `service_role`** (Supabase's default privileges on the `public` schema). It contains only migration metadata (names, timestamps, checksums, logs) — not PII — but it is technically readable (and writable) through PostgREST by anonymous clients. Recommend `REVOKE` from `anon`/`authenticated` (or move migration tracking out of `public`) as a minor hardening step.

---

## 9. High-Risk Findings

1. **All tenant isolation rests on application code, and the app runs as a bypass role.** Every route must remember to scope by `organizationId`/`userId`. A single forgotten `where` (e.g. `prisma.order.findUnique({ where: { id } })` instead of `{ id, organizationId }`) leaks cross-organization data, because `postgres` bypasses any future RLS too. (See §10 for concrete IDOR-gap patterns.)
2. **`postgres` role (`rolbypassrls = true`) is used for all runtime queries.** Enabling RLS alone will not protect anything until the app switches to a non-bypass role (e.g. `authenticated`/`authenticator` with `SET LOCAL ROLE` + a per-request `current_setting`/JWT claim).
3. **Zero RLS policies anywhere**, including Supabase's own `auth` and `storage` schemas. `storage.objects` has RLS ON but no policies → deny-all. Any use of Supabase Storage buckets would currently be non-functional or need policy setup.
4. **`public._prisma_migrations` is anonymously readable/writable via PostgREST** (minor info disclosure; no PII).
5. **Dormant-but-sensitive modules** (CRM, billing, inventory) are migrated with no access path and no authorization code yet. When those modules ship, authorization must be built in from day one (and RLS ideally shipped alongside).

---

## 10. Potential IDOR / Authorization Gaps

- **Direct-ID lookup patterns:** `app/api/products/[id]/route.js` and `app/api/account/team/[memberId]/route.js` accept a client-supplied ID. The team route correctly scopes (`organizationId: access.organizationId`); the product route is public by design. **Risk pattern to audit:** any future route doing `findUnique({ where: { id } })` on tenant tables without also filtering `organizationId` is an IDOR.
- **`app/api/account/subscriptions/[membershipId]/route.js`** — updates a membership by ID. It resolves the caller's membership first; must ensure the target `membershipId` belongs to the caller's organization (scoped in `getTeamAccess`/route code — verified present, but this is exactly the class of check RLS would backstop).
- **Historical gap (fixed):** `app/api/track-order/route.js` was unauthenticated and returned full name + full shipping address by guessable `ORD-XXXXXX` order number. Now requires `orderNumber` + matching member email and returns masked PII. No residual RLS dependency.
- **Stripe webhook (`app/api/webhooks/stripe/route.js`)** updates `orders`/`payments` by `orderId`/`stripePaymentIntentId` from signed webhook payloads — correct server-to-server trust, no user-facing IDOR, but it is another place that writes without any RLS.

---

## 11. RLS Policy Dependencies (conceptual — NOT implemented)

RLS for tenant tables would key off a `current_setting`/JWT claim (e.g. `current_setting('app.current_user_id')` or `request.jwt.claim.sub`), then resolve the user's organizations via `organization_members`. This creates the classic dependency chain:

```
orders.organization_id
   → organization_members.organization_id
   → organization_members.user_id
   → authenticated user id (JWT claim / GUC)
```

Typical conceptual policy shapes:

- **User-owned:** `USING (user_id = current_user_id)` — `carts`, `cart_items` (via cart), `favourites`, `sessions`, `password_reset_tokens`, `email_verification_tokens`.
- **Tenant-owned:** `USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = current_user_id AND status = 'active' AND deleted_at IS NULL))` — `orders`, `order_items`, `contacts`, `leads` (or owner), `opportunities`, `quotes`, `quote_items`, `invoices`, `invoice_items`, `payments`, `credit_accounts`, `credit_ledger_entries`, `organization_team_members`, `organization_addresses`, `installers`, `installation_jobs`.
- **Self + tenant (identity):** `organizations` and `organization_members` themselves would be readable by members of that organization.
- **Admin-only:** `roles`/`user_roles` (platform staff) — service-role only.

**Recursion risks (flagged, not implemented):**

- An `organization_members` policy that itself reads `organization_members` to decide membership would recurse. Standard mitigations: (a) use a `SECURITY DEFINER` helper function with `SET search_path` to resolve membership outside the RLS path, (b) use a dedicated `security definer` function `is_member_of(org_id)` that is `SECURITY DEFINER` so it bypasses RLS on `organization_members`, or (c) scope `organization_members` by `user_id = current_user_id OR organization_id IN (...)` carefully. This must be designed to avoid infinite recursion.
- `addresses` and `activities` have **no direct tenant column** (`addresses` is reached via `organization_addresses`/`warehouse.address_id`; `activities.entity_id` is polymorphic with no FK). Their policies would require subqueries through join tables or a denormalized scope column — hence "INVESTIGATE".

---

## 12. Tables Where RLS Is Probably Unnecessary

Supported by the access map (seed-only or public/global):

- **Global reference/public:** `countries`, `categories`, `brands`, `products`, `product_images` — intentionally readable catalog data; writes are (or should be) staff/service-role only.
- **Server-only internal RBAC:** `roles`, `user_roles` — platform-staff roles, not customer-facing; currently seed-only.
- **Global operational:** `warehouses`, `stock_items`, `stock_movements` — single-warehouse internal ops; not tenant-scoped; currently seed-only.
- **Internal webhook/audit:** `stripe_events` (webhook dedup), `audit_log` (append-only; the schema already plans `REVOKE UPDATE/DELETE` for the runtime role).

Caveat: "server-only" here means "not tenant-scoped and not customer-facing," **not** "RLS is irrelevant because the app bypasses it." These tables carry no cross-tenant risk, which is the actual reason RLS is unnecessary.

---

## 13. Tables Requiring Further Investigation

1. **`shared.addresses`** — contains street-level PII but has **no direct `organization_id` or `user_id`**. Its tenancy is indirect (via `organization_addresses` for customers, and `warehouse.address_id` for internal warehouses). Decide whether addresses are strictly per-organization, shared/global, or a mix before writing a policy. **Assumption:** mixed-use; a customer address and a warehouse address live in the same table.
2. **`crm.activities`** — `entity_id` is polymorphic (points at any of several entities) with **no FK**. A policy would need `entity_type`-aware resolution to the owning organization, which is non-trivial and error-prone. Consider an owner-user or `organization_id` denormalization before enabling RLS.

---

## 14. Breakage Risks (if RLS is enabled today)

| Concern | Assessment |
| --- | --- |
| Would enabling RLS block existing server queries? | **Yes — but only if the app's role is a non-bypass role.** Currently the app runs as `postgres` (`rolbypassrls = t`), so enabling RLS would change nothing for the app. This is itself the problem to solve. |
| Would browser/client queries stop working? | No — the browser never talks to the DB directly; it uses `/api` routes. |
| Would background jobs/webhooks stop working? | No current background jobs. Stripe webhook runs as the same `postgres` role → would bypass RLS. |
| Would API routes stop working? | Not while running as `postgres`. Once the app moves to a non-bypass role, **every** route would be denied until policies exist — hence RLS must be enabled *after* policies and the role switch are staged. |
| Would Prisma queries be affected? | Only after a role switch; Prisma has no built-in RLS awareness, so all scoping must be via `SET LOCAL ROLE` + `current_setting`. |
| Would service-role access bypass policies? | Yes by design (`service_role` and `postgres` have `rolbypassrls`). Admin/webhook paths should intentionally use these roles. |

**Bottom line:** for the app's own tables, RLS is currently **"safe to enable after policies exist, but ineffective until the app's connection role changes."** Enabling RLS alone (no policies, no role switch) is safe but does nothing for the app. Enabling RLS + policies + then switching the app off `postgres` is the real work and carries real breakage risk that must be staged and tested.

---

## 15. Recommended RLS Rollout Order

- **PHASE 0 — DO NOTHING / CURRENT STATE:** No RLS, no policies, app on `postgres` (bypass). Immediate risks: (a) `public._prisma_migrations` anonymously writable via PostgREST (minor); (b) total reliance on application-layer scoping — a single missing `where` = cross-org breach; (c) no defense-in-depth anywhere.
- **PHASE 1 — HIGH-RISK TABLES (9):** `users`, `organizations`, `organization_members`, `organization_team_members`, `orders`, `carts`, `cart_items`, `favourites`, `payments`. Also **resolve the `postgres`-bypass** (introduce an `authenticated`/`authenticator` runtime role with `SET LOCAL ROLE` + a `current_setting('app.current_user_id')` populated from the JWT), because without that step RLS cannot protect these tables.
- **PHASE 2 — MEDIUM-RISK TABLES (16):** the tenant/user-scoped dormant tables (CRM, billing, inventory, auth tokens, `order_items`, `organization_addresses`) — design policies now, enable as each module goes live.
- **PHASE 3 — LOW / DEFENSE-IN-DEPTH (2):** `audit_log`, `stripe_events` — service-only policies; also `REVOKE` on `public._prisma_migrations`.
- **PHASE 4 — NO RLS (10):** `countries`, `categories`, `brands`, `products`, `product_images`, `roles`, `user_roles`, `warehouses`, `stock_items`, `stock_movements`.

---

## 16. Evidence / File References

- Prisma schema & all models: `prisma/schema.prisma` (39 models, `datasource.schemas` = 8 custom schemas).
- Prisma client & connection role: `lib/prisma.js` (`DATABASE_URL`, `PrismaPg` adapter); `prisma.config.ts` (`DIRECT_URL`/`DATABASE_URL`).
- Auth: `lib/auth.js` (JWT + bcrypt), `middleware.js` (JWT verification).
- No Supabase SDK: package.json dependencies (no `@supabase/supabase-js`); grep for `SUPABASE_*`/`SERVICE_ROLE`/`ANON_KEY`/`createClient` → 0 app-code hits.
- Client access pattern: `'use client'` components use `fetch('/api/...')` (e.g. `store/slices/cartSlice.js`, `components/CheckoutClient.jsx`).
- Authorization examples: `app/api/orders/route.js`, `app/api/cart/route.js`, `app/api/favourites/route.js`, `lib/account/getTeamAccess.js`, `app/api/account/company-profile/route.js`, `app/api/track-order/route.js`.
- Database metadata (read-only, live): `pg_class`/`pg_namespace` (RLS flags), `pg_policy` (0), `pg_roles` (bypassrls), `information_schema.role_table_grants`, `has_schema_privilege`, `pg_default_acl`, `pg_proc` (4 trigger/helper functions).
- Dormant-module evidence: `prisma.<model>` sweep (88 hits) shows no runtime references for CRM/billing/inventory/audit models.

---

## 17. Final Summary

**TOTAL TABLES: 39**

**RLS REQUIRED / HIGH: 9**
**RLS RECOMMENDED / MEDIUM: 16**
**RLS LOW / OPTIONAL: 2**
**RLS PROBABLY NOT REQUIRED: 10**
**NEEDS INVESTIGATION: 2**

**MOST CRITICAL TABLES:**
1. `identity.users` — password hashes + PII; the authentication root.
2. `identity.organizations` — tenant root; breach cascades to every child table.
3. `identity.organization_members` — the membership map that all tenant authorization depends on.
4. `commerce.orders` — customer PII (address snapshots) + financial totals, actively accessed.
5. `billing.payments` — financial records + Stripe IDs, written by webhook without RLS.

**No changes were made to the project or database.**
