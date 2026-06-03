package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.Audited;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

/**
 * Configuration record for a single condition attached to a transition.
 *
 * <p>The engine resolves the evaluator by {@code type} from the
 * {@link com.platform.workflow.kernel.workflow.registry.WorkflowConditionRegistry}
 * and passes {@code config} to its evaluate() method.
 *
 * <p>Built-in types: field_not_empty, field_comparison, payload_field_not_empty, state_match.
 * Custom types: registered via @Component implementing WorkflowConditionEvaluator.
 */
@Entity
@Table(name = "wf_condition_configs")
@Audited
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowConditionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transition_id", nullable = false)
    private WorkflowTransition transition;

    /** Matches a bean registered in WorkflowConditionRegistry. */
    @Column(name = "type", nullable = false, length = 64)
    private String type;

    /**
     * Arbitrary configuration passed verbatim to the evaluator.
     * Example: {"field": "total", "operator": "gt", "value": 0}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> config;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

}
