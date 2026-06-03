package com.platform.workflow.kernel.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

/**
 * A named node in the state machine graph.
 *
 * <p>States are deliberately simple — they carry no business logic.
 * Logic lives in transitions, conditions, and actions.
 */
@Entity
@Table(
    name = "wf_states",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_wf_state_def_key",
        columnNames = {"definition_id", "key"}
    )
)
@Audited
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowState {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "definition_id", nullable = false)
    private WorkflowDefinition definition;

    /** Unique key within a definition (e.g. "draft", "sent", "approved"). */
    @Column(name = "key", nullable = false, length = 64)
    private String key;

    /** Human-readable label for UI rendering. */
    @Column(name = "label", length = 128)
    private String label;

    /** Color hint for UI (e.g. "#52c41a"). */
    @Column(name = "color", length = 16)
    private String color;

    /** Icon name for UI (e.g. "check_circle"). */
    @Column(name = "icon", length = 64)
    private String icon;

    /** Entities start here on their first workflow encounter. */
    @Column(name = "is_initial", nullable = false)
    @Builder.Default
    private boolean isInitial = false;

    /**
     * No outbound transitions are allowed from a final state.
     * The engine enforces this: attempting a transition from a final state
     * throws WorkflowException(TRANSITION_NOT_FOUND).
     */
    @Column(name = "is_final", nullable = false)
    @Builder.Default
    private boolean isFinal = false;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
