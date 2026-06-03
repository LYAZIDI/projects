-- =============================================================================
-- V1 – Workflow Engine Core Schema
-- =============================================================================
-- All tables are prefixed with wf_ to avoid collisions with domain tables.
-- JSONB columns hold condition/action config and execution payload snapshots.
-- Envers audit tables (wf_*_aud) mirror each @Audited entity.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Envers revision info table (required by hibernate-envers)
-- ---------------------------------------------------------------------------
CREATE TABLE revinfo (
    rev      BIGSERIAL PRIMARY KEY,
    revtstmp BIGINT NOT NULL
);

-- ---------------------------------------------------------------------------
-- wf_definitions – one row per (tenant, entityType, version)
-- ---------------------------------------------------------------------------
CREATE TABLE wf_definitions (
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

CREATE INDEX idx_wf_definitions_tenant_type ON wf_definitions (tenant_id, entity_type);

-- Envers audit
CREATE TABLE wf_definitions_aud (
    id          UUID    NOT NULL,
    rev         BIGINT  NOT NULL REFERENCES revinfo (rev),
    revtype     SMALLINT,
    tenant_id   UUID,
    entity_type VARCHAR(64),
    version     INT,
    label       VARCHAR(128),
    description TEXT,
    active      BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- ---------------------------------------------------------------------------
-- wf_states – states belonging to a definition
-- ---------------------------------------------------------------------------
CREATE TABLE wf_states (
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

CREATE INDEX idx_wf_states_definition ON wf_states (definition_id);

CREATE TABLE wf_states_aud (
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

-- ---------------------------------------------------------------------------
-- wf_transitions – edges between states
-- ---------------------------------------------------------------------------
CREATE TABLE wf_transitions (
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

CREATE INDEX idx_wf_transitions_definition ON wf_transitions (definition_id);
CREATE INDEX idx_wf_transitions_from_state ON wf_transitions (definition_id, from_state_key);

CREATE TABLE wf_transitions_aud (
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

-- ---------------------------------------------------------------------------
-- wf_condition_configs – conditions on a transition (ALL must pass)
-- ---------------------------------------------------------------------------
CREATE TABLE wf_condition_configs (
    id            UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transition_id UUID    NOT NULL REFERENCES wf_transitions (id) ON DELETE CASCADE,
    type          VARCHAR(64) NOT NULL,
    config        JSONB   NOT NULL DEFAULT '{}',
    sort_order    INT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_wf_conditions_transition ON wf_condition_configs (transition_id);

CREATE TABLE wf_condition_configs_aud (
    id            UUID     NOT NULL,
    rev           BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype       SMALLINT,
    transition_id UUID,
    type          VARCHAR(64),
    config        JSONB,
    sort_order    INT,
    PRIMARY KEY (id, rev)
);

-- ---------------------------------------------------------------------------
-- wf_action_configs – actions to run on successful transition
-- ---------------------------------------------------------------------------
CREATE TABLE wf_action_configs (
    id            UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transition_id UUID    NOT NULL REFERENCES wf_transitions (id) ON DELETE CASCADE,
    type          VARCHAR(64) NOT NULL,
    config        JSONB   NOT NULL DEFAULT '{}',
    sort_order    INT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_wf_actions_transition ON wf_action_configs (transition_id);

CREATE TABLE wf_action_configs_aud (
    id            UUID     NOT NULL,
    rev           BIGINT   NOT NULL REFERENCES revinfo (rev),
    revtype       SMALLINT,
    transition_id UUID,
    type          VARCHAR(64),
    config        JSONB,
    sort_order    INT,
    PRIMARY KEY (id, rev)
);

-- ---------------------------------------------------------------------------
-- wf_instances – current state of a domain entity in the workflow
-- ---------------------------------------------------------------------------
CREATE TABLE wf_instances (
    id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id         UUID        NOT NULL,
    entity_type       VARCHAR(64) NOT NULL,
    entity_id         UUID        NOT NULL,
    definition_id     UUID        NOT NULL REFERENCES wf_definitions (id),
    current_state_key VARCHAR(64) NOT NULL,
    version           BIGINT      NOT NULL DEFAULT 0,   -- optimistic lock
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_wf_instance_entity
        UNIQUE (tenant_id, entity_type, entity_id)
);

CREATE INDEX idx_wf_instances_tenant_type       ON wf_instances (tenant_id, entity_type);
CREATE INDEX idx_wf_instances_tenant_type_state ON wf_instances (tenant_id, entity_type, current_state_key);

-- ---------------------------------------------------------------------------
-- wf_execution_logs – immutable audit trail (no Envers; write-once)
-- ---------------------------------------------------------------------------
CREATE TABLE wf_execution_logs (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id        UUID        NOT NULL,
    entity_type      VARCHAR(64) NOT NULL,
    entity_id        UUID        NOT NULL,
    definition_id    UUID,                               -- nullable in case def was deleted
    transition_key   VARCHAR(64) NOT NULL,
    from_state_key   VARCHAR(64) NOT NULL,
    to_state_key     VARCHAR(64),                        -- null on failure
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

-- Sorted by time for history queries
CREATE INDEX idx_wf_exec_logs_entity
    ON wf_execution_logs (tenant_id, entity_type, entity_id, created_at DESC);

-- Used for compliance export (time-range queries)
CREATE INDEX idx_wf_exec_logs_tenant_type_time
    ON wf_execution_logs (tenant_id, entity_type, created_at DESC);

-- Error monitoring
CREATE INDEX idx_wf_exec_logs_errors
    ON wf_execution_logs (tenant_id, entity_type, success)
    WHERE success = FALSE;
