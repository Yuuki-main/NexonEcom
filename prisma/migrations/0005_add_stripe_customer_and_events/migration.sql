-- Add Stripe customer ID to organizations (B2B — company pays, not individual user)
ALTER TABLE identity.organizations
  ADD COLUMN stripe_customer_id TEXT;

-- Partial unique index: only unique among non-deleted organizations
CREATE UNIQUE INDEX uq_organizations_stripe_customer_id_active
  ON identity.organizations (stripe_customer_id)
  WHERE deleted_at IS NULL;

-- Stripe webhook event deduplication table
-- Stores the raw event payload for debugging/replay
CREATE TABLE billing.stripe_events (
  id              UUID NOT NULL DEFAULT shared.uuid_generate_v7(),
  stripe_event_id TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB,
  processed_at    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT pk_stripe_events PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uq_stripe_events_stripe_event_id
  ON billing.stripe_events (stripe_event_id);
