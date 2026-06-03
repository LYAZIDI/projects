package com.platform.workflow.kernel.workflow.repository;

import com.platform.workflow.kernel.workflow.model.WorkflowInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, UUID> {

    /**
     * Core lookup — one instance per (tenant, entityType, entityId).
     * Used by the engine on every applyTransition() call.
     */
    @Query("""
        SELECT i FROM WorkflowInstance i
        WHERE i.tenantId = :tenantId
          AND i.entityType = :entityType
          AND i.entityId = :entityId
        """)
    Optional<WorkflowInstance> findByTenantAndEntity(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType,
        @Param("entityId") String entityId
    );

    /** All instances in a given state (useful for background jobs, e.g. expire overdue quotes). */
    @Query("""
        SELECT i FROM WorkflowInstance i
        WHERE i.tenantId = :tenantId
          AND i.entityType = :entityType
          AND i.currentStateKey = :stateKey
        """)
    List<WorkflowInstance> findByTenantAndTypeAndState(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType,
        @Param("stateKey") String stateKey
    );

    /** Count entities per state — for dashboard KPIs. */
    @Query("""
        SELECT i.currentStateKey, COUNT(i)
        FROM WorkflowInstance i
        WHERE i.tenantId = :tenantId
          AND i.entityType = :entityType
        GROUP BY i.currentStateKey
        """)
    List<Object[]> countByStateForTenant(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType
    );
}
