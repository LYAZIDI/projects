-- =============================================================================
-- V2 – Workflow Marketplace Schema
-- =============================================================================
-- The marketplace is a PUBLISH-SUBSCRIBE layer on top of the workflow engine.
-- Templates are immutable versioned assets; installing them CLONES the definition
-- into the tenant's own namespace — the original template is never mutated.
--
-- Isolation model:
--   - Public templates: visible_scope = 'PUBLIC'
--   - Private templates: visible_scope = 'TENANT' (only creator's tenant can see)
--   - Future: visible_scope = 'ORGANIZATION' for multi-tenant groups
-- =============================================================================

-- ---------------------------------------------------------------------------
-- marketplace_templates – one row per logical template (across all versions)
-- ---------------------------------------------------------------------------
CREATE TABLE marketplace_templates (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Identity
    slug             VARCHAR(128) NOT NULL UNIQUE,   -- URL-safe, stable identifier
    name             VARCHAR(128) NOT NULL,
    short_desc       VARCHAR(256),
    description      TEXT,

    -- Taxonomy
    category         VARCHAR(64)  NOT NULL DEFAULT 'general',   -- crm | hr | finance | support | general
    tags             TEXT[]       NOT NULL DEFAULT '{}',
    entity_type_hint VARCHAR(64),                               -- e.g. "lead" — advisory only, not enforced

    -- Authorship / visibility
    publisher_tenant_id UUID     NOT NULL,           -- tenant that published the template
    publisher_name   VARCHAR(128),                   -- display name (company or user)
    visible_scope    VARCHAR(32)  NOT NULL DEFAULT 'PUBLIC',   -- PUBLIC | TENANT | UNLISTED

    -- Stats (denormalized for listing performance)
    install_count    INT          NOT NULL DEFAULT 0,
    rating_avg       NUMERIC(3,2),
    rating_count     INT          NOT NULL DEFAULT 0,

    -- Lifecycle
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    featured         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_mkt_templates_category     ON marketplace_templates (category, active);
CREATE INDEX idx_mkt_templates_publisher    ON marketplace_templates (publisher_tenant_id);
CREATE INDEX idx_mkt_templates_scope        ON marketplace_templates (visible_scope, active);
CREATE INDEX idx_mkt_templates_featured     ON marketplace_templates (featured, active);

-- ---------------------------------------------------------------------------
-- marketplace_template_versions – immutable snapshots of a template
-- ---------------------------------------------------------------------------
-- Each version stores the COMPLETE WorkflowDefinition as JSONB.
-- Once published, a version is NEVER updated — it is append-only.
-- ---------------------------------------------------------------------------
CREATE TABLE marketplace_template_versions (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id      UUID        NOT NULL REFERENCES marketplace_templates (id) ON DELETE CASCADE,

    -- Semantic version (major.minor.patch)
    semver           VARCHAR(32)  NOT NULL,           -- e.g. "1.0.0", "2.3.1"
    semver_major     INT          NOT NULL,
    semver_minor     INT          NOT NULL,
    semver_patch     INT          NOT NULL,

    -- Content — the full portable workflow definition (states, transitions, conditions, actions)
    definition       JSONB        NOT NULL,           -- WorkflowDefinitionSnapshot

    -- Metadata
    changelog        TEXT,
    is_latest        BOOLEAN      NOT NULL DEFAULT TRUE,
    published_by     VARCHAR(128),                   -- userId of the publisher
    published_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_template_semver UNIQUE (template_id, semver)
);

CREATE INDEX idx_mkt_versions_template   ON marketplace_template_versions (template_id, is_latest);
CREATE INDEX idx_mkt_versions_latest     ON marketplace_template_versions (template_id) WHERE is_latest = TRUE;

-- ---------------------------------------------------------------------------
-- marketplace_template_installs – tracks which tenant installed what
-- ---------------------------------------------------------------------------
CREATE TABLE marketplace_template_installs (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id           UUID        NOT NULL REFERENCES marketplace_templates (id),
    template_version_id   UUID        NOT NULL REFERENCES marketplace_template_versions (id),

    -- Target tenant
    tenant_id             UUID        NOT NULL,
    installed_by          VARCHAR(128),

    -- The resulting WorkflowDefinition created in the tenant's namespace
    resulting_definition_id UUID,                    -- FK to wf_definitions (nullable for orphan safety)

    -- Customization: tenant may rename/re-describe the installed definition
    custom_label          VARCHAR(128),
    custom_entity_type    VARCHAR(64),

    installed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_install_tenant_version UNIQUE (tenant_id, template_version_id)
);

CREATE INDEX idx_mkt_installs_tenant    ON marketplace_template_installs (tenant_id);
CREATE INDEX idx_mkt_installs_template  ON marketplace_template_installs (template_id);

-- ---------------------------------------------------------------------------
-- marketplace_template_ratings – future: per-tenant rating + review
-- ---------------------------------------------------------------------------
CREATE TABLE marketplace_template_ratings (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID        NOT NULL REFERENCES marketplace_templates (id) ON DELETE CASCADE,
    tenant_id   UUID        NOT NULL,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rating_tenant_template UNIQUE (tenant_id, template_id)
);
