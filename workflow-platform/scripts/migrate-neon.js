/**
 * migrate-neon.js — exécute V1 + V2 + flyway_schema_history sur Neon
 * Usage: node scripts/migrate-neon.js
 */

const { Client } = require('pg');

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  'postgresql://user:password@host/dbname?sslmode=require&channel_binding=require';

// ─── SQL V1 ───────────────────────────────────────────────────────────────────
const V1 = `
CREATE TABLE IF NOT EXISTS revinfo (
    rev      BIGSERIAL PRIMARY KEY,
    revtstmp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS wf_definitions (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id   UUID        NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    version     INT         NOT NULL DEFAULT 1,
    label       VARCHAR(128),
    description TEXT,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  VARCHAR(128),
    updated_by  VARCHAR(128),
    CONSTRAINT uq_wf_definition_tenant_type_version
        UNIQUE (tenant_id, entity_type, version)
);
CREATE INDEX IF NOT EXISTS idx_wf_definitions_tenant_type ON wf_definitions (tenant_id, entity_type);

CREATE TABLE IF NOT EXISTS wf_definitions_aud (
    id          UUID     NOT NULL,
    rev         BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype     SMALLINT,
    tenant_id   UUID,
    entity_type VARCHAR(64),
    version     INT,
    label       VARCHAR(128),
    description TEXT,
    active      BOOLEAN,
    PRIMARY KEY (id, rev)
);

CREATE TABLE IF NOT EXISTS wf_states (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    definition_id UUID        NOT NULL REFERENCES wf_definitions (id) ON DELETE CASCADE,
    key           VARCHAR(64) NOT NULL,
    label         VARCHAR(128),
    color         VARCHAR(32),
    icon          VARCHAR(64),
    is_initial    BOOLEAN     NOT NULL DEFAULT FALSE,
    is_final      BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order    INT         NOT NULL DEFAULT 0,
    CONSTRAINT uq_wf_state_def_key UNIQUE (definition_id, key)
);
CREATE INDEX IF NOT EXISTS idx_wf_states_definition ON wf_states (definition_id);

CREATE TABLE IF NOT EXISTS wf_states_aud (
    id            UUID     NOT NULL,
    rev           BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype       SMALLINT,
    definition_id UUID,
    key           VARCHAR(64),
    label         VARCHAR(128),
    color         VARCHAR(32),
    icon          VARCHAR(64),
    is_initial    BOOLEAN,
    is_final      BOOLEAN,
    sort_order    INT,
    PRIMARY KEY (id, rev)
);

CREATE TABLE IF NOT EXISTS wf_transitions (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    definition_id       UUID        NOT NULL REFERENCES wf_definitions (id) ON DELETE CASCADE,
    key                 VARCHAR(64) NOT NULL,
    label               VARCHAR(128),
    from_state_key      VARCHAR(64) NOT NULL,
    to_state_key        VARCHAR(64) NOT NULL,
    required_permission VARCHAR(128),
    ui_variant          VARCHAR(32) NOT NULL DEFAULT 'default',
    sort_order          INT         NOT NULL DEFAULT 0,
    CONSTRAINT uq_wf_transition_def_key UNIQUE (definition_id, key)
);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_definition ON wf_transitions (definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_from_state ON wf_transitions (definition_id, from_state_key);

CREATE TABLE IF NOT EXISTS wf_transitions_aud (
    id                  UUID     NOT NULL,
    rev                 BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype             SMALLINT,
    definition_id       UUID,
    key                 VARCHAR(64),
    label               VARCHAR(128),
    from_state_key      VARCHAR(64),
    to_state_key        VARCHAR(64),
    required_permission VARCHAR(128),
    ui_variant          VARCHAR(32),
    sort_order          INT,
    PRIMARY KEY (id, rev)
);

CREATE TABLE IF NOT EXISTS wf_condition_configs (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transition_id UUID        NOT NULL REFERENCES wf_transitions (id) ON DELETE CASCADE,
    type          VARCHAR(64) NOT NULL,
    config        JSONB       NOT NULL DEFAULT '{}',
    sort_order    INT         NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wf_conditions_transition ON wf_condition_configs (transition_id);

CREATE TABLE IF NOT EXISTS wf_condition_configs_aud (
    id            UUID     NOT NULL,
    rev           BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype       SMALLINT,
    transition_id UUID,
    type          VARCHAR(64),
    config        JSONB,
    sort_order    INT,
    PRIMARY KEY (id, rev)
);

CREATE TABLE IF NOT EXISTS wf_action_configs (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transition_id UUID        NOT NULL REFERENCES wf_transitions (id) ON DELETE CASCADE,
    type          VARCHAR(64) NOT NULL,
    config        JSONB       NOT NULL DEFAULT '{}',
    sort_order    INT         NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wf_actions_transition ON wf_action_configs (transition_id);

CREATE TABLE IF NOT EXISTS wf_action_configs_aud (
    id            UUID     NOT NULL,
    rev           BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype       SMALLINT,
    transition_id UUID,
    type          VARCHAR(64),
    config        JSONB,
    sort_order    INT,
    PRIMARY KEY (id, rev)
);

CREATE TABLE IF NOT EXISTS wf_instances (
    id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id         UUID        NOT NULL,
    entity_type       VARCHAR(64) NOT NULL,
    entity_id         UUID        NOT NULL,
    definition_id     UUID        NOT NULL REFERENCES wf_definitions (id),
    current_state_key VARCHAR(64) NOT NULL,
    version           BIGINT      NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_wf_instance_entity UNIQUE (tenant_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_wf_instances_tenant_type       ON wf_instances (tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_wf_instances_tenant_type_state ON wf_instances (tenant_id, entity_type, current_state_key);

CREATE TABLE IF NOT EXISTS wf_execution_logs (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id        UUID        NOT NULL,
    entity_type      VARCHAR(64) NOT NULL,
    entity_id        UUID        NOT NULL,
    definition_id    UUID,
    transition_key   VARCHAR(64) NOT NULL,
    from_state_key   VARCHAR(64) NOT NULL,
    to_state_key     VARCHAR(64),
    user_id          VARCHAR(128),
    user_email       VARCHAR(256),
    correlation_id   VARCHAR(64),
    success          BOOLEAN     NOT NULL,
    error_code       VARCHAR(64),
    error_message    TEXT,
    duration_ms      BIGINT,
    actions_run      JSONB       NOT NULL DEFAULT '[]',
    payload_snapshot JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_exec_logs_entity
    ON wf_execution_logs (tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_exec_logs_tenant_type_time
    ON wf_execution_logs (tenant_id, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_exec_logs_errors
    ON wf_execution_logs (tenant_id, entity_type, success)
    WHERE success = FALSE;
`;

// ─── SQL V2 ───────────────────────────────────────────────────────────────────
const V2 = `
CREATE TABLE IF NOT EXISTS marketplace_templates (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug                VARCHAR(128) NOT NULL UNIQUE,
    name                VARCHAR(128) NOT NULL,
    short_desc          VARCHAR(256),
    description         TEXT,
    category            VARCHAR(64)  NOT NULL DEFAULT 'general',
    tags                TEXT         NOT NULL DEFAULT '',
    entity_type_hint    VARCHAR(64),
    publisher_tenant_id UUID         NOT NULL,
    publisher_name      VARCHAR(128),
    visible_scope       VARCHAR(32)  NOT NULL DEFAULT 'PUBLIC',
    install_count       INT          NOT NULL DEFAULT 0,
    rating_avg          NUMERIC(3,2),
    rating_count        INT          NOT NULL DEFAULT 0,
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    featured            BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_templates_category  ON marketplace_templates (category, active);
CREATE INDEX IF NOT EXISTS idx_mkt_templates_publisher ON marketplace_templates (publisher_tenant_id);
CREATE INDEX IF NOT EXISTS idx_mkt_templates_scope     ON marketplace_templates (visible_scope, active);
CREATE INDEX IF NOT EXISTS idx_mkt_templates_featured  ON marketplace_templates (featured, active);

CREATE TABLE IF NOT EXISTS marketplace_template_versions (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id  UUID         NOT NULL REFERENCES marketplace_templates (id) ON DELETE CASCADE,
    semver       VARCHAR(32)  NOT NULL,
    semver_major INT          NOT NULL,
    semver_minor INT          NOT NULL,
    semver_patch INT          NOT NULL,
    definition   JSONB        NOT NULL,
    changelog    TEXT,
    is_latest    BOOLEAN      NOT NULL DEFAULT TRUE,
    published_by VARCHAR(128),
    published_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_template_semver UNIQUE (template_id, semver)
);
CREATE INDEX IF NOT EXISTS idx_mkt_versions_template ON marketplace_template_versions (template_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_mkt_versions_latest   ON marketplace_template_versions (template_id) WHERE is_latest = TRUE;

CREATE TABLE IF NOT EXISTS marketplace_template_installs (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id             UUID        NOT NULL REFERENCES marketplace_templates (id),
    template_version_id     UUID        NOT NULL REFERENCES marketplace_template_versions (id),
    tenant_id               UUID        NOT NULL,
    installed_by            VARCHAR(128),
    resulting_definition_id UUID,
    custom_label            VARCHAR(128),
    custom_entity_type      VARCHAR(64),
    installed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_install_tenant_version UNIQUE (tenant_id, template_version_id)
);
CREATE INDEX IF NOT EXISTS idx_mkt_installs_tenant   ON marketplace_template_installs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mkt_installs_template ON marketplace_template_installs (template_id);

CREATE TABLE IF NOT EXISTS marketplace_template_ratings (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID        NOT NULL REFERENCES marketplace_templates (id) ON DELETE CASCADE,
    tenant_id   UUID        NOT NULL,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rating_tenant_template UNIQUE (tenant_id, template_id)
);
`;

// ─── Flyway history ───────────────────────────────────────────────────────────
const FLYWAY = `
CREATE TABLE IF NOT EXISTS flyway_schema_history (
    installed_rank  INTEGER       NOT NULL,
    version         VARCHAR(50),
    description     VARCHAR(200)  NOT NULL,
    type            VARCHAR(20)   NOT NULL,
    script          VARCHAR(1000) NOT NULL,
    checksum        INTEGER,
    installed_by    VARCHAR(100)  NOT NULL,
    installed_on    TIMESTAMP     NOT NULL DEFAULT now(),
    execution_time  INTEGER       NOT NULL,
    success         BOOLEAN       NOT NULL,
    CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank)
);
CREATE INDEX IF NOT EXISTS flyway_schema_history_s_idx ON flyway_schema_history (success);

INSERT INTO flyway_schema_history
    (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
VALUES
    (1, '1', 'create workflow tables',    'SQL', 'V1__create_workflow_tables.sql',    -1, 'manual', now(), 1, true),
    (2, '2', 'create marketplace tables', 'SQL', 'V2__create_marketplace_tables.sql', -1, 'manual', now(), 1, true)
ON CONFLICT (installed_rank) DO NOTHING;
`;

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connected to Neon');

  const steps = [
    { name: 'V1 — Workflow Engine tables', sql: V1 },
    { name: 'V2 — Marketplace tables',     sql: V2 },
    { name: 'Flyway schema history',        sql: FLYWAY },
  ];

  for (const step of steps) {
    try {
      process.stdout.write(`⏳ ${step.name} ... `);
      await client.query(step.sql);
      console.log('✅ OK');
    } catch (err) {
      console.log('❌ ERREUR');
      console.error(err.message);
      await client.end();
      process.exit(1);
    }
  }

  // Vérification finale
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  console.log(`\n📋 ${rows.length} tables créées dans Neon :`);
  rows.forEach(r => console.log(`   • ${r.table_name}`));

  await client.end();
  console.log('\n🎉 Migration terminée avec succès !');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
