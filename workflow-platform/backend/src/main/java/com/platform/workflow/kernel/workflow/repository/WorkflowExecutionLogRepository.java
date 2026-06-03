package com.platform.workflow.kernel.workflow.repository;

import com.platform.workflow.kernel.workflow.model.WorkflowExecutionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkflowExecutionLogRepository extends JpaRepository<WorkflowExecutionLog, UUID> {

    /**
     * Full audit trail for a single entity, newest first.
     * Used by the history endpoint and audit UI.
     */
    @Query("""
        SELECT l FROM WorkflowExecutionLog l
        WHERE l.tenantId = :tenantId
          AND l.entityType = :entityType
          AND l.entityId = :entityId
        ORDER BY l.executedAt DESC
        """)
    List<WorkflowExecutionLog> findHistoryForEntity(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType,
        @Param("entityId") String entityId
    );

    /** Paginated audit trail across all entities of a type — for compliance export. */
    @Query("""
        SELECT l FROM WorkflowExecutionLog l
        WHERE l.tenantId = :tenantId
          AND l.entityType = :entityType
          AND l.executedAt BETWEEN :from AND :to
        ORDER BY l.executedAt DESC
        """)
    Page<WorkflowExecutionLog> findByTenantAndTypeBetween(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType,
        @Param("from") Instant from,
        @Param("to") Instant to,
        Pageable pageable
    );

    /** Failed transitions only — for alerting / SLA monitoring. */
    @Query("""
        SELECT l FROM WorkflowExecutionLog l
        WHERE l.tenantId = :tenantId
          AND l.entityType = :entityType
          AND l.success = false
        ORDER BY l.executedAt DESC
        """)
    List<WorkflowExecutionLog> findFailuresForType(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType,
        Pageable pageable
    );
}
