package com.platform.workflow.kernel.workflow.events;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Published by the engine BEFORE the transaction, just after pre-commit actions.
 *
 * <p>Use for: monitoring hooks, pre-flight async checks, tracing spans.
 * Do NOT perform DB writes here — the transaction has not committed yet.
 *
 * <p>Listeners must be annotated with {@code @EventListener} or
 * {@code @TransactionalEventListener(phase = BEFORE_COMMIT)}.
 */
@Getter
public class WorkflowTransitionStartedEvent extends ApplicationEvent {

    private final ExecutionContext context;
    private final String fromState;
    private final String toState;

    public WorkflowTransitionStartedEvent(Object source, ExecutionContext context,
                                          String fromState, String toState) {
        super(source);
        this.context   = context;
        this.fromState = fromState;
        this.toState   = toState;
    }
}
