package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Tracks the current workflow state of a single domain entity.
 *
 * <p>The instance is the runtime counterpart of the definition.
 * One instance per (tenantId, entityType, entityId) — enforced by unique constraint.
 *
 * <p>On first encounter, the engine creates an instance with the definition's initialState.
 * This enables retroactive workflow enrollment for entities created before the engine was deployed.
 *
 * <p>NOT audited via Envers (too write-heavy) — the ExecutionLog serves as the immutable trail.
 */
@Entity
@Table(
    name = "wf_instances",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_wf_instance_entity",
        columnNames = {"tenant_id", "entity_type", "entity_id"}
    ),
    indexes = {
        @Index(name = "idx_wf_instance_def", columnList = "definition_id"),
        @Index(name = "idx_wf_instance_tenant_state", columnList = "tenant_id, entity_type, current_state_key")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    /** The definition that governs this instance's state machine. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "definition_id", nullable = false)
    private WorkflowDefinition definition;

    /** e.g. "lead", "invoice", "employee_onboarding" */
    @Column(name = "entity_type", nullable = false, length = 64)
    private String entityType;

    /** The domain entity's primary key (UUID string). */
    @Column(name = "entity_id", nullable = false, length = 36)
    private String entityId;

    /** The state key this entity currently occupies in the state machine. */
    @Column(name = "current_state_key", nullable = false, length = 64)
    private String currentStateKey;

    @Version
    @Column(name = "version")
    private Long version;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

}
