package com.platform.workflow.kernel.workflow.engine;

import lombok.Builder;
import lombok.Getter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable request context for a single workflow transition execution.
 *
 * <p>Carries everything the engine pipeline needs:
 * <ul>
 *   <li>Identity: who, which tenant, which entity</li>
 *   <li>Intent: which transition, what extra payload</li>
 *   <li>Tracing: correlationId for APM</li>
 * </ul>
 *
 * <p>{@code payload} is the only mutable field — actions enrich it pre-commit,
 * then EntityAdapter reads it to persist derived fields.
 */
@Getter
@Builder
public class ExecutionContext {

    /** Tenant isolation — injected from Spring Security context. */
    private final UUID tenantId;

    /** The actor's userId from the JWT. */
    private final String userId;

    /** The actor's email from the JWT. */
    private final String userEmail;

    /** e.g. "lead", "invoice", "employee" */
    private final String entityType;

    /** Domain entity primary key. */
    private final String entityId;

    /** The transition to apply. */
    private final String transitionKey;

    /**
     * Mutable enrichment map.
     *
     * <p>Callers provide initial values (e.g. lostReason from request body).
     * Actions add derived values (e.g. lostAt = NOW).
     * EntityAdapter reads and persists these.
     */
    @Builder.Default
    private final Map<String, Object> payload = new HashMap<>();

    /** APM correlation ID — injected from HTTP header or generated. */
    private final String correlationId;

    // ── Convenience accessors ────────────────────────────────────────────────

    public Object payloadGet(String key) {
        return payload.get(key);
    }

    public void payloadPut(String key, Object value) {
        payload.put(key, value);
    }

    public boolean payloadContains(String key) {
        Object val = payload.get(key);
        return val != null && !val.toString().isBlank();
    }
}
