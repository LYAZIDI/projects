-- =============================================================================
-- V3 – Clinic Module Schema
-- =============================================================================
-- All tables prefixed with clinic_ to avoid collisions.
-- workflow_state mirrors wf_instances.current_state_key (updated by EntityAdapter).
-- Audit columns on every table for compliance / juridical traceability.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- clinic_patients
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_patients (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id        UUID        NOT NULL,

    -- Identity
    first_name       VARCHAR(128) NOT NULL,
    last_name        VARCHAR(128) NOT NULL,
    birth_date       DATE,
    gender           VARCHAR(16),
    national_id      VARCHAR(64),
    phone            VARCHAR(32),
    email            VARCHAR(128),
    address          JSONB        NOT NULL DEFAULT '{}',

    -- Workflow mirror
    workflow_state   VARCHAR(64)  NOT NULL DEFAULT 'NEW',

    -- Traceability
    registered_by    UUID,
    admitted_at      TIMESTAMPTZ,
    discharged_at    TIMESTAMPTZ,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by       VARCHAR(128),
    updated_by       VARCHAR(128),

    CONSTRAINT uq_clinic_patient_national_id UNIQUE (tenant_id, national_id)
);

CREATE INDEX idx_clinic_patients_tenant     ON clinic_patients (tenant_id);
CREATE INDEX idx_clinic_patients_state      ON clinic_patients (tenant_id, workflow_state);
CREATE INDEX idx_clinic_patients_name       ON clinic_patients (tenant_id, last_name, first_name);

-- ---------------------------------------------------------------------------
-- clinic_visits  (séjour / patient_visit)
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_visits (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id        UUID        NOT NULL,
    patient_id       UUID        NOT NULL REFERENCES clinic_patients (id) ON DELETE CASCADE,

    visit_number     VARCHAR(32)  NOT NULL,
    admission_type   VARCHAR(32)  NOT NULL DEFAULT 'STANDARD',   -- STANDARD | EMERGENCY | DAY_SURGERY
    chief_complaint  TEXT,

    workflow_state   VARCHAR(64)  NOT NULL DEFAULT 'CREATED',

    check_in_at      TIMESTAMPTZ,
    check_out_at     TIMESTAMPTZ,
    assigned_bed_id  UUID,
    assigned_room_id UUID,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by       VARCHAR(128),
    updated_by       VARCHAR(128),

    CONSTRAINT uq_clinic_visit_number UNIQUE (tenant_id, visit_number)
);

CREATE INDEX idx_clinic_visits_tenant    ON clinic_visits (tenant_id);
CREATE INDEX idx_clinic_visits_patient   ON clinic_visits (patient_id);
CREATE INDEX idx_clinic_visits_state     ON clinic_visits (tenant_id, workflow_state);

-- ---------------------------------------------------------------------------
-- clinic_documents  (patient_document)
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_documents (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID        NOT NULL,
    patient_id      UUID        NOT NULL REFERENCES clinic_patients (id) ON DELETE CASCADE,
    visit_id        UUID        REFERENCES clinic_visits (id) ON DELETE SET NULL,

    document_type   VARCHAR(64)  NOT NULL,   -- ID | INSURANCE | CONSENT | LAB_RESULT | OTHER
    file_name       VARCHAR(256) NOT NULL,
    storage_path    VARCHAR(512) NOT NULL,
    mime_type       VARCHAR(128),
    size_bytes      BIGINT,

    workflow_state  VARCHAR(64)  NOT NULL DEFAULT 'UPLOADED',

    reviewed_by     UUID,
    reviewed_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      VARCHAR(128),
    updated_by      VARCHAR(128)
);

CREATE INDEX idx_clinic_docs_patient   ON clinic_documents (patient_id);
CREATE INDEX idx_clinic_docs_state     ON clinic_documents (tenant_id, workflow_state);
CREATE INDEX idx_clinic_docs_type      ON clinic_documents (patient_id, document_type);

-- ---------------------------------------------------------------------------
-- clinic_rooms
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_rooms (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id   UUID        NOT NULL,
    code        VARCHAR(32)  NOT NULL,
    name        VARCHAR(128) NOT NULL,
    floor       INT          NOT NULL DEFAULT 1,
    wing        VARCHAR(64),
    room_type   VARCHAR(32)  NOT NULL DEFAULT 'STANDARD',  -- STANDARD | VIP | ICU | OPERATING
    capacity    INT          NOT NULL DEFAULT 1,

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_clinic_room_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_clinic_rooms_tenant ON clinic_rooms (tenant_id);

-- ---------------------------------------------------------------------------
-- clinic_beds  (facility_bed — subtype of facility_asset for rooms)
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_beds (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID        NOT NULL,
    room_id         UUID        NOT NULL REFERENCES clinic_rooms (id) ON DELETE CASCADE,
    code            VARCHAR(32)  NOT NULL,
    workflow_state  VARCHAR(64)  NOT NULL DEFAULT 'AVAILABLE',
    notes           TEXT,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_clinic_bed_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_clinic_beds_room    ON clinic_beds (room_id);
CREATE INDEX idx_clinic_beds_state   ON clinic_beds (tenant_id, workflow_state);

-- ---------------------------------------------------------------------------
-- clinic_bed_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_bed_assignments (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID        NOT NULL,
    bed_id          UUID        NOT NULL REFERENCES clinic_beds (id),
    visit_id        UUID        NOT NULL REFERENCES clinic_visits (id) ON DELETE CASCADE,
    workflow_state  VARCHAR(64)  NOT NULL DEFAULT 'ACTIVE',
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    released_at     TIMESTAMPTZ,

    CONSTRAINT uq_clinic_bed_visit UNIQUE (visit_id)
);

CREATE INDEX idx_clinic_bed_assign_bed ON clinic_bed_assignments (bed_id);

-- ---------------------------------------------------------------------------
-- clinic_assets  (facility_asset — équipements, véhicules, salles)
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_assets (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID        NOT NULL,
    room_id         UUID        REFERENCES clinic_rooms (id) ON DELETE SET NULL,

    asset_type      VARCHAR(32)  NOT NULL,   -- EQUIPMENT | VEHICLE | DEVICE | FURNITURE
    name            VARCHAR(128) NOT NULL,
    serial_number   VARCHAR(64),
    purchased_at    DATE,
    warranty_until  DATE,

    workflow_state  VARCHAR(64)  NOT NULL DEFAULT 'AVAILABLE',
    notes           TEXT,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      VARCHAR(128),
    updated_by      VARCHAR(128)
);

CREATE INDEX idx_clinic_assets_tenant  ON clinic_assets (tenant_id);
CREATE INDEX idx_clinic_assets_state   ON clinic_assets (tenant_id, workflow_state);
CREATE INDEX idx_clinic_assets_room    ON clinic_assets (room_id);

-- ---------------------------------------------------------------------------
-- clinic_maintenance_requests
-- ---------------------------------------------------------------------------
CREATE TABLE clinic_maintenance_requests (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID        NOT NULL,
    asset_id        UUID        REFERENCES clinic_assets (id) ON DELETE SET NULL,
    room_id         UUID        REFERENCES clinic_rooms  (id) ON DELETE SET NULL,

    request_type    VARCHAR(32)  NOT NULL,   -- REPAIR | CLEANING | INSPECTION | REPLACEMENT
    priority        VARCHAR(16)  NOT NULL DEFAULT 'NORMAL',  -- LOW | NORMAL | HIGH | URGENT
    description     TEXT         NOT NULL,

    workflow_state  VARCHAR(64)  NOT NULL DEFAULT 'OPEN',

    requested_by    UUID,
    assigned_to     UUID,
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      VARCHAR(128),
    updated_by      VARCHAR(128)
);

CREATE INDEX idx_clinic_maint_tenant  ON clinic_maintenance_requests (tenant_id);
CREATE INDEX idx_clinic_maint_state   ON clinic_maintenance_requests (tenant_id, workflow_state);
CREATE INDEX idx_clinic_maint_asset   ON clinic_maintenance_requests (asset_id);
CREATE INDEX idx_clinic_maint_prio    ON clinic_maintenance_requests (tenant_id, priority, workflow_state);
