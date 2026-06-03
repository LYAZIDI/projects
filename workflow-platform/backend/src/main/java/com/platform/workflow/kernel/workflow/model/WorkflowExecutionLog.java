package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable audit record of a single transition execution attempt.
 */
@Entity
@Table(
    name = "wf_execution_logs",
    indexes = {
        @Index(name = "idx_wf_exec_logs_entity",
               columnList = "tenant_id, entity_type, entity_id, created_at DESC"),
        @Index(name = "idx_wf_exec_logs_tenant_type_time",
               columnList = "tenant_id, entity_type, created_at DESC"),
        @Index(name = "idx_wf_exec_logs_errors",
               columnList = "tenant_id, entity_type, success")
    }
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowExecutionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "entity_type", nullable = false, length = 64)
    private String entityType;

    @Column(name = "entity_id", nullable = false, length = 64)
    private String entityId;

    @Column(name = "transition_key", nullable = false, length = 64)
    private String transitionKey;

    @Column(name = "from_state_key", nullable = false, length = 64)
    private String fromStateKey;

    @Column(name = "to_state_key", length = 64)
    private String toStateKey;

    @Column(name = "user_id", length = 128)
    private String userId;

    @Column(name = "user_email", length = 256)
    private String userEmail;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "success", nullable = false)
    private boolean success;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Long durationMs;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "actions_run", columnDefinition = "jsonb")
    private List<String> actionsRun;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> payloadSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant executedAt = Instant.now();
}
