package com.platform.workflow.kernel.workflow.events;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.TransitionResult;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Published by the engine AFTER a successful transition commit.
 *
 * <p>Use for: downstream domain reactions (send email, create notification,
 * trigger another workflow, update a search index, call a webhook).
 *
 * <p>Best practice — use {@code @TransactionalEventListener(phase = AFTER_COMMIT)}
 * to guarantee the event is processed only after the DB transaction is durable.
 *
 * <h3>Example listener in the CRM module</h3>
 * <pre>{@code
 * @Component
 * public class LeadWonListener {
 *
 *     @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
 *     public void onTransitionCompleted(WorkflowTransitionCompletedEvent event) {
 *         if (!"lead".equals(event.getContext().getEntityType())) return;
 *         if (!"won".equals(event.getResult().getToState())) return;
 *         notificationService.notifyLeadWon(event.getContext().getEntityId());
 *     }
 * }
 * }</pre>
 */
@Getter
public class WorkflowTransitionCompletedEvent extends ApplicationEvent {

    private final ExecutionContext context;
    private final String          fromState;
    private final String          toState;
    private final TransitionResult result;

    public WorkflowTransitionCompletedEvent(Object source, ExecutionContext context,
                                            String fromState, String toState,
                                            TransitionResult result) {
        super(source);
        this.context   = context;
        this.fromState = fromState;
        this.toState   = toState;
        this.result    = result;
    }
}
