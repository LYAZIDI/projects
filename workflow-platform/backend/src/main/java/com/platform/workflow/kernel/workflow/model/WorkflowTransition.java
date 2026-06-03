package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A directed edge in the state machine graph.
 *
 * <p>A transition connects two states and carries:
 * <ul>
 *   <li>an optional Spring Security permission string (enforced before conditions)</li>
 *   <li>a list of conditions (all must pass)</li>
 *   <li>a list of actions (executed pre-commit, in order)</li>
 * </ul>
 *
 * <p>The transition is the only place where business rules are declared.
 * The engine remains domain-agnostic.
 */
@Entity
@Table(
    name = "wf_transitions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_wf_transition_def_key",
        columnNames = {"definition_id", "key"}
    ),
    indexes = {
        @Index(name = "idx_wf_transition_from", columnList = "definition_id, from_state_key")
    }
)
@Audited
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "definition_id", nullable = false)
    private WorkflowDefinition definition;

    /** Unique within the definition (e.g. "send", "approve", "reject"). */
    @Column(name = "key", nullable = false, length = 64)
    private String key;

    @Column(name = "label", nullable = false, length = 128)
    private String label;

    @Column(name = "from_state_key", nullable = false, length = 64)
    private String fromStateKey;

    @Column(name = "to_state_key", nullable = false, length = 64)
    private String toStateKey;

    /**
     * Spring Security permission expression evaluated by the RBAC guard before
     * conditions are checked.
     *
     * <p>Examples:
     * <ul>
     *   <li>"QUOTE_APPROVE" → hasAuthority('QUOTE_APPROVE')</li>
     *   <li>null → no permission required (still requires authentication)</li>
     * </ul>
     */
    @Column(name = "required_permission", length = 128)
    private String requiredPermission;

    /** Human hint for UI button rendering (e.g. "primary", "danger"). */
    @Column(name = "ui_variant", length = 32)
    private String uiVariant;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    /**
     * Conditions evaluated in sortOrder.
     * ALL must pass for the transition to proceed (implicit AND).
     * If any fails → WorkflowException(CONDITION_FAILED, 422).
     */
    @OneToMany(
        mappedBy = "transition",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<WorkflowConditionConfig> conditions = new ArrayList<>();

    /**
     * Actions executed pre-commit in sortOrder.
     * Actions can mutate context.payload (e.g. set_field, compute_value).
     * The engine then passes the enriched payload to EntityAdapter.updateState().
     */
    @OneToMany(
        mappedBy = "transition",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<WorkflowActionConfig> actions = new ArrayList<>();
}
