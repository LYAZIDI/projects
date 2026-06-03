package com.platform.workflow.kernel.workflow.spi;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;

import java.util.Map;
import java.util.UUID;

/**
 * PORT — bridges the workflow engine to a domain entity.
 *
 * <p>The engine knows nothing about domain entities. Each domain module
 * (CRM, HR, Finance, Support) provides exactly one adapter per entity type.
 *
 * <h3>Contract</h3>
 * <ol>
 *   <li>{@link #entityType()} must match the {@code entityType} declared in WorkflowDefinition.</li>
 *   <li>{@link #loadEntity(UUID, String)} must return a flat map of field values
 *       used by condition evaluators (e.g. total, contactId, status).</li>
 *   <li>{@link #updateState(UUID, String, String, ExecutionContext)} runs INSIDE
 *       the engine transaction — use the injected EntityManager or the Spring
 *       transactional context, never open a new transaction here.</li>
 * </ol>
 *
 * <h3>Registration</h3>
 * <pre>{@code
 * @Component
 * public class LeadEntityAdapter implements EntityAdapter {
 *     public String entityType() { return "lead"; }
 *     ...
 * }
 * }</pre>
 * The engine discovers all EntityAdapter beans at startup via the
 * {@link com.platform.workflow.kernel.workflow.registry.EntityAdapterRegistry}.
 *
 * <h3>Thread safety</h3>
 * Implementations must be stateless. Spring instantiates them as singletons.
 */
public interface EntityAdapter {

    /**
     * The logical entity type key this adapter handles.
     * Must be lowercase snake_case, unique per deployment.
     *
     * @return e.g. "lead", "invoice", "employee", "support_ticket"
     */
    String entityType();

    /**
     * Load the domain entity as a flat property map for condition evaluation.
     *
     * <p>The map is READ-ONLY. Condition evaluators inspect values here.
     * Keys should be camelCase field names (e.g. "contactId", "total", "status").
     *
     * @param tenantId  multi-tenant isolation filter
     * @param entityId  domain entity primary key (UUID string)
     * @return field map, or empty map if entity not found (engine will throw ENTITY_NOT_FOUND)
     */
    Map<String, Object> loadEntity(UUID tenantId, String entityId);

    /**
     * Persist the new workflow state to the domain entity.
     *
     * <p>Called INSIDE the engine's @Transactional block (step 8b).
     * Use the JPA EntityManager or Spring Data repository directly —
     * the transaction context is inherited from the engine.
     *
     * <p>The {@code context.getPayload()} map contains values set by pre-commit
     * actions (e.g. sentAt, confirmedAt, lostReason). Adapters should merge
     * these into the domain entity before persisting.
     *
     * @param tenantId  multi-tenant isolation filter
     * @param entityId  domain entity primary key
     * @param newState  the target state key (e.g. "sent", "approved")
     * @param context   full execution context including enriched payload
     */
    void updateState(UUID tenantId, String entityId, String newState, ExecutionContext context);
}
