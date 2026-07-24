-- ============================================================================
-- Add identity.organization_team_members
-- Operational team member (installer, warehouse pickup contact, etc.) scoped
-- to an organization. Distinct from identity.organization_members: no linked
-- User row, no login/portal access, no role.
-- ============================================================================

CREATE TABLE identity.organization_team_members (
  id              UUID         NOT NULL DEFAULT shared.uuid_generate_v7(),
  organization_id UUID         NOT NULL,
  name            TEXT         NOT NULL,
  email           TEXT         NOT NULL,
  phone           TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT pk_organization_team_members PRIMARY KEY (id),
  CONSTRAINT uq_org_team_members_org_email UNIQUE (organization_id, email),
  CONSTRAINT fk_org_team_members_organization FOREIGN KEY (organization_id)
    REFERENCES identity.organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_org_team_members_organization_id ON identity.organization_team_members (organization_id);
