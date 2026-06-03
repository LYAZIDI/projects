package com.platform.workflow.marketplace.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * WorkflowDefinitionSnapshot — the portable, tenant-neutral representation
 * of a workflow definition stored inside a marketplace template version.
 *
 * <p>This is a pure POJO (no JPA annotations) serialized to/from JSONB.
 * It mirrors the domain model but:
 * <ul>
 *   <li>Has NO tenantId — assigned at install time</li>
 *   <li>Has NO database IDs — new UUIDs are generated on import</li>
 *   <li>Is self-contained — conditions and actions embedded inside transitions</li>
 * </ul>
 *
 * <p>This is the "contract format" between the marketplace and the engine.
 * Any change to this class is a breaking change for stored template versions.
 * Use a version field in the JSON to support future migration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinitionSnapshot {

    /** Schema version of this snapshot format — increment on breaking changes. */
    @Builder.Default
    private int schemaVersion = 1;

    // ── Definition metadata ───────────────────────────────────────────────────

    private String entityType;     // advisory only — overridden at install
    private int    version;
    private String label;
    private String description;

    // ── States ────────────────────────────────────────────────────────────────

    @Builder.Default
    private List<StateSnapshot> states = new ArrayList<>();

    // ── Transitions ───────────────────────────────────────────────────────────

    @Builder.Default
    private List<TransitionSnapshot> transitions = new ArrayList<>();

    // ── Nested types ─────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StateSnapshot {
        private String  key;
        private String  label;
        private String  color;
        private String  icon;
        private boolean isInitial;
        private boolean isFinal;
        private int     sortOrder;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TransitionSnapshot {
        private String key;
        private String label;
        private String fromStateKey;
        private String toStateKey;
        private String requiredPermission;
        private String uiVariant;
        private int    sortOrder;

        @Builder.Default
        private List<ConfigSnapshot> conditions = new ArrayList<>();

        @Builder.Default
        private List<ConfigSnapshot> actions = new ArrayList<>();
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ConfigSnapshot {
        private String              type;
        private Map<String, Object> config;
        private int                 sortOrder;
    }
}
