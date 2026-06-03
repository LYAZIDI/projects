package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.*;

@Entity
@Table(
    name = "wf_definitions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_wf_definition_tenant_type_version",
        columnNames = {"tenant_id", "entity_type", "version"}
    ),
    indexes = {
        @Index(name = "idx_wf_definitions_tenant_type", columnList = "tenant_id, entity_type")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Audited
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "entity_type", nullable = false, length = 64)
    private String entityType;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private int version = 1;

    @Column(name = "label", length = 128)
    private String label;

    @Column(name = "description")
    private String description;

    /** Maps to DB column "active" (not "is_active"). */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @OneToMany(
        mappedBy = "definition",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<WorkflowState> states = new ArrayList<>();

    @OneToMany(
        mappedBy = "definition",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<WorkflowTransition> transitions = new ArrayList<>();

    @NotAudited
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @NotAudited
    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Finds the initial state key from the states list (no DB column needed). */
    public String getInitialState() {
        return states.stream()
            .filter(WorkflowState::isInitial)
            .findFirst()
            .map(WorkflowState::getKey)
            .orElse(null);
    }

    public Optional<WorkflowState> findState(String key) {
        return states.stream().filter(s -> s.getKey().equals(key)).findFirst();
    }

    public Optional<WorkflowTransition> findTransition(String fromStateKey, String transitionKey) {
        return transitions.stream()
            .filter(t -> t.getFromStateKey().equals(fromStateKey) && t.getKey().equals(transitionKey))
            .findFirst();
    }

    public List<WorkflowTransition> transitionsFrom(String stateKey) {
        return transitions.stream()
            .filter(t -> t.getFromStateKey().equals(stateKey))
            .toList();
    }
}
