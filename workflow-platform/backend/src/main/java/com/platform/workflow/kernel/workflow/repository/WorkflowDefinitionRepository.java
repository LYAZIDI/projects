package com.platform.workflow.kernel.workflow.repository;

import com.platform.workflow.kernel.workflow.model.WorkflowDefinition;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for workflow definitions.
 *
 * <p>The most critical query is {@link #findActiveByTenantAndType} — it is called
 * on every transition. It uses an EntityGraph to eagerly load states, transitions,
 * conditions, and actions in a single query, avoiding N+1 problems.
 *
 * <p>Results are cached (Spring Cache / Redis-ready). Cache is invalidated when
 * a definition is modified via the admin API.
 */
@Repository
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinition, UUID> {

    /**
     * Loads the active definition. Lazy collections are loaded within the caller's transaction.
     * This is the hot path — called on every applyTransition().
     */
    @Cacheable(value = "workflow-definitions", key = "#tenantId + ':' + #entityType")
    @Query("""
        SELECT d FROM WorkflowDefinition d
        WHERE d.tenantId = :tenantId
          AND d.entityType = :entityType
          AND d.isActive = true
        """)
    Optional<WorkflowDefinition> findActiveByTenantAndType(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType
    );

    /** List all definitions for a tenant (admin panel). */
    @Query("SELECT d FROM WorkflowDefinition d WHERE d.tenantId = :tenantId ORDER BY d.entityType, d.version DESC")
    List<WorkflowDefinition> findAllByTenantId(@Param("tenantId") UUID tenantId);

    /** Check if an active definition already exists (used before creating a new one). */
    boolean existsByTenantIdAndEntityTypeAndIsActiveTrue(UUID tenantId, String entityType);
}
