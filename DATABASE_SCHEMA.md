# NexonEcom PostgreSQL Database Design (ERD-Level)

Companion to `ARCHITECTURE.md`. This is schema design only — no Prisma, no SQL migration files. Organized by Postgres schema (bounded context), per `ARCHITECTURE.md` §3.

---

## 0. Global Conventions (apply to every table below unless stated otherwise)

- **Primary key:** `id uuid primary key default uuid_generate_v7()` — time-ordered UUIDs (ARCHITECTURE.md §3.2). **Exception:** pure many-to-many junction tables with zero extra attributes use a composite primary key instead of a surrogate `id` (called out per-table, only `identity.user_roles` qualifies here).
- **Timestamps:** `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` maintained by a single shared `set_updated_at()` trigger — not repeated per table below.
- **Soft delete:** `deleted_at timestamptz null` — present only on tables marked "Soft delete: yes." Enforced application-side via a Prisma Client Extension (ARCHITECTURE.md §12), not by a DB trigger.
- **Money:** `numeric(12,2)` plus an explicit `currency_code char(3)` column on every table that stores an amount — no implicit currency.
- **GST convention:** All prices in `catalog.products` are **GST-exclusive** (the displayed unit price). All totals in `commerce.orders` and `billing.invoices` are **GST-inclusive** (the amount the customer pays). GST rate is stored once on the order/invoice as `tax_rate` (not per line item — Australian GST is a flat 10% on every taxable line). This is the standard convention for B2B wholesale platforms where customers are GST-registered and claim input tax credits — showing ex-GST prices is the norm.
- **Enums:** Postgres `CREATE TYPE ... AS ENUM`, snake_case, `_enum` suffix. Full list in §1.
- **Audit trail:** every mutation on a "sensitive" table (marked below) is additionally captured by a Prisma Client Extension into `audit.audit_log` (§9) — the `created_by_user_id`/`updated_by_user_id` columns on a table answer "who," the audit log answers "what changed, from what, to what."
- **Row-Level Security:** enabled on every table in `commerce`, `crm`, `billing`, and the multi-tenant tables in `inventory`/`identity`, policy `organization_id = current_setting('app.current_org_id')::uuid`. Not repeated per table; called out only where a table is *not* organization-scoped and therefore has no such policy (pure reference data, sessions, catalog).

---

## 1. Enum Types

| Enum | Values |
|---|---|
| `organization_type_enum` | `customer`, `partner`, `internal` |
| `organization_status_enum` | `active`, `suspended`, `closed` |
| `organization_member_role_enum` | `owner`, `admin`, `purchaser`, `viewer` |
| `organization_member_status_enum` | `invited`, `active`, `removed` |
| `cell_type_enum` | `n_type`, `p_type` |
| `order_status_enum` | `pending_payment`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `lead_status_enum` | `new`, `contacted`, `qualified`, `disqualified`, `converted` |
| `opportunity_stage_enum` | `prospecting`, `qualification`, `proposal`, `negotiation`, `won`, `lost` |
| `quote_status_enum` | `draft`, `sent`, `accepted`, `rejected`, `expired`, `converted` |
| `activity_type_enum` | `call`, `email`, `meeting`, `note`, `task` |
| `stock_movement_type_enum` | `receipt`, `sale`, `return`, `adjustment`, `transfer_in`, `transfer_out`, `reservation`, `release` |
| `installer_status_enum` | `pending_approval`, `active`, `suspended`, `inactive` |
| `installation_job_status_enum` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `credit_account_status_enum` | `active`, `suspended`, `closed` |
| `credit_ledger_entry_type_enum` | `invoice_charge`, `payment`, `credit_note`, `adjustment` |
| `invoice_status_enum` | `draft`, `issued`, `paid`, `overdue`, `void` |
| `payment_method_enum` | `card`, `bank_transfer`, `credit_account` |
| `payment_status_enum` | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `audit_actor_type_enum` | `user`, `system`, `api_key` |

---

## 2. `shared` schema — cross-cutting reference data

### `shared.countries`
**Purpose:** ISO country reference; backs `addresses.country_code`, avoids free-text country strings.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| iso_code | char(2) | no | — | PK, ISO 3166-1 alpha-2 |
| name | text | no | — | |
| calling_code | text | yes | null | |
| created_at / updated_at | timestamptz | no | now() | |

Constraints: `PK(iso_code)`; `CHECK (iso_code = upper(iso_code))`. No soft delete — static reference data, protected from deletion by `RESTRICT` FKs from `addresses`. No RLS (public reference data).

### `shared.addresses`
**Purpose:** reusable, editable address-book entries. Deliberately **not** referenced directly by `orders`/`invoices` — those hold an immutable JSONB snapshot instead (see `commerce.orders`); this table is the mutable "address book," not the transactional record.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| line1 | text | no | — | |
| line2 | text | yes | null | |
| city | text | no | — | |
| state | text | yes | null | |
| postcode | text | no | — | |
| country_code | char(2) | no | 'AU' | FK → `shared.countries(iso_code)` `ON DELETE RESTRICT` |
| latitude / longitude | numeric(9,6) | yes | null | for future installer routing/logistics |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Soft delete: yes. No RLS directly (scoped indirectly via the join tables that reference it).

### `identity.organization_addresses` *(join table, documented here for proximity)*
**Purpose:** an organization can have multiple addresses (head office + multiple job sites) — this is why addresses aren't a single FK column on `organizations`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE CASCADE` |
| address_id | uuid | no | — | FK → `shared.addresses(id)` `ON DELETE CASCADE` |
| label | text | yes | null | e.g. "Head Office", "Site A" |
| is_default_shipping | boolean | no | false | |
| is_default_billing | boolean | no | false | |
| created_at / updated_at | timestamptz | — | — | |

Unique: `(organization_id, address_id)`. Index: `idx_org_addresses_organization_id`. No soft delete (a real delete just removes the link; the address itself is soft-deletable independently).

---

## 3. `identity` schema

### `identity.organizations`
**Purpose:** the anchor B2B entity. Root of nearly every downstream relationship — orders, quotes, credit accounts, invoices all hang off this, not off a person.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| type | organization_type_enum | no | 'customer' | customer / partner (installer) / internal |
| legal_name | text | no | — | (was `companyName`) |
| trading_name | text | yes | null | |
| abn | text | yes | null | required for `type = 'customer'`, see CHECK below |
| is_gst_registered | boolean | no | true | replaces the old `gst` enum('Yes','No') string |
| account_owner_user_id | uuid | yes | null | assigned sales rep — FK → `identity.users(id)` `ON DELETE SET NULL` |
| status | organization_status_enum | no | 'active' | |
| created_by_user_id | uuid | yes | null | FK → `users(id)` `ON DELETE SET NULL` |
| updated_by_user_id | uuid | yes | null | FK → `users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Constraints: `CHECK (type <> 'customer' OR abn IS NOT NULL)`.
Unique indexes: partial unique `(abn) WHERE deleted_at IS NULL AND abn IS NOT NULL` (`uq_organizations_abn_active`) — same legal entity shouldn't hold two active accounts.
Indexes: `idx_organizations_account_owner_user_id`, `idx_organizations_type`.
Soft delete: yes. **Never hard-deletable** once it has any order/quote/invoice/credit-account history — those all FK to it with `ON DELETE RESTRICT` (see below).
Sensitive (audited): yes.

> Note: the original Mongo `User` also carried `hearAboutUs`/`installations` (weekly install volume). Those are **not** carried onto `Organization` here — they're point-in-time qualification answers from signup, not durable facts about the company, so they live on `crm.leads` instead (§5). See review item in §10.

### `identity.users`
**Purpose:** universal login-capable identity — both customer-portal users (via `organization_members`) and internal staff (via `user_roles`). A person, never a company.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| full_name | text | no | — | |
| email | text | no | — | |
| password_hash | text | no | — | Argon2id/bcrypt hash, never plaintext |
| phone | text | yes | null | |
| is_email_verified | boolean | no | false | |
| is_active | boolean | no | true | disable login without deleting the account |
| last_login_at | timestamptz | yes | null | |
| created_by_user_id | uuid | yes | null | set when staff creates an account on someone's behalf; FK → `users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Constraints: `CHECK (char_length(full_name) > 0)`.
Unique indexes: partial unique `(lower(email)) WHERE deleted_at IS NULL` (`uq_users_email_active`).
Indexes: `idx_users_is_active`.
Soft delete: yes, but see §10 review — realistically blocked once the user has done anything (owns an opportunity, is an org member, etc.) due to `RESTRICT` FKs elsewhere.
Sensitive: yes. No RLS (identity table, accessed only via the trusted server / service role).

### `identity.organization_members`
**Purpose:** grants a `User` the ability to act on behalf of an `Organization`, with a portal-scoped role (owner/admin/purchaser/viewer). This is the **customer-portal** RBAC layer — distinct from platform staff roles below.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `organizations(id)` `ON DELETE CASCADE` |
| user_id | uuid | no | — | FK → `users(id)` `ON DELETE CASCADE` |
| role | organization_member_role_enum | no | 'purchaser' | |
| status | organization_member_status_enum | no | 'active' | |
| invited_by_user_id | uuid | yes | null | FK → `users(id)` `ON DELETE SET NULL` |
| invited_at / joined_at | timestamptz | yes | null | |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Unique indexes: partial unique `(organization_id, user_id) WHERE deleted_at IS NULL` (`uq_org_members_org_user_active`).
Indexes: `idx_org_members_user_id`, `idx_org_members_organization_id`.
Soft delete: yes — removing a member is a soft delete, preserving "who was ever on this account" history.

### `identity.roles`
**Purpose:** internal **platform** RBAC — staff roles (`admin`, `sales_rep`, `credit_manager`, `warehouse_staff`, `support`), decoupled entirely from any customer organization.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| key | text | no | — | e.g. `'sales_rep'` |
| name | text | no | — | display name |
| description | text | yes | null | |
| created_at / updated_at | timestamptz | — | — | |

Unique: `(key)`. No soft delete — small static reference set, protected by `RESTRICT` from `user_roles`. No RLS.

### `identity.user_roles` *(pure junction — composite PK exception)*
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| user_id | uuid | no | — | FK → `users(id)` `ON DELETE CASCADE` |
| role_id | uuid | no | — | FK → `roles(id)` `ON DELETE RESTRICT` |
| granted_by_user_id | uuid | yes | null | FK → `users(id)` `ON DELETE SET NULL` |
| created_at | timestamptz | no | now() | |

PK: composite `(user_id, role_id)`. No soft delete — revoking a role is a real delete; the grant/revoke event itself is what `audit.audit_log` is for.

### `identity.sessions`
**Purpose:** refresh-token store — makes sessions revocable and rotatable (fixes the current system's single-JWT-can't-be-invalidated gap; ARCHITECTURE.md §5).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| user_id | uuid | no | — | FK → `users(id)` `ON DELETE CASCADE` |
| refresh_token_hash | text | no | — | hash only, never the raw token |
| device_label | text | yes | null | |
| ip_address | inet | yes | null | |
| rotated_from_session_id | uuid | yes | null | FK → `sessions(id)` `ON DELETE SET NULL`; rotation chain for reuse detection |
| expires_at | timestamptz | no | — | |
| revoked_at | timestamptz | yes | null | |
| created_at / updated_at | timestamptz | — | — | |

Unique: `(refresh_token_hash)`. Indexes: `idx_sessions_user_id`, `idx_sessions_expires_at` (cleanup sweep). No soft delete — `revoked_at` already expresses the lifecycle; a second flag would be redundant. No RLS (accessed only by the auth service).

### `identity.password_reset_tokens` / `identity.email_verification_tokens`
**Purpose:** single-use, short-lived tokens for the reset and verification flows — both currently entirely missing from the live system.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| user_id | uuid | no | — | FK → `users(id)` `ON DELETE CASCADE` |
| token_hash | text | no | — | unique |
| expires_at | timestamptz | no | — | |
| used_at | timestamptz | yes | null | |
| created_at | timestamptz | no | now() | |

Unique: `(token_hash)`. No `updated_at`/soft delete — immutable, naturally short-lived, purged by a cleanup job once expired.

---

## 4. `catalog` schema

### `catalog.categories`
**Purpose:** product taxonomy. Self-referencing to support subcategories — flat today, but the current 1-level design would be a real migration pain to add later, so the hierarchy is built in now at near-zero cost.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| parent_category_id | uuid | yes | null | FK → `categories(id)` `ON DELETE SET NULL` |
| name | text | no | — | |
| slug | text | no | — | |
| description | text | yes | null | (no more `''` sentinel — proper NULL) |
| icon | text | yes | null | |
| image_url | text | yes | null | |
| display_order | integer | no | 0 | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Constraints: `CHECK (parent_category_id IS DISTINCT FROM id)`.
Unique indexes: partial unique `(slug) WHERE deleted_at IS NULL`, partial unique `(name) WHERE deleted_at IS NULL`.
Indexes: `idx_categories_parent_category_id`.
Soft delete: yes. Sensitive (audited): yes.

### `catalog.brands`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| name | text | no | — | |
| slug | text | no | — | |
| logo_url | text | yes | null | |
| website | text | yes | null | |
| description | text | yes | null | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Unique indexes: partial unique `(slug) WHERE deleted_at IS NULL`, partial unique `(name) WHERE deleted_at IS NULL`.
Soft delete: yes. Sensitive: yes.

### `catalog.products`
**Purpose:** sellable SKU — commerce fields plus the solar-specific technical attributes carried over 1:1 from the current model.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| category_id | uuid | no | — | FK → `categories(id)` `ON DELETE RESTRICT` |
| brand_id | uuid | yes | null | FK → `brands(id)` `ON DELETE SET NULL` |
| name | text | no | — | |
| slug | text | no | — | |
| sku | text | no | — | |
| description | text | yes | null | |
| price | numeric(12,2) | no | — | `CHECK (price >= 0)` |
| compare_at_price | numeric(12,2) | yes | null | `CHECK (compare_at_price IS NULL OR compare_at_price >= 0)` |
| currency_code | char(3) | no | 'AUD' | |
| stock_quantity | integer | no | 0 | `CHECK (stock_quantity >= 0)` — **cached read** from the `inventory.stock_items` aggregate. When the inventory module is active, this column is a denormalized `SUM(quantity_on_hand) WHERE warehouse_id IN (...)` updated by the same reconciliation job that maintains `stock_items`. When inventory is single-warehouse (current state), this column IS the source of truth and `stock_items` is unused. The migration path: start with `stock_quantity` only, add `stock_items`/`stock_movements` when multi-warehouse is needed, keep `stock_quantity` as a fast-read cache refreshed by the reconciliation job. See §10 item 2. |
| wattage | numeric(8,2) | yes | null | |
| cell_type | cell_type_enum | yes | null | `NULL` = not applicable, not `''` |
| technology | text | yes | null | |
| frame_color | text | yes | null | |
| cell_number | text | yes | null | |
| manufacturer | text | yes | null | |
| efficiency | numeric(5,2) | yes | null | e.g. 22.10 for 22.1% — numeric so it sorts correctly, unlike text "9.5" which would sort after "22.1" |
| warranty | text | yes | null | |
| datasheet_url | text | yes | null | |
| is_featured | boolean | no | false | |
| is_active | boolean | no | true | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Unique indexes: partial unique `(slug) WHERE deleted_at IS NULL`, partial unique `(sku) WHERE deleted_at IS NULL`.
Indexes: `idx_products_category_id`, `idx_products_brand_id`, `idx_products_is_featured WHERE is_featured`, `idx_products_is_active`, `idx_products_category_technology (category_id, technology)`, `idx_products_category_cell_type (category_id, cell_type)`, `idx_products_wattage`, GIN index `idx_products_search_gin` on `to_tsvector('english', name || ' ' || coalesce(description,''))`.
Foreign keys/cascade: `category_id RESTRICT` (must reassign products before deleting a category); `brand_id SET NULL`.
Soft delete: yes — and **structurally can't be hard-deleted** once referenced by any `order_items` row (`RESTRICT` there, §6) — this is deliberate: it makes "you can only soft-delete a product with sales history" a database-enforced guarantee, not just a code convention.
Sensitive: yes.

### `catalog.product_images`
**Purpose:** ordered images, replacing the Mongo `images: [String]` array — a child table supports per-image ordering/alt-text that a bare string array couldn't.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| product_id | uuid | no | — | FK → `products(id)` `ON DELETE CASCADE` |
| url | text | no | — | |
| alt_text | text | yes | null | |
| display_order | integer | no | 0 | |
| created_at / updated_at | timestamptz | — | — | |

Indexes: `idx_product_images_product_id`. No soft delete — fully owned by the product, no independent lifecycle worth preserving.

---

## 5. `commerce` schema

### `commerce.carts`
**Purpose:** one active working cart per user. Ephemeral, not historical — no audit, no soft delete.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| user_id | uuid | no | — | unique, FK → `identity.users(id)` `ON DELETE CASCADE` |
| created_at / updated_at | timestamptz | — | — | |

### `commerce.cart_items`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| cart_id | uuid | no | — | FK → `carts(id)` `ON DELETE CASCADE` |
| product_id | uuid | no | — | FK → `catalog.products(id)` `ON DELETE RESTRICT` — a product referenced by any active cart cannot be hard-deleted; the application clears stale cart items before product deletion |
| quantity | integer | no | — | `CHECK (quantity > 0)` |
| created_at / updated_at | timestamptz | — | — | |

Unique: `(cart_id, product_id)` — one line per product; quantity accumulates instead of duplicate rows.

### `commerce.orders`
**Purpose:** the financial/legal record of a placed order. Belongs to the **Organization** (the paying entity), with an optional pointer to the individual who placed it — this is the split described in ARCHITECTURE.md §3.1.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK — internal |
| order_number | text | no | — | public-facing sequential number (e.g. `ORD-000123`), generated from a `sequence`, **not** the raw UUID — a UUIDv7 encodes rough creation time and shouldn't be the customer-visible identifier |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE RESTRICT` |
| placed_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| status | order_status_enum | no | 'pending_payment' | |
| currency_code | char(3) | no | 'AUD' | |
| subtotal | numeric(12,2) | no | — | `CHECK (subtotal >= 0)` — GST-exclusive, matches the ex-GST unit prices in `products` |
| tax_rate | numeric(5,4) | no | 0.1000 | Australian GST rate at time of order (snapshotted, not a live lookup) |
| tax_amount | numeric(12,2) | no | — | `subtotal * tax_rate`, stored explicitly for invoice compliance |
| total | numeric(12,2) | no | — | `CHECK (total >= 0)` — GST-inclusive (`subtotal + tax_amount`), the amount the customer pays |
| shipping_address_id | uuid | yes | null | FK → `shared.addresses(id)` `ON DELETE SET NULL` — soft link for UX ("reorder with same address") only |
| shipping_address_snapshot | jsonb | yes | null | **nullable** — `NULL` for pickup/click-and-collect orders where no shipping occurs; immutable copy used for fulfillment when present |
| billing_address_snapshot | jsonb | no | — | immutable copy used for invoicing |
| notes | text | yes | null | customer-visible notes included on order confirmation |
| internal_notes | text | yes | null | staff-only notes, never shown to customer |
| stripe_checkout_session_id | text | yes | null | |
| stripe_payment_intent_id | text | yes | null | |
| placed_at | timestamptz | no | now() | |
| updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` — staff who last changed status |
| created_at / updated_at | timestamptz | — | — | **no `deleted_at`** — see below |

Unique indexes: `(order_number)`.
Indexes: `idx_orders_organization_id_placed_at (organization_id, placed_at DESC)`, `idx_orders_status`, `idx_orders_stripe_payment_intent_id`.
Foreign keys/cascade: `organization_id RESTRICT`, `placed_by_user_id SET NULL`, `shipping_address_id SET NULL`.
Soft delete: **none, ever** — cancellation is `status = 'cancelled'`, not a delete. Enforcement mechanism: `order_items.order_id` is `ON DELETE RESTRICT`, and every order always has at least one item, which means an order can never be deleted at the database level at all without first manually deleting its items — a path the application never takes. This is the DB-level guarantee behind "orders are never deleted," not just a code-review convention.
Sensitive: yes.

### `commerce.order_items`
**Purpose:** immutable line items, preserving the existing (correct) "snapshot at time of order" pattern from the current Mongoose model — never trust a live product price for a historical record.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| order_id | uuid | no | — | FK → `orders(id)` `ON DELETE RESTRICT` |
| product_id | uuid | no | — | FK → `catalog.products(id)` `ON DELETE RESTRICT` — see products note above |
| product_name_snapshot | text | no | — | |
| product_sku_snapshot | text | no | — | |
| unit_price_snapshot | numeric(12,2) | no | — | `CHECK (>= 0)` |
| quantity | integer | no | — | `CHECK (quantity > 0)` |
| line_total | numeric(12,2) | no | — | `CHECK (>= 0)` |
| created_at | timestamptz | no | now() | |

Indexes: `idx_order_items_order_id`, `idx_order_items_product_id`.
**No `updated_at`, no soft delete, by design** — a placed line item is immutable; a correction is a new order or a credit note, never an `UPDATE` on financial history.

### `commerce.favourites`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| user_id | uuid | no | — | FK → `identity.users(id)` `ON DELETE CASCADE` |
| product_id | uuid | no | — | FK → `catalog.products(id)` `ON DELETE CASCADE` |
| created_at | timestamptz | no | now() | |

Unique: `(user_id, product_id)`. No soft delete — "unfavouriting" is a real delete, no historical value.

---

## 6. `crm` schema (future — designed now per the roadmap)

### `crm.contacts`
**Purpose:** a person at an organization for sales/relationship purposes — **not** every contact has portal login (`linked_user_id` is null until/unless one is granted).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE CASCADE` |
| linked_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| full_name | text | no | — | |
| email | text | yes | null | |
| phone | text | yes | null | |
| job_title | text | yes | null | |
| is_primary | boolean | no | false | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Unique indexes: partial unique `(organization_id, lower(email)) WHERE deleted_at IS NULL AND email IS NOT NULL`.
Indexes: `idx_contacts_organization_id`, `idx_contacts_linked_user_id`.
Soft delete: yes. Sensitive: yes.

### `crm.leads`
**Purpose:** a pre-qualification prospect — may not correspond to a real `Organization` yet. Captures the raw signup/inbound-interest fields (including the current system's `hearAboutUs`/`installations` questions) that don't belong permanently on `Organization` (§10 review).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | yes | null | FK → `identity.organizations(id)` `ON DELETE SET NULL` — populated on conversion |
| company_name_raw | text | yes | null | |
| contact_name_raw | text | yes | null | |
| email_raw | text | yes | null | |
| phone_raw | text | yes | null | |
| source | text | yes | null | (was `hearAboutUs`) |
| installs_per_week_raw | text | yes | null | (was `installations`) — a point-in-time answer, not a durable org fact |
| status | lead_status_enum | no | 'new' | |
| owner_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| converted_at | timestamptz | yes | null | |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Indexes: `idx_leads_status`, `idx_leads_owner_user_id`.
Unique indexes: partial unique `(lower(email_raw)) WHERE deleted_at IS NULL AND email_raw IS NOT NULL` (`uq_leads_email_active`) — prevents duplicate active leads for the same email.
Soft delete: yes. Sensitive: yes.

### `crm.opportunities`
**Purpose:** an active sales pipeline record against a qualified organization.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE CASCADE` |
| primary_contact_id | uuid | yes | null | FK → `crm.contacts(id)` `ON DELETE SET NULL` |
| owner_user_id | uuid | no | — | FK → `identity.users(id)` `ON DELETE RESTRICT` — every deal must have an accountable owner; reassign before removing a rep |
| stage | opportunity_stage_enum | no | 'prospecting' | |
| estimated_value | numeric(12,2) | yes | null | |
| currency_code | char(3) | no | 'AUD' | |
| expected_close_date | date | yes | null | |
| closed_at | timestamptz | yes | null | |
| lost_reason | text | yes | null | |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Indexes: `idx_opportunities_organization_id`, `idx_opportunities_owner_user_id`, `idx_opportunities_stage`.
Soft delete: yes. Sensitive: yes.

### `crm.quotes`
**Purpose:** a versioned, time-bound price offer; converts into an `Order` on acceptance using the same snapshot discipline as `order_items`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE RESTRICT` |
| opportunity_id | uuid | yes | null | FK → `crm.opportunities(id)` `ON DELETE SET NULL` |
| quote_number | text | no | — | unique |
| version | integer | no | 1 | |
| status | quote_status_enum | no | 'draft' | |
| valid_until | date | yes | null | |
| subtotal | numeric(12,2) | no | 0 | |
| total | numeric(12,2) | no | 0 | |
| currency_code | char(3) | no | 'AUD' | |
| converted_order_id | uuid | yes | null | FK → `commerce.orders(id)` `ON DELETE SET NULL` |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Indexes: `idx_quotes_organization_id`, `idx_quotes_opportunity_id`, `idx_quotes_status`.
Soft delete: yes, but **only while `status = 'draft'`** — application logic (ideally backed by a trigger, see §10) should block soft-delete/edit once `sent`/`accepted`/`converted`. Sensitive: yes.

### `crm.quote_items`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| quote_id | uuid | no | — | FK → `crm.quotes(id)` `ON DELETE CASCADE` |
| product_id | uuid | no | — | FK → `catalog.products(id)` `ON DELETE RESTRICT` |
| product_name_snapshot | text | no | — | |
| unit_price_snapshot | numeric(12,2) | no | — | |
| quantity | integer | no | — | `CHECK (quantity > 0)` |
| line_total | numeric(12,2) | no | — | |
| created_at / updated_at | timestamptz | — | — | mutable while quote is a draft |

Indexes: `idx_quote_items_quote_id`.

### `crm.activities`
**Purpose:** unified, polymorphic timeline entry (call/email/meeting/note/task) against any CRM entity — one generic table instead of a bespoke notes table per entity type.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| entity_type | text | no | — | `CHECK (entity_type IN ('organization','contact','lead','opportunity','quote'))` |
| entity_id | uuid | no | — | **no FK** — polymorphic, see §10 |
| activity_type | activity_type_enum | no | — | |
| subject | text | yes | null | |
| body | text | yes | null | |
| due_at | timestamptz | yes | null | |
| completed_at | timestamptz | yes | null | |
| owner_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Indexes: `idx_activities_entity (entity_type, entity_id)`, `idx_activities_owner_user_id`, `idx_activities_due_at`.
Soft delete: yes.

---

## 7. `inventory` schema (future)

### `inventory.warehouses`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| name | text | no | — | |
| code | text | no | — | unique |
| address_id | uuid | no | — | FK → `shared.addresses(id)` `ON DELETE RESTRICT` |
| is_active | boolean | no | true | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Soft delete: yes.

### `inventory.stock_items`
**Purpose:** current on-hand/reserved quantity per product per warehouse — a **read model**; historical truth lives in `stock_movements` below.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| warehouse_id | uuid | no | — | FK → `warehouses(id)` `ON DELETE CASCADE` |
| product_id | uuid | no | — | FK → `catalog.products(id)` `ON DELETE RESTRICT` |
| quantity_on_hand | integer | no | 0 | `CHECK (>= 0)` |
| quantity_reserved | integer | no | 0 | `CHECK (>= 0)` |
| reorder_point | integer | no | 0 | |
| version | integer | no | 1 | optimistic-concurrency column — see §10 |
| created_at / updated_at | timestamptz | — | — | |

Unique: `(warehouse_id, product_id)`. No soft delete — no historical value in the row itself; movements retain history.

### `inventory.stock_movements`
**Purpose:** append-only ledger of every stock change — the actual source of truth, mirroring the credit-ledger pattern for the same correctness reasons (§13 of ARCHITECTURE.md).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| warehouse_id | uuid | no | — | FK → `warehouses(id)` `ON DELETE RESTRICT` |
| product_id | uuid | no | — | FK → `catalog.products(id)` `ON DELETE RESTRICT` |
| movement_type | stock_movement_type_enum | no | — | |
| quantity_delta | integer | no | — | `CHECK (quantity_delta <> 0)` |
| reference_type | text | yes | null | e.g. `'order'`, `'purchase_order'` — no FK, polymorphic (§10) |
| reference_id | uuid | yes | null | |
| note | text | yes | null | |
| created_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at | timestamptz | no | now() | |

**No `updated_at`, no soft delete** — append-only; a mistaken movement is corrected with a new offsetting movement, never edited.
Indexes: `idx_stock_movements_warehouse_product (warehouse_id, product_id, created_at)`, `idx_stock_movements_reference (reference_type, reference_id)`.

### `inventory.installers`
**Purpose:** installer businesses, modeled as a `type = 'partner'` `Organization` rather than a duplicate company/contact/address structure.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | unique, FK → `identity.organizations(id)` `ON DELETE CASCADE` |
| license_number | text | yes | null | |
| certification_expiry | date | yes | null | |
| service_radius_km | integer | yes | null | |
| status | installer_status_enum | no | 'pending_approval' | |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Soft delete: yes.

### `inventory.installation_jobs`
**Purpose:** operational bridge linking a placed order to an assigned installer.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| order_id | uuid | no | — | FK → `commerce.orders(id)` `ON DELETE RESTRICT` |
| installer_id | uuid | yes | null | FK → `inventory.installers(id)` `ON DELETE SET NULL` |
| status | installation_job_status_enum | no | 'scheduled' | |
| scheduled_date | date | yes | null | |
| completed_at | timestamptz | yes | null | |
| notes | text | yes | null | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Indexes: `idx_installation_jobs_order_id`, `idx_installation_jobs_installer_id`, `idx_installation_jobs_status`.
Soft delete: yes (cancellation is `status`; soft delete covers "created in error").

---

## 8. `billing` schema (future)

### `billing.credit_accounts`
**Purpose:** one credit facility per organization. `cached_balance` is a derived, recomputable read — the ledger below is the source of truth.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | unique, FK → `identity.organizations(id)` `ON DELETE RESTRICT` |
| credit_limit | numeric(12,2) | no | 0 | `CHECK (>= 0)` |
| currency_code | char(3) | no | 'AUD' | |
| cached_balance | numeric(12,2) | no | 0 | derived from `credit_ledger_entries`, not authoritative — see §10 |
| status | credit_account_status_enum | no | 'active' | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at / deleted_at | timestamptz | — | — | |

Soft delete: yes. Sensitive: yes.

**Closure guard:** Before closing (`status = 'closed'`) or soft-deleting a credit account, application code must verify `cached_balance = 0` — an organization with an outstanding balance cannot have its credit facility removed. This is enforced at the application level (Prisma middleware or service-layer guard), not by a DB constraint, because `cached_balance` is a derived value and a `CHECK` referencing a sum across another table isn't possible in Postgres.

### `billing.credit_ledger_entries`
**Purpose:** append-only debit/credit ledger — the actual source of truth for balance.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| credit_account_id | uuid | no | — | FK → `billing.credit_accounts(id)` `ON DELETE RESTRICT` |
| entry_type | credit_ledger_entry_type_enum | no | — | |
| amount | numeric(12,2) | no | — | `CHECK (amount <> 0)`; sign convention: positive = charge (increases owed balance), negative = payment/credit |
| reference_type | text | yes | null | polymorphic, no FK |
| reference_id | uuid | yes | null | |
| description | text | yes | null | |
| created_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at | timestamptz | no | now() | |

**No `updated_at`, no soft delete** — append-only; a correction is a new offsetting entry.
Indexes: `idx_credit_ledger_entries_account_id_created_at`.

### `billing.invoices`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE RESTRICT` |
| order_id | uuid | yes | null | FK → `commerce.orders(id)` `ON DELETE SET NULL` |
| invoice_number | text | no | — | unique |
| status | invoice_status_enum | no | 'draft' | |
| currency_code | char(3) | no | 'AUD' | |
| subtotal | numeric(12,2) | no | — | GST-exclusive |
| tax_rate | numeric(5,4) | no | 0.1000 | Australian GST rate at time of invoicing |
| tax_total | numeric(12,2) | no | 0 | `subtotal * tax_rate` |
| total | numeric(12,2) | no | — | GST-inclusive (`subtotal + tax_total`) |
| due_date | date | yes | null | |
| issued_at / paid_at | timestamptz | yes | null | |
| created_by_user_id / updated_by_user_id | uuid | yes | null | FK → `identity.users(id)` `ON DELETE SET NULL` |
| created_at / updated_at | timestamptz | — | — | **no `deleted_at`** — a mistaken invoice is voided (`status = 'void'`), never deleted |

Indexes: `idx_invoices_organization_id`, `idx_invoices_status`, `idx_invoices_order_id`.
Sensitive: yes. Enforcement: `invoice_items.invoice_id ON DELETE RESTRICT` (below) makes hard-deleting an invoice structurally impossible, same mechanism as `orders`.

### `billing.invoice_items`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| invoice_id | uuid | no | — | FK → `billing.invoices(id)` `ON DELETE RESTRICT` |
| description | text | no | — | |
| quantity | integer | no | — | `CHECK (> 0)` |
| unit_price | numeric(12,2) | no | — | |
| line_total | numeric(12,2) | no | — | |
| created_at | timestamptz | no | now() | |

**No `updated_at`, no soft delete** — immutable, same discipline as `order_items`.

### `billing.payments`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| organization_id | uuid | no | — | FK → `identity.organizations(id)` `ON DELETE RESTRICT` |
| order_id | uuid | yes | null | FK → `commerce.orders(id)` `ON DELETE SET NULL` |
| invoice_id | uuid | yes | null | FK → `billing.invoices(id)` `ON DELETE SET NULL` |
| refunded_payment_id | uuid | yes | null | FK → `billing.payments(id)` `ON DELETE SET NULL` — a refund is a new row pointing back at the original, not a mutation of it |
| amount | numeric(12,2) | no | — | `CHECK (> 0)` |
| currency_code | char(3) | no | 'AUD' | |
| method | payment_method_enum | no | — | |
| status | payment_status_enum | no | 'pending' | |
| stripe_payment_intent_id | text | yes | null | |
| stripe_charge_id | text | yes | null | |
| failure_reason | text | yes | null | |
| created_at / updated_at | timestamptz | — | — | **no `deleted_at`** — payments are never deleted |

Indexes: `idx_payments_organization_id`, `idx_payments_order_id`, `idx_payments_invoice_id`, `idx_payments_stripe_payment_intent_id`. Sensitive: yes.

---

## 9. `audit` schema

### `audit.audit_log`
**Purpose:** immutable "who did what to what, when" record — compliance and dispute resolution, distinct from application logs (ARCHITECTURE.md §11).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | uuid_generate_v7() | PK |
| actor_id | uuid | yes | null | **no FK, intentionally** — see §10 |
| actor_type | audit_actor_type_enum | no | — | |
| organization_id | uuid | yes | null | denormalized for fast per-org audit queries; **no FK, intentionally** |
| action | text | no | — | e.g. `'create'`, `'update'`, `'soft_delete'`, `'status_change'` |
| entity_type | text | no | — | |
| entity_id | uuid | no | — | |
| before_data | jsonb | yes | null | |
| after_data | jsonb | yes | null | |
| ip_address | inet | yes | null | |
| user_agent | text | yes | null | |
| created_at | timestamptz | no | now() | |

Indexes: `idx_audit_log_entity (entity_type, entity_id, created_at)`, `idx_audit_log_organization_id_created_at`, `idx_audit_log_actor_id`.
**No `updated_at`, no soft delete** — append-only by definition, enforced via `REVOKE UPDATE, DELETE` on the application's runtime role (only `INSERT`/`SELECT` granted). Candidate for time-range partitioning once volume warrants it (ARCHITECTURE.md §15) — not needed at launch.

---

## 10. Staff Database Engineer Review — weaknesses before proceeding

This is a genuine pre-implementation review, not a rubber stamp. Grouped by severity.

### Must address before writing migrations

1. **Organization erasure is not actually possible, and that's a compliance gap, not just a design choice.** `organizations` is soft-delete-only, and every financial table (`orders`, `invoices`, `payments`, `credit_accounts`, `quotes`) references it with `ON DELETE RESTRICT`. That means once an organization has placed a single order, the row can **never** be hard-deleted — full stop, forever. That's correct for financial-record integrity, but if there's ever a genuine right-to-erasure obligation (Australian Privacy Act, or a customer demanding deletion), "soft delete" does not satisfy it — soft-deleted data still physically exists. This schema needs an explicit **anonymization procedure** (null out PII columns — `legal_name`, contact emails/phones on linked `users`/`contacts` — while leaving the row and its financial FKs intact) as a designed operation, not an assumption that soft-delete already covers this. Flagging now because retrofitting an anonymization path after real customer data exists is much more painful than designing it in from day one.

2. **`stock_items` and `credit_accounts.cached_balance` are denormalized caches with no reconciliation mechanism.** Both are explicitly documented as "derived, not authoritative," but nothing in this design *checks* that the cache still agrees with its source of truth (`stock_movements`, `credit_ledger_entries`). Any code path that updates the cache outside its transaction, or a bug, or a bad backfill, causes silent drift that's invisible until a customer disputes a balance or a warehouse audit finds a mismatch. This needs a scheduled reconciliation job (recompute from the ledger, compare, alert on any drift) as a required piece of operational tooling — not optional, not "nice to have" — before either module ships. For `products.stock_quantity` specifically, the migration path is now clarified in the column docs above: start with `stock_quantity` as the sole source of truth in single-warehouse mode, add `stock_items`/`stock_movements` only when multi-warehouse is needed, keep `stock_quantity` as a fast-read cache refreshed by the reconciliation job at that point.

3. **`stock_items` has no real concurrency-safe update path designed yet.** I added a `version` column for optimistic concurrency, but that's a schema hook, not a guarantee — nothing here specifies whether stock decrements use `SELECT ... FOR UPDATE` or the version check, and a flash-sale-style concurrency spike on a popular panel will find whichever gap exists. This needs to be nailed down as an explicit transaction pattern (ARCHITECTURE.md §13 already covers this for `orders`, but the inventory module's own read-modify-write on `stock_items` needs the same rigor spelled out, not inherited by assumption.

4. **Tax/GST modeling is now explicit — but still needs finance sign-off.** The schema now declares the GST convention in §0 (ex-GST unit prices, GST-inclusive totals, snapshotted `tax_rate` on orders and invoices). For Australia-only B2B where every sale is GST-registered, this is mechanically correct. However, the actual rate (0.1000), the treatment of GST-free exports, and the invoice layout requirements for valid tax invoices under ATO rules all need confirmation from someone with Australian tax compliance expertise before the billing module ships. This is *designed*, not guessed — but it's still not *signed off*.

### Real trade-offs, accepted but worth knowing about

5. **Polymorphic associations (`crm.activities.entity_id`, `stock_movements.reference_id`, `credit_ledger_entries.reference_id`, `audit_log.entity_id`/`actor_id`) have no foreign key at all.** Postgres can't enforce "this UUID actually points at a row in one of these five tables" — a typo'd `entity_type` or an orphaned `entity_id` is silently possible and invisible until a query joins against it and finds nothing. The alternative (a separate join table per entity type — `opportunity_activities`, `lead_activities`, etc.) buys back real referential integrity at the cost of N tables instead of one generic one. I chose the generic table deliberately for a CRM activity feed (that's the standard shape), but it's a real integrity gap, not a free lunch — worth a periodic integrity-check job (a query that finds orphaned polymorphic references) as a cheap mitigation, and worth revisiting per-entity tables if this table ever becomes a debugging pain point.

6. **Two separate RBAC systems — `organization_members.role` (customer-portal, per-org) and `identity.roles`/`user_roles` (platform staff, global) — add conceptual overhead.** A new engineer will reasonably ask "why are there two role systems instead of one." The honest answer is they model genuinely different things (a customer's permission level on their own account vs. an internal employee's platform-wide job function), but it's worth writing that down explicitly somewhere visible (this document, or a short ADR) so it doesn't get "simplified" into one confused system by someone who doesn't have the context. There's also a real risk this is premature structure — if `identity.roles` only ever holds five static rows for years, a simple enum (like `organization_member_role_enum`) would have done the job with less machinery. Kept the table because the brief explicitly asked for 5-year/CRM-scale thinking and staff roles are more likely to actually grow (territory-based sales roles, regional warehouse managers), but flagging the YAGNI risk honestly rather than pretending it's obviously correct.

7. **`shipping_address_snapshot`/`billing_address_snapshot` as JSONB sacrifice SQL-level queryability.** "Find all orders shipped to postcode X" needs a JSON operator (`->>'postcode'`) instead of a plain indexed column. This was a deliberate simplicity trade-off (matches the original embedded-document shape, avoids a wide table of `shipping_line1`, `shipping_city`, etc. columns), but if logistics/fulfillment reporting ever needs this at real query volume, the fix is cheap: a Postgres **generated column** (`GENERATED ALWAYS AS (shipping_address_snapshot->>'postcode') STORED`) with its own index, added later without touching the JSONB column itself.

8. **Multi-currency support is declared (`currency_code` on every monetary table) but not actually designed.** There's no exchange-rate-at-time-of-transaction table, no conversion logic, nothing beyond "store which currency this amount is in." That's fine and correct for a single-currency (AUD) business today, but if the platform ever genuinely transacts in more than one currency, this schema does *not* solve that — it just doesn't block it. Don't mistake the presence of a `currency_code` column for "multi-currency ready"; it isn't, yet.

9. **`identity.users` deletion is realistically blocked for any user who has done anything meaningful** (owns an opportunity — `RESTRICT`, is an active org member, created records referenced elsewhere) even though `deleted_at` exists on the table. This is correct behavior, but it's non-obvious from the schema alone that "delete a user" only really works for a brand-new, unused account — worth documenting explicitly so nobody builds a "delete my account" feature assuming it will just work generically, and designs the anonymization path from point 1 for the realistic case instead.

### Genuine design flaw I'm fixing here, not carrying forward

10. **`crm.leads` originally had both `organization_id` and a separate `converted_organization_id` column** in an earlier pass of this design — pure redundant duplication, since a lead either hasn't converted (`organization_id` null) or has (`organization_id` populated, `status = 'converted'`, `converted_at` set). I collapsed it to a single `organization_id` column above rather than shipping two columns that could disagree with each other. Flagging this explicitly as the kind of thing a schema review should catch before migration, not after — it's exactly the sort of small redundancy that's cheap to fix now and mildly annoying to fix once there's data in both columns.

### Issues found and resolved during architecture review (post-self-review)

11. **`cart_items.product_id ON DELETE CASCADE` was too aggressive.** If a product is hard-deleted (possible if it has no order history), any active cart items referencing it would silently vanish — confusing for a user who added it moments ago. **Resolved:** Changed to `ON DELETE RESTRICT`. The application clears stale cart items before product deletion or handles the FK error gracefully.

12. **`crm.leads.email_raw` had no uniqueness constraint.** A lead could be created multiple times with the same email, producing duplicate CRM records that sales staff would have to manually deduplicate. **Resolved:** Added partial unique index `uq_leads_email_active` on `(lower(email_raw)) WHERE deleted_at IS NULL AND email_raw IS NOT NULL`.

13. **`catalog.products.efficiency` was `text` — sorts incorrectly.** Text-typed "9.5" sorts AFTER "22.1" because of lexicographic ordering, breaking any UI that sorts or filters by efficiency. Since solar panel efficiency is a first-class filter dimension in this product catalog, getting the sort order wrong is a real UX defect. **Resolved:** Changed to `numeric(5,2)`. The seed data format "22.1%" is stored as `22.10` and formatted with a `%` suffix at display time.

14. **Single-column indexes on `technology` and `cell_type` were low-value.** Both columns have only 2–5 distinct values across the entire catalog. The actual query pattern (seen in the live products API) always composes these filters with `category_id` — a query like `WHERE category_id = $1 AND cell_type = 'n_type' AND is_active = true`. A composite index `(category_id, cell_type)` serves both the category-only path AND the filtered path; a single-column index on `cell_type` alone serves neither efficiently. **Resolved:** Replaced with `idx_products_category_technology (category_id, technology)` and `idx_products_category_cell_type (category_id, cell_type)`.

15. **`commerce.orders` had no notes columns.** Order management workflows universally need at least a customer-visible note ("Please deliver to rear entrance") and a staff-only internal note ("Called customer, confirmed stock arrival next Tuesday"). **Resolved:** Added `notes` (customer-visible) and `internal_notes` (staff-only).

16. **`shipping_address_snapshot` was `NOT NULL` — blocks pickup orders.** Not every order ships. Pickup/click-and-collect orders have no shipping address. **Resolved:** Made `NULL`-able with documentation that `NULL` = pickup.

17. **No balance check before credit account closure.** An organization with an outstanding balance of $5,000 could have its credit account closed, removing the credit limit but leaving the debt — the ledger entries remain but the account is gone. **Resolved:** Added explicit closure guard in application-layer documentation (can't be a DB constraint since `cached_balance` is derived across the ledger table).

18. **No discount mechanism on orders or order_items.** Promotional discounts, volume pricing, and negotiated rates all need somewhere to live. This is a real e-commerce gap but the right design depends on business rules (percentage vs fixed, per-item vs cart-level, coupon codes vs automatic tiers). **Not resolved in this pass** — needs product/BD input before designing. Flagging so it's not forgotten, not because the design is wrong.

**Recommendation:** items 1–4 above should be resolved (or explicitly, consciously deferred with a named owner and a date) before Prisma models are generated from this design — they're not stylistic nits, they're either compliance exposure (1), silent-data-corruption risk (2, 3), or "needs expert sign-off" (4). Items 5–18 are either informed trade-offs worth a one-paragraph ADR each (5–9), already resolved in this review (10–17), or deferred pending business input (18).
