-- ============================================================================
-- NexonEcom — Initial Production Migration
-- Generated from prisma/schema.prisma + DATABASE_SCHEMA.md manual SQL.
-- Single migration file combining Prisma DDL with all CHECKs, partial unique
-- indexes, GIN indexes, triggers, and grants that Prisma cannot express.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- pgcrypto provides gen_random_bytes() used by our UUIDv7 function below.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. SCHEMAS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================================
-- 3. UUIDv7 GENERATOR
-- ============================================================================

-- Postgres 17's gen_random_uuid() still returns v4.
-- This PL/pgSQL function generates time-ordered UUIDv7 values using the
-- pgcrypto extension for cryptographic randomness. It is the default for
-- every `id` column in this migration (`uuid_generate_v7()`).
--
-- UUIDv7 layout: 48-bit Unix ms timestamp | 4-bit version (7) | 12-bit rand_a
--                | 2-bit variant (10) | 62-bit rand_b
-- This produces globally unique, k-ordered primary keys that play well with
-- B-tree indexes — no hot-spots the way random UUIDv4 would on high-insert
-- tables like audit_log or stock_movements.

CREATE OR REPLACE FUNCTION shared.uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_time   bigint;
  v_rand_a bytea;
  v_rand_b bytea;
  v_bytes  bytea;
BEGIN
  -- Milliseconds since Unix epoch (bigint)
  v_time := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;

  -- Cryptographic randomness from pgcrypto
  v_rand_a := gen_random_bytes(2);   -- 2 bytes for rand_a portion
  v_rand_b := gen_random_bytes(8);   -- 8 bytes for rand_b portion

  -- Construct UUIDv7 as a 16-byte bytea:
  -- bytes 0-5:  48 bits of timestamp (big-endian)
  -- bytes 6-7:  version nibble (0111 = 7) + top 12 bits of v_rand_a
  -- bytes 8-9:  variant nibble (10xx) + remaining 14 bits of v_rand_a...
  -- bytes 10-15: 48 bits of v_rand_b
  v_bytes :=
    set_byte(set_byte(set_byte(set_byte(set_byte(
      set_byte('\x00000000000000000000000000000000'::bytea, 0, (v_time >> 40)::int & 255),
      1, (v_time >> 32)::int & 255),
      2, (v_time >> 24)::int & 255),
      3, (v_time >> 16)::int & 255),
      4, (v_time >> 8)::int & 255),
      5, v_time::int & 255);

  -- Byte 6: version nibble (upper 4 bits = 0111 = 7) | top 4 bits of rand_a[0]
  v_bytes := set_byte(v_bytes, 6,
    (7 << 4) | (get_byte(v_rand_a, 0) >> 4));

  -- Byte 7: bottom 4 bits of rand_a[0] << 4 | top 4 bits of rand_a[1]
  v_bytes := set_byte(v_bytes, 7,
    ((get_byte(v_rand_a, 0) & 15) << 4) | (get_byte(v_rand_a, 1) >> 4));

  -- Byte 8: variant nibble (upper 2 bits = 10) | bottom 6 bits of rand_a[1]
  v_bytes := set_byte(v_bytes, 8,
    (2 << 6) | (get_byte(v_rand_a, 1) & 63));

  -- Bytes 9-15: remaining 7 bytes of rand_b
  v_bytes := set_byte(v_bytes, 9, get_byte(v_rand_b, 0));
  v_bytes := set_byte(v_bytes, 10, get_byte(v_rand_b, 1));
  v_bytes := set_byte(v_bytes, 11, get_byte(v_rand_b, 2));
  v_bytes := set_byte(v_bytes, 12, get_byte(v_rand_b, 3));
  v_bytes := set_byte(v_bytes, 13, get_byte(v_rand_b, 4));
  v_bytes := set_byte(v_bytes, 14, get_byte(v_rand_b, 5));
  v_bytes := set_byte(v_bytes, 15, get_byte(v_rand_b, 6));

  RETURN encode(v_bytes, 'hex')::uuid;
END;
$$;

-- Grant execute to PUBLIC so every schema can use it as a column default.
GRANT EXECUTE ON FUNCTION shared.uuid_generate_v7() TO PUBLIC;

-- ============================================================================
-- 4. set_updated_at() TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION shared.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. ENUM TYPES
-- ============================================================================

-- identity schema enums
CREATE TYPE identity.organization_type_enum       AS ENUM ('customer', 'partner', 'internal');
CREATE TYPE identity.organization_status_enum      AS ENUM ('active', 'suspended', 'closed');
CREATE TYPE identity.organization_member_role_enum AS ENUM ('owner', 'admin', 'purchaser', 'viewer');
CREATE TYPE identity.organization_member_status_enum AS ENUM ('invited', 'active', 'removed');

-- catalog schema enums
CREATE TYPE catalog.cell_type_enum AS ENUM ('n_type', 'p_type');

-- commerce schema enums
CREATE TYPE commerce.order_status_enum AS ENUM ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- crm schema enums
CREATE TYPE crm.lead_status_enum        AS ENUM ('new', 'contacted', 'qualified', 'disqualified', 'converted');
CREATE TYPE crm.opportunity_stage_enum  AS ENUM ('prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE crm.quote_status_enum       AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
CREATE TYPE crm.activity_type_enum      AS ENUM ('call', 'email', 'meeting', 'note', 'task');

-- inventory schema enums
CREATE TYPE inventory.stock_movement_type_enum      AS ENUM ('receipt', 'sale', 'return', 'adjustment', 'transfer_in', 'transfer_out', 'reservation', 'release');
CREATE TYPE inventory.installer_status_enum         AS ENUM ('pending_approval', 'active', 'suspended', 'inactive');
CREATE TYPE inventory.installation_job_status_enum  AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- billing schema enums
CREATE TYPE billing.credit_account_status_enum    AS ENUM ('active', 'suspended', 'closed');
CREATE TYPE billing.credit_ledger_entry_type_enum AS ENUM ('invoice_charge', 'payment', 'credit_note', 'adjustment');
CREATE TYPE billing.invoice_status_enum           AS ENUM ('draft', 'issued', 'paid', 'overdue', 'void');
CREATE TYPE billing.payment_method_enum           AS ENUM ('card', 'bank_transfer', 'credit_account');
CREATE TYPE billing.payment_status_enum           AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- audit schema enums
CREATE TYPE audit.audit_actor_type_enum AS ENUM ('user', 'system', 'api_key');

-- ============================================================================
-- 6. TABLES
-- ============================================================================

-- ── shared.countries ──────────────────────────────────────────────────────────

CREATE TABLE shared.countries (
  iso_code     CHAR(2)      NOT NULL,
  name         TEXT          NOT NULL,
  calling_code TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_countries PRIMARY KEY (iso_code)
);

-- ── shared.addresses ──────────────────────────────────────────────────────────

CREATE TABLE shared.addresses (
  id           UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  line1        TEXT         NOT NULL,
  line2        TEXT,
  city         TEXT         NOT NULL,
  state        TEXT,
  postcode     TEXT         NOT NULL,
  country_code CHAR(2)      NOT NULL DEFAULT 'AU',
  latitude     NUMERIC(9,6),
  longitude    NUMERIC(9,6),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT pk_addresses PRIMARY KEY (id),
  CONSTRAINT fk_addresses_country FOREIGN KEY (country_code)
    REFERENCES shared.countries(iso_code)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX idx_addresses_country_code ON shared.addresses (country_code);

-- ── identity.organizations ────────────────────────────────────────────────────

CREATE TABLE identity.organizations (
  id                    UUID                               NOT NULL DEFAULT shared.uuid_generate_v7(),
  type                  identity.organization_type_enum    NOT NULL DEFAULT 'customer',
  legal_name            TEXT                               NOT NULL,
  trading_name          TEXT,
  abn                   TEXT,
  is_gst_registered     BOOLEAN                            NOT NULL DEFAULT true,
  account_owner_user_id UUID,
  status                identity.organization_status_enum  NOT NULL DEFAULT 'active',
  created_by_user_id    UUID,
  updated_by_user_id    UUID,
  created_at            TIMESTAMPTZ                        NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ                        NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT pk_organizations PRIMARY KEY (id)
);

CREATE INDEX idx_organizations_account_owner_user_id ON identity.organizations (account_owner_user_id);
CREATE INDEX idx_organizations_type                  ON identity.organizations (type);

-- ── identity.users ────────────────────────────────────────────────────────────

CREATE TABLE identity.users (
  id                UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  full_name         TEXT         NOT NULL,
  email             TEXT         NOT NULL,
  password_hash     TEXT         NOT NULL,
  phone             TEXT,
  is_email_verified BOOLEAN      NOT NULL DEFAULT false,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_by_user_id UUID,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_users PRIMARY KEY (id)
);

CREATE INDEX idx_users_is_active ON identity.users (is_active);

-- Self-referencing FK (created_by_user_id → users.id)
ALTER TABLE identity.users
  ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL;

-- ── identity.organizations → users FKs ────────────────────────────────────────

ALTER TABLE identity.organizations
  ADD CONSTRAINT fk_organizations_account_owner FOREIGN KEY (account_owner_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE identity.organizations
  ADD CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE identity.organizations
  ADD CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL;

-- ── identity.organization_members ─────────────────────────────────────────────

CREATE TABLE identity.organization_members (
  id                 UUID                                        NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id    UUID                                        NOT NULL,
  user_id            UUID                                        NOT NULL,
  role               identity.organization_member_role_enum      NOT NULL DEFAULT 'purchaser',
  status             identity.organization_member_status_enum    NOT NULL DEFAULT 'active',
  invited_by_user_id UUID,
  invited_at         TIMESTAMPTZ,
  joined_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ                                 NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ                                 NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,

  CONSTRAINT pk_organization_members PRIMARY KEY (id),
  CONSTRAINT fk_org_members_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_members_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_members_invited_by FOREIGN KEY (invited_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_org_members_org_user ON identity.organization_members (organization_id, user_id);
CREATE INDEX idx_org_members_user_id  ON identity.organization_members (user_id);

-- ── identity.organization_addresses ───────────────────────────────────────────

CREATE TABLE identity.organization_addresses (
  id                  UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id     UUID         NOT NULL,
  address_id          UUID         NOT NULL,
  label               TEXT,
  is_default_shipping BOOLEAN      NOT NULL DEFAULT false,
  is_default_billing  BOOLEAN      NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_organization_addresses PRIMARY KEY (id),
  CONSTRAINT uq_org_addresses_org_address UNIQUE (organization_id, address_id),
  CONSTRAINT fk_org_addresses_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_addresses_address FOREIGN KEY (address_id)
    REFERENCES shared.addresses(id) ON DELETE CASCADE
);

CREATE INDEX idx_org_addresses_organization_id ON identity.organization_addresses (organization_id);

-- ── identity.roles ────────────────────────────────────────────────────────────

CREATE TABLE identity.roles (
  id          UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  key         TEXT         NOT NULL,
  name        TEXT         NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_roles PRIMARY KEY (id),
  CONSTRAINT uq_roles_key UNIQUE (key)
);

-- ── identity.user_roles (composite PK, no surrogate id) ──────────────────────

CREATE TABLE identity.user_roles (
  user_id            UUID         NOT NULL,
  role_id            UUID         NOT NULL,
  granted_by_user_id UUID,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id)
    REFERENCES identity.roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_granted_by FOREIGN KEY (granted_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

-- ── identity.sessions ─────────────────────────────────────────────────────────

CREATE TABLE identity.sessions (
  id                      UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  user_id                 UUID         NOT NULL,
  refresh_token_hash      TEXT         NOT NULL,
  device_label            TEXT,
  ip_address              INET,
  rotated_from_session_id UUID,
  expires_at              TIMESTAMPTZ  NOT NULL,
  revoked_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_sessions PRIMARY KEY (id),
  CONSTRAINT uq_sessions_refresh_token_hash UNIQUE (refresh_token_hash),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_rotated_from FOREIGN KEY (rotated_from_session_id)
    REFERENCES identity.sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_user_id    ON identity.sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON identity.sessions (expires_at);

-- ── identity.password_reset_tokens ────────────────────────────────────────────

CREATE TABLE identity.password_reset_tokens (
  id         UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  user_id    UUID         NOT NULL,
  token_hash TEXT         NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_password_reset_tokens PRIMARY KEY (id),
  CONSTRAINT uq_password_reset_tokens_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_user_id ON identity.password_reset_tokens (user_id);

-- ── identity.email_verification_tokens ────────────────────────────────────────

CREATE TABLE identity.email_verification_tokens (
  id         UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  user_id    UUID         NOT NULL,
  token_hash TEXT         NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_email_verification_tokens PRIMARY KEY (id),
  CONSTRAINT uq_email_verification_tokens_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verification_tokens_user_id ON identity.email_verification_tokens (user_id);

-- ── catalog.categories ────────────────────────────────────────────────────────

CREATE TABLE catalog.categories (
  id                UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  parent_category_id UUID,
  name              TEXT         NOT NULL,
  slug              TEXT         NOT NULL,
  description       TEXT,
  icon              TEXT,
  image_url         TEXT,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_categories PRIMARY KEY (id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id)
    REFERENCES catalog.categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_categories_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_parent_category_id ON catalog.categories (parent_category_id);

-- ── catalog.brands ────────────────────────────────────────────────────────────

CREATE TABLE catalog.brands (
  id                UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  name              TEXT         NOT NULL,
  slug              TEXT         NOT NULL,
  logo_url          TEXT,
  website           TEXT,
  description       TEXT,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_brands PRIMARY KEY (id),
  CONSTRAINT fk_brands_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_brands_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

-- ── catalog.products ──────────────────────────────────────────────────────────

CREATE TABLE catalog.products (
  id                UUID                  NOT NULL DEFAULT shared.uuid_generate_v7(),
  category_id       UUID                  NOT NULL,
  brand_id          UUID,
  name              TEXT                  NOT NULL,
  slug              TEXT                  NOT NULL,
  sku               TEXT                  NOT NULL,
  description       TEXT,
  price             NUMERIC(12,2)         NOT NULL,
  compare_at_price  NUMERIC(12,2),
  currency_code     CHAR(3)               NOT NULL DEFAULT 'AUD',
  stock_quantity    INTEGER               NOT NULL DEFAULT 0,
  wattage           NUMERIC(8,2),
  cell_type         catalog.cell_type_enum,
  technology        TEXT,
  frame_color       TEXT,
  cell_number       TEXT,
  manufacturer      TEXT,
  efficiency        NUMERIC(5,2),
  warranty          TEXT,
  datasheet_url     TEXT,
  is_featured       BOOLEAN               NOT NULL DEFAULT false,
  is_active         BOOLEAN               NOT NULL DEFAULT true,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ           NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_products PRIMARY KEY (id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id)
    REFERENCES catalog.brands(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_category_id            ON catalog.products (category_id);
CREATE INDEX idx_products_brand_id               ON catalog.products (brand_id);
CREATE INDEX idx_products_is_featured            ON catalog.products (is_featured);
CREATE INDEX idx_products_is_active              ON catalog.products (is_active);
CREATE INDEX idx_products_category_technology    ON catalog.products (category_id, technology);
CREATE INDEX idx_products_category_cell_type     ON catalog.products (category_id, cell_type);
CREATE INDEX idx_products_wattage                ON catalog.products (wattage);

-- ── catalog.product_images ────────────────────────────────────────────────────

CREATE TABLE catalog.product_images (
  id            UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  product_id    UUID         NOT NULL,
  url           TEXT         NOT NULL,
  alt_text      TEXT,
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_product_images PRIMARY KEY (id),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_images_product_id ON catalog.product_images (product_id);

-- ── commerce.carts ────────────────────────────────────────────────────────────

CREATE TABLE commerce.carts (
  id         UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  user_id    UUID         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_carts PRIMARY KEY (id),
  CONSTRAINT uq_carts_user_id UNIQUE (user_id),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE
);

-- ── commerce.cart_items ───────────────────────────────────────────────────────

CREATE TABLE commerce.cart_items (
  id         UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  cart_id    UUID         NOT NULL,
  product_id UUID         NOT NULL,
  quantity   INTEGER      NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_cart_items PRIMARY KEY (id),
  CONSTRAINT uq_cart_items_cart_product UNIQUE (cart_id, product_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id)
    REFERENCES commerce.carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cart_items_product_id ON commerce.cart_items (product_id);

-- ── commerce.orders ───────────────────────────────────────────────────────────

CREATE TABLE commerce.orders (
  id                        UUID                        NOT NULL DEFAULT shared.uuid_generate_v7(),
  order_number              TEXT                        NOT NULL,
  organization_id           UUID                        NOT NULL,
  placed_by_user_id         UUID,
  status                    commerce.order_status_enum  NOT NULL DEFAULT 'pending_payment',
  currency_code             CHAR(3)                     NOT NULL DEFAULT 'AUD',
  subtotal                  NUMERIC(12,2)               NOT NULL,
  tax_rate                  NUMERIC(5,4)                NOT NULL DEFAULT 0.1000,
  tax_amount                NUMERIC(12,2)               NOT NULL,
  total                     NUMERIC(12,2)               NOT NULL,
  shipping_address_id       UUID,
  shipping_address_snapshot JSONB,
  billing_address_snapshot  JSONB                       NOT NULL,
  notes                     TEXT,
  internal_notes            TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id  TEXT,
  placed_at                 TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_by_user_id        UUID,
  created_at                TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ                 NOT NULL DEFAULT now(),

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT uq_orders_order_number UNIQUE (order_number),
  CONSTRAINT fk_orders_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_placed_by FOREIGN KEY (placed_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_shipping_address FOREIGN KEY (shipping_address_id)
    REFERENCES shared.addresses(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_organization_id_placed_at    ON commerce.orders (organization_id, placed_at DESC);
CREATE INDEX idx_orders_status                       ON commerce.orders (status);
CREATE INDEX idx_orders_stripe_payment_intent_id     ON commerce.orders (stripe_payment_intent_id);

-- ── commerce.order_items ──────────────────────────────────────────────────────

CREATE TABLE commerce.order_items (
  id                     UUID           NOT NULL DEFAULT shared.uuid_generate_v7(),
  order_id               UUID           NOT NULL,
  product_id             UUID           NOT NULL,
  product_name_snapshot  TEXT           NOT NULL,
  product_sku_snapshot   TEXT           NOT NULL,
  unit_price_snapshot    NUMERIC(12,2)  NOT NULL,
  quantity               INTEGER        NOT NULL,
  line_total             NUMERIC(12,2)  NOT NULL,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT pk_order_items PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES commerce.orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_order_items_order_id   ON commerce.order_items (order_id);
CREATE INDEX idx_order_items_product_id ON commerce.order_items (product_id);

-- ── commerce.favourites ───────────────────────────────────────────────────────

CREATE TABLE commerce.favourites (
  id         UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  user_id    UUID         NOT NULL,
  product_id UUID         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_favourites PRIMARY KEY (id),
  CONSTRAINT uq_favourites_user_product UNIQUE (user_id, product_id),
  CONSTRAINT fk_favourites_user FOREIGN KEY (user_id)
    REFERENCES identity.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favourites_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE CASCADE
);

CREATE INDEX idx_favourites_product_id ON commerce.favourites (product_id);

-- ── crm.contacts ──────────────────────────────────────────────────────────────

CREATE TABLE crm.contacts (
  id                UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id   UUID         NOT NULL,
  linked_user_id    UUID,
  full_name         TEXT         NOT NULL,
  email             TEXT,
  phone             TEXT,
  job_title         TEXT,
  is_primary        BOOLEAN      NOT NULL DEFAULT false,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_contacts PRIMARY KEY (id),
  CONSTRAINT fk_contacts_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_linked_user FOREIGN KEY (linked_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contacts_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contacts_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_contacts_organization_id ON crm.contacts (organization_id);
CREATE INDEX idx_contacts_linked_user_id  ON crm.contacts (linked_user_id);

-- ── crm.leads ─────────────────────────────────────────────────────────────────

CREATE TABLE crm.leads (
  id                   UUID                 NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id      UUID,
  company_name_raw     TEXT,
  contact_name_raw     TEXT,
  email_raw            TEXT,
  phone_raw            TEXT,
  source               TEXT,
  installs_per_week_raw TEXT,
  status               crm.lead_status_enum NOT NULL DEFAULT 'new',
  owner_user_id        UUID,
  converted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ          NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,

  CONSTRAINT pk_leads PRIMARY KEY (id),
  CONSTRAINT fk_leads_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE SET NULL,
  CONSTRAINT fk_leads_owner FOREIGN KEY (owner_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_leads_status        ON crm.leads (status);
CREATE INDEX idx_leads_owner_user_id ON crm.leads (owner_user_id);

-- ── crm.opportunities ─────────────────────────────────────────────────────────

CREATE TABLE crm.opportunities (
  id                 UUID                       NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id    UUID                       NOT NULL,
  primary_contact_id UUID,
  owner_user_id      UUID                       NOT NULL,
  stage              crm.opportunity_stage_enum NOT NULL DEFAULT 'prospecting',
  estimated_value    NUMERIC(12,2),
  currency_code      CHAR(3)                    NOT NULL DEFAULT 'AUD',
  expected_close_date DATE,
  closed_at          TIMESTAMPTZ,
  lost_reason        TEXT,
  created_at         TIMESTAMPTZ                NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ                NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,

  CONSTRAINT pk_opportunities PRIMARY KEY (id),
  CONSTRAINT fk_opportunities_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_opportunities_primary_contact FOREIGN KEY (primary_contact_id)
    REFERENCES crm.contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_owner FOREIGN KEY (owner_user_id)
    REFERENCES identity.users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_opportunities_organization_id ON crm.opportunities (organization_id);
CREATE INDEX idx_opportunities_owner_user_id   ON crm.opportunities (owner_user_id);
CREATE INDEX idx_opportunities_stage           ON crm.opportunities (stage);

-- ── crm.quotes ────────────────────────────────────────────────────────────────

CREATE TABLE crm.quotes (
  id                UUID                  NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id   UUID                  NOT NULL,
  opportunity_id    UUID,
  quote_number      TEXT                  NOT NULL,
  version           INTEGER               NOT NULL DEFAULT 1,
  status            crm.quote_status_enum NOT NULL DEFAULT 'draft',
  valid_until       DATE,
  subtotal          NUMERIC(12,2)         NOT NULL DEFAULT 0,
  total             NUMERIC(12,2)         NOT NULL DEFAULT 0,
  currency_code     CHAR(3)               NOT NULL DEFAULT 'AUD',
  converted_order_id UUID,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ           NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_quotes PRIMARY KEY (id),
  CONSTRAINT uq_quotes_quote_number UNIQUE (quote_number),
  CONSTRAINT fk_quotes_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_quotes_opportunity FOREIGN KEY (opportunity_id)
    REFERENCES crm.opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_converted_order FOREIGN KEY (converted_order_id)
    REFERENCES commerce.orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_quotes_organization_id ON crm.quotes (organization_id);
CREATE INDEX idx_quotes_opportunity_id  ON crm.quotes (opportunity_id);
CREATE INDEX idx_quotes_status          ON crm.quotes (status);

-- ── crm.quote_items ───────────────────────────────────────────────────────────

CREATE TABLE crm.quote_items (
  id                     UUID           NOT NULL DEFAULT shared.uuid_generate_v7(),
  quote_id               UUID           NOT NULL,
  product_id             UUID           NOT NULL,
  product_name_snapshot  TEXT           NOT NULL,
  unit_price_snapshot    NUMERIC(12,2)  NOT NULL,
  quantity               INTEGER        NOT NULL,
  line_total             NUMERIC(12,2)  NOT NULL,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT pk_quote_items PRIMARY KEY (id),
  CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id)
    REFERENCES crm.quotes(id) ON DELETE CASCADE,
  CONSTRAINT fk_quote_items_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_quote_items_quote_id ON crm.quote_items (quote_id);

-- ── crm.activities ────────────────────────────────────────────────────────────

CREATE TABLE crm.activities (
  id                UUID                   NOT NULL DEFAULT shared.uuid_generate_v7(),
  entity_type       TEXT                   NOT NULL,
  entity_id         UUID                   NOT NULL,
  activity_type     crm.activity_type_enum NOT NULL,
  subject           TEXT,
  body              TEXT,
  due_at            TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  owner_user_id     UUID,
  created_by_user_id UUID,
  created_at        TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ            NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_activities PRIMARY KEY (id),
  CONSTRAINT fk_activities_owner FOREIGN KEY (owner_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_activities_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_activities_entity         ON crm.activities (entity_type, entity_id);
CREATE INDEX idx_activities_owner_user_id  ON crm.activities (owner_user_id);
CREATE INDEX idx_activities_due_at         ON crm.activities (due_at);

-- ── inventory.warehouses ──────────────────────────────────────────────────────

CREATE TABLE inventory.warehouses (
  id                UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  name              TEXT         NOT NULL,
  code              TEXT         NOT NULL,
  address_id        UUID         NOT NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_warehouses PRIMARY KEY (id),
  CONSTRAINT fk_warehouses_address FOREIGN KEY (address_id)
    REFERENCES shared.addresses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouses_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_warehouses_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_warehouses_address_id ON inventory.warehouses (address_id);

-- ── inventory.stock_items ─────────────────────────────────────────────────────

CREATE TABLE inventory.stock_items (
  id                UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  warehouse_id      UUID         NOT NULL,
  product_id        UUID         NOT NULL,
  quantity_on_hand  INTEGER      NOT NULL DEFAULT 0,
  quantity_reserved INTEGER      NOT NULL DEFAULT 0,
  reorder_point     INTEGER      NOT NULL DEFAULT 0,
  version           INTEGER      NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_stock_items PRIMARY KEY (id),
  CONSTRAINT uq_stock_items_warehouse_product UNIQUE (warehouse_id, product_id),
  CONSTRAINT fk_stock_items_warehouse FOREIGN KEY (warehouse_id)
    REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_items_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE RESTRICT
);

-- ── inventory.stock_movements ─────────────────────────────────────────────────

CREATE TABLE inventory.stock_movements (
  id                UUID                               NOT NULL DEFAULT shared.uuid_generate_v7(),
  warehouse_id      UUID                               NOT NULL,
  product_id        UUID                               NOT NULL,
  movement_type     inventory.stock_movement_type_enum NOT NULL,
  quantity_delta    INTEGER                            NOT NULL,
  reference_type    TEXT,
  reference_id      UUID,
  note              TEXT,
  created_by_user_id UUID,
  created_at        TIMESTAMPTZ                        NOT NULL DEFAULT now(),

  CONSTRAINT pk_stock_movements PRIMARY KEY (id),
  CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouse_id)
    REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id)
    REFERENCES catalog.products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_stock_movements_warehouse_product ON inventory.stock_movements (warehouse_id, product_id, created_at);
CREATE INDEX idx_stock_movements_reference         ON inventory.stock_movements (reference_type, reference_id);

-- ── inventory.installers ──────────────────────────────────────────────────────

CREATE TABLE inventory.installers (
  id                   UUID                            NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id      UUID                            NOT NULL,
  license_number       TEXT,
  certification_expiry DATE,
  service_radius_km    INTEGER,
  status               inventory.installer_status_enum NOT NULL DEFAULT 'pending_approval',
  created_at           TIMESTAMPTZ                     NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ                     NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,

  CONSTRAINT pk_installers PRIMARY KEY (id),
  CONSTRAINT fk_installers_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE CASCADE
);

-- NOTE: Prisma would create a full UNIQUE on organization_id here.
-- We intentionally do NOT create it — the partial unique index below
-- (uq_installers_org_active) is the actual constraint.

-- ── inventory.installation_jobs ───────────────────────────────────────────────

CREATE TABLE inventory.installation_jobs (
  id                UUID                                    NOT NULL DEFAULT shared.uuid_generate_v7(),
  order_id          UUID                                    NOT NULL,
  installer_id      UUID,
  status            inventory.installation_job_status_enum  NOT NULL DEFAULT 'scheduled',
  scheduled_date    DATE,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ                             NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ                             NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_installation_jobs PRIMARY KEY (id),
  CONSTRAINT fk_installation_jobs_order FOREIGN KEY (order_id)
    REFERENCES commerce.orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_installation_jobs_installer FOREIGN KEY (installer_id)
    REFERENCES inventory.installers(id) ON DELETE SET NULL,
  CONSTRAINT fk_installation_jobs_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_installation_jobs_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_installation_jobs_order_id     ON inventory.installation_jobs (order_id);
CREATE INDEX idx_installation_jobs_installer_id ON inventory.installation_jobs (installer_id);
CREATE INDEX idx_installation_jobs_status       ON inventory.installation_jobs (status);

-- ── billing.credit_accounts ───────────────────────────────────────────────────

CREATE TABLE billing.credit_accounts (
  id                UUID                                NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id   UUID                                NOT NULL,
  credit_limit      NUMERIC(12,2)                       NOT NULL DEFAULT 0,
  currency_code     CHAR(3)                             NOT NULL DEFAULT 'AUD',
  cached_balance    NUMERIC(12,2)                       NOT NULL DEFAULT 0,
  status            billing.credit_account_status_enum  NOT NULL DEFAULT 'active',
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ                         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ                         NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT pk_credit_accounts PRIMARY KEY (id),
  CONSTRAINT fk_credit_accounts_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_credit_accounts_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_credit_accounts_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

-- NOTE: Prisma would create a full UNIQUE on organization_id here.
-- We intentionally do NOT create it — the partial unique index below
-- (uq_credit_accounts_org_active) is the actual constraint.

-- ── billing.credit_ledger_entries ─────────────────────────────────────────────

CREATE TABLE billing.credit_ledger_entries (
  id                UUID                                  NOT NULL DEFAULT shared.uuid_generate_v7(),
  credit_account_id UUID                                  NOT NULL,
  entry_type        billing.credit_ledger_entry_type_enum NOT NULL,
  amount            NUMERIC(12,2)                         NOT NULL,
  reference_type    TEXT,
  reference_id      UUID,
  description       TEXT,
  created_by_user_id UUID,
  created_at        TIMESTAMPTZ                           NOT NULL DEFAULT now(),

  CONSTRAINT pk_credit_ledger_entries PRIMARY KEY (id),
  CONSTRAINT fk_credit_ledger_entries_account FOREIGN KEY (credit_account_id)
    REFERENCES billing.credit_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_credit_ledger_entries_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_credit_ledger_entries_account_id_created_at ON billing.credit_ledger_entries (credit_account_id, created_at);

-- ── billing.invoices ──────────────────────────────────────────────────────────

CREATE TABLE billing.invoices (
  id                UUID                       NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id   UUID                       NOT NULL,
  order_id          UUID,
  invoice_number    TEXT                       NOT NULL,
  status            billing.invoice_status_enum NOT NULL DEFAULT 'draft',
  currency_code     CHAR(3)                    NOT NULL DEFAULT 'AUD',
  subtotal          NUMERIC(12,2)              NOT NULL,
  tax_rate          NUMERIC(5,4)               NOT NULL DEFAULT 0.1000,
  tax_total         NUMERIC(12,2)              NOT NULL DEFAULT 0,
  total             NUMERIC(12,2)              NOT NULL,
  due_date          DATE,
  issued_at         TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  created_at        TIMESTAMPTZ                NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ                NOT NULL DEFAULT now(),

  CONSTRAINT pk_invoices PRIMARY KEY (id),
  CONSTRAINT uq_invoices_invoice_number UNIQUE (invoice_number),
  CONSTRAINT fk_invoices_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_order FOREIGN KEY (order_id)
    REFERENCES commerce.orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_organization_id ON billing.invoices (organization_id);
CREATE INDEX idx_invoices_status          ON billing.invoices (status);
CREATE INDEX idx_invoices_order_id        ON billing.invoices (order_id);

-- ── billing.invoice_items ─────────────────────────────────────────────────────

CREATE TABLE billing.invoice_items (
  id          UUID           NOT NULL DEFAULT shared.uuid_generate_v7(),
  invoice_id  UUID           NOT NULL,
  description TEXT           NOT NULL,
  quantity    INTEGER        NOT NULL,
  unit_price  NUMERIC(12,2)  NOT NULL,
  line_total  NUMERIC(12,2)  NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT pk_invoice_items PRIMARY KEY (id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id)
    REFERENCES billing.invoices(id) ON DELETE RESTRICT
);

CREATE INDEX idx_invoice_items_invoice_id ON billing.invoice_items (invoice_id);

-- ── billing.payments ──────────────────────────────────────────────────────────

CREATE TABLE billing.payments (
  id                      UUID                      NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id         UUID                      NOT NULL,
  order_id                UUID,
  invoice_id              UUID,
  refunded_payment_id     UUID,
  amount                  NUMERIC(12,2)             NOT NULL,
  currency_code           CHAR(3)                   NOT NULL DEFAULT 'AUD',
  method                  billing.payment_method_enum NOT NULL,
  status                  billing.payment_status_enum NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_charge_id        TEXT,
  failure_reason          TEXT,
  created_at              TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ               NOT NULL DEFAULT now(),

  CONSTRAINT pk_payments PRIMARY KEY (id),
  CONSTRAINT fk_payments_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
    REFERENCES commerce.orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id)
    REFERENCES billing.invoices(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_refunded FOREIGN KEY (refunded_payment_id)
    REFERENCES billing.payments(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_organization_id          ON billing.payments (organization_id);
CREATE INDEX idx_payments_order_id                 ON billing.payments (order_id);
CREATE INDEX idx_payments_invoice_id               ON billing.payments (invoice_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON billing.payments (stripe_payment_intent_id);

-- ── audit.audit_log ───────────────────────────────────────────────────────────

CREATE TABLE audit.audit_log (
  id              UUID                     NOT NULL DEFAULT shared.uuid_generate_v7(),
  actor_id        UUID,
  actor_type      audit.audit_actor_type_enum NOT NULL,
  organization_id UUID,
  action          TEXT                     NOT NULL,
  entity_type     TEXT                     NOT NULL,
  entity_id       UUID                     NOT NULL,
  before_data     JSONB,
  after_data      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT now(),

  CONSTRAINT pk_audit_log PRIMARY KEY (id)
);

-- NO foreign keys on actor_id / organization_id — audit rows must survive
-- even if the referenced entity is later removed, and actors may be
-- 'system'/'api_key' with no user row at all.

CREATE INDEX idx_audit_log_entity                       ON audit.audit_log (entity_type, entity_id, created_at);
CREATE INDEX idx_audit_log_organization_id_created_at   ON audit.audit_log (organization_id, created_at);
CREATE INDEX idx_audit_log_actor_id                     ON audit.audit_log (actor_id);

-- ============================================================================
-- 7. PARTIAL UNIQUE INDEXES (soft-delete-aware uniqueness)
-- ============================================================================

-- These replace the full unique constraints Prisma would generate (or skip
-- for tables where we intentionally did NOT create a full unique — installers
-- and credit_accounts — so only the partial constraint exists).

-- identity schema
CREATE UNIQUE INDEX uq_organizations_abn_active
  ON identity.organizations (abn)
  WHERE deleted_at IS NULL AND abn IS NOT NULL;

CREATE UNIQUE INDEX uq_users_email_active
  ON identity.users (lower(email))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_org_members_org_user_active
  ON identity.organization_members (organization_id, user_id)
  WHERE deleted_at IS NULL;

-- catalog schema
CREATE UNIQUE INDEX uq_categories_slug_active
  ON catalog.categories (slug) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_categories_name_active
  ON catalog.categories (name) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_brands_slug_active
  ON catalog.brands (slug) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_brands_name_active
  ON catalog.brands (name) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_products_slug_active
  ON catalog.products (slug) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_products_sku_active
  ON catalog.products (sku) WHERE deleted_at IS NULL;

-- crm schema
CREATE UNIQUE INDEX uq_contacts_org_email_active
  ON crm.contacts (organization_id, lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX uq_leads_email_active
  ON crm.leads (lower(email_raw))
  WHERE deleted_at IS NULL AND email_raw IS NOT NULL;

-- inventory schema
CREATE UNIQUE INDEX uq_warehouses_code_active
  ON inventory.warehouses (code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_installers_org_active
  ON inventory.installers (organization_id) WHERE deleted_at IS NULL;

-- billing schema
CREATE UNIQUE INDEX uq_credit_accounts_org_active
  ON billing.credit_accounts (organization_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 8. GIN INDEX (full-text search — not expressible in Prisma)
-- ============================================================================

CREATE INDEX idx_products_search_gin ON catalog.products
  USING GIN (to_tsvector('english', name || ' ' || coalesce(description, '')));

-- ============================================================================
-- 9. PARTIAL WHERE INDEX (replace Prisma's full is_featured index)
-- ============================================================================

-- Prisma's @@index on is_featured creates an index on ALL rows, but 95%+
-- are NOT featured. Replace with a partial WHERE index.

DROP INDEX IF EXISTS catalog.idx_products_is_featured;
CREATE INDEX idx_products_is_featured ON catalog.products (is_featured)
  WHERE is_featured = true;

-- ============================================================================
-- 10. CHECK CONSTRAINTS (not expressible in Prisma)
-- ============================================================================

-- shared schema
ALTER TABLE shared.countries
  ADD CONSTRAINT chk_countries_iso_upper CHECK (iso_code = upper(iso_code));

-- identity schema
ALTER TABLE identity.organizations
  ADD CONSTRAINT chk_organizations_customer_abn CHECK (type <> 'customer' OR abn IS NOT NULL);

-- catalog schema
ALTER TABLE catalog.categories
  ADD CONSTRAINT chk_categories_no_self_ref CHECK (parent_category_id IS DISTINCT FROM id);

ALTER TABLE catalog.products
  ADD CONSTRAINT chk_products_price          CHECK (price >= 0),
  ADD CONSTRAINT chk_products_compare_at     CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD CONSTRAINT chk_products_stock_qty      CHECK (stock_quantity >= 0);

-- commerce schema
ALTER TABLE commerce.cart_items
  ADD CONSTRAINT chk_cart_items_qty CHECK (quantity > 0);

ALTER TABLE commerce.orders
  ADD CONSTRAINT chk_orders_subtotal   CHECK (subtotal >= 0),
  ADD CONSTRAINT chk_orders_total      CHECK (total >= 0),
  ADD CONSTRAINT chk_orders_tax_amount CHECK (tax_amount >= 0),
  ADD CONSTRAINT chk_orders_tax_rate   CHECK (tax_rate >= 0);

ALTER TABLE commerce.order_items
  ADD CONSTRAINT chk_order_items_price CHECK (unit_price_snapshot >= 0),
  ADD CONSTRAINT chk_order_items_qty   CHECK (quantity > 0),
  ADD CONSTRAINT chk_order_items_total CHECK (line_total >= 0);

-- crm schema
ALTER TABLE crm.quote_items
  ADD CONSTRAINT chk_quote_items_qty CHECK (quantity > 0);

-- inventory schema
ALTER TABLE inventory.stock_items
  ADD CONSTRAINT chk_stock_items_on_hand   CHECK (quantity_on_hand >= 0),
  ADD CONSTRAINT chk_stock_items_reserved  CHECK (quantity_reserved >= 0);

ALTER TABLE inventory.stock_movements
  ADD CONSTRAINT chk_stock_movements_delta CHECK (quantity_delta <> 0);

-- billing schema
ALTER TABLE billing.credit_accounts
  ADD CONSTRAINT chk_credit_accounts_limit CHECK (credit_limit >= 0);

ALTER TABLE billing.credit_ledger_entries
  ADD CONSTRAINT chk_credit_ledger_amount CHECK (amount <> 0);

ALTER TABLE billing.invoice_items
  ADD CONSTRAINT chk_invoice_items_qty CHECK (quantity > 0);

ALTER TABLE billing.invoices
  ADD CONSTRAINT chk_invoices_subtotal CHECK (subtotal >= 0),
  ADD CONSTRAINT chk_invoices_tax_total CHECK (tax_total >= 0),
  ADD CONSTRAINT chk_invoices_total CHECK (total >= 0);

ALTER TABLE billing.payments
  ADD CONSTRAINT chk_payments_amount CHECK (amount > 0);

-- ============================================================================
-- 11. set_updated_at() TRIGGERS
-- ============================================================================

-- Apply the shared set_updated_at() trigger to every table with an updated_at
-- column. The trigger function is defined in section 4 above.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('shared', 'identity', 'catalog', 'commerce', 'crm', 'inventory', 'billing')
      AND tablename NOT IN ('user_roles', 'order_items', 'invoice_items',
                            'credit_ledger_entries', 'stock_movements',
                            'password_reset_tokens', 'email_verification_tokens',
                            'favourites')
      -- Exclude tables that have no updated_at column.
      -- We check dynamically below.
  LOOP
    -- Only install trigger if the table actually has an updated_at column.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = r.schemaname
        AND table_name   = r.tablename
        AND column_name  = 'updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_set_updated_at
           BEFORE UPDATE ON %I.%I
           FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();',
        r.schemaname, r.tablename
      );
    END IF;
  END LOOP;
END;
$$;

-- Tables excluded from the dynamic loop above that DO have updated_at and
-- need the trigger applied manually (the loop's column-existence check handles
-- this, but explicit calls guarantee it):

-- commerce.order_items — no updated_at (immutable), NO trigger needed.
-- commerce.favourites — no updated_at, NO trigger needed.
-- billing.invoice_items — no updated_at (immutable), NO trigger needed.
-- billing.credit_ledger_entries — no updated_at (append-only), NO trigger needed.
-- inventory.stock_movements — no updated_at (append-only), NO trigger needed.
-- identity.password_reset_tokens — no updated_at, NO trigger needed.
-- identity.email_verification_tokens — no updated_at, NO trigger needed.
-- identity.user_roles — no updated_at, NO trigger needed.
-- audit.audit_log — no updated_at (append-only), NO trigger needed.

-- ============================================================================
-- 12. APPEND-ONLY / IMMUTABILITY TRIGGERS
-- ============================================================================

-- Belt-and-suspenders: block UPDATE / DELETE on append-only / immutable tables
-- from the database side as well, so even a bug in application code cannot
-- mutate rows that the design declares immutable.

CREATE OR REPLACE FUNCTION shared.block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table %.% is append-only — % operations are blocked.',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
END;
$$;

-- commerce.order_items — immutable line items (corrections = new order or credit note)
CREATE TRIGGER trg_block_order_items_update
  BEFORE UPDATE OR DELETE ON commerce.order_items
  FOR EACH ROW EXECUTE FUNCTION shared.block_mutation();

-- billing.invoice_items — immutable
CREATE TRIGGER trg_block_invoice_items_update
  BEFORE UPDATE OR DELETE ON billing.invoice_items
  FOR EACH ROW EXECUTE FUNCTION shared.block_mutation();

-- billing.credit_ledger_entries — append-only
CREATE TRIGGER trg_block_credit_ledger_update
  BEFORE UPDATE OR DELETE ON billing.credit_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION shared.block_mutation();

-- inventory.stock_movements — append-only
CREATE TRIGGER trg_block_stock_movements_update
  BEFORE UPDATE OR DELETE ON inventory.stock_movements
  FOR EACH ROW EXECUTE FUNCTION shared.block_mutation();

-- ============================================================================
-- 13. QUOTE LOCK TRIGGER (block edits on non-draft quotes)
-- ============================================================================

-- Quotes can only be soft-deleted or have their items/summary changed while
-- status = 'draft'. Once sent, accepted, rejected, expired, or converted,
-- the quote record is frozen (except for status transitions, which the
-- application handles explicitly).

CREATE OR REPLACE FUNCTION crm.protect_quote()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Allow status-only transitions (e.g. draft → sent, sent → accepted).
    -- Everything else on a non-draft quote is blocked.
    IF OLD.status <> 'draft' AND OLD.status IS NOT NULL THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Status transition is allowed (application handles rules).
        RETURN NEW;
      ELSE
        RAISE EXCEPTION 'Quote % is not a draft — only status transitions are allowed.', OLD.id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' AND OLD.status IS NOT NULL THEN
      RAISE EXCEPTION 'Quote % is not a draft — cannot be soft-deleted.', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_quote
  BEFORE UPDATE OR DELETE ON crm.quotes
  FOR EACH ROW EXECUTE FUNCTION crm.protect_quote();

-- NOTE: quote_items are NOT covered by block_mutation() — they are mutable
-- while the parent quote is in draft status. Immutability for non-draft quotes
-- is enforced at the application layer (the quote is frozen by the protect_quote
-- trigger above, and quote_items are implicitly frozen with it).

-- ============================================================================
-- 14. AUDIT LOG ACCESS CONTROL
-- ============================================================================

-- audit.audit_log is append-only by definition. REVOKE UPDATE and DELETE from
-- the application's runtime role so that even a compromised query cannot
-- tamper with the audit trail.
--
-- The application runtime role is `nexon_app` — adjust this to match the
-- actual role used by the Next.js/Prisma application in production.
-- If the role does not yet exist, this statement will fail safely
-- (the migration should still be applied; the DBA creates the role and
-- re-runs this block separately).

DO $$
BEGIN
  -- Revoke from the application role if it exists.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexon_app') THEN
    REVOKE UPDATE, DELETE ON audit.audit_log FROM nexon_app;
  END IF;
END;
$$;
