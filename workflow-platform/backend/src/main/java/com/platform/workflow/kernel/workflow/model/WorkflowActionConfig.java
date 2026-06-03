package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.Audited;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

/**
 * Configuration record for a single action attached to a transition.
 *
 * <p>Actions run pre-commit (step 7 in the engine pipeline), before the DB transaction.
 * They can enrich {@code ExecutionContext.payload} so the EntityAdapter can persist
 * derived fields (e.g. sentAt, confirmedAt, approvedBy).
 *
 * <p>Built-in types: set_field, copy_payload_field, emit_event.
 * Custom types: registered via @Component implementing WorkflowActionExecutor.
 */
@Entity
@Table(name = "wf_action_configs")
@Audited
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowActionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transition_id", nullable = false)
    private WorkflowTransition transition;

    /** Matches a bean registered in WorkflowActionRegistry. */
    @Column(name = "type", nullable = false, length = 64)
    private String type;

    /**
     * Arbitrary configuration passed verbatim to the executor.
     * Example: {"field": "sentAt", "value": "__NOW__"}
     * Example: {"eventType": "quote.sent"}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> config;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

}
