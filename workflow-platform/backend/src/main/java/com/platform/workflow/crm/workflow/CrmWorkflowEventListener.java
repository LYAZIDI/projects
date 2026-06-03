package com.platform.workflow.crm.workflow;

import com.platform.workflow.kernel.workflow.events.WorkflowTransitionCompletedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for workflow events emitted by the engine after successful transitions.
 *
 * <p>{@link TransactionalEventListener} with AFTER_COMMIT guarantees:
 * <ul>
 *   <li>The DB state (wf_instance + lead/quote row) is already committed and visible</li>
 *   <li>Any downstream operation (email, push notification, webhook) operates on stable data</li>
 *   <li>Failures here do NOT roll back the workflow transaction</li>
 * </ul>
 *
 * <p>For high-volume production usage, replace the @Async handler with a message
 * queue (Kafka / SQS) to decouple delivery guarantees.
 */
@Component
@Slf4j
public class CrmWorkflowEventListener {

    /**
     * Fires after the transition commit. Dispatches to the appropriate CRM handler
     * based on the eventType annotated by {@link com.platform.workflow.kernel.workflow.actions.EmitEventAction}.
     *
     * <p>@Async requires @EnableAsync on the application class (already declared).
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onTransitionCompleted(WorkflowTransitionCompletedEvent event) {
        var ctx = event.getContext();
        @SuppressWarnings("unchecked")
        java.util.List<String> eventTypes = (java.util.List<String>)
            ctx.payloadGet(com.platform.workflow.kernel.workflow.actions.EmitEventAction.PAYLOAD_KEY);

        if (eventTypes == null || eventTypes.isEmpty()) return;

        for (String eventType : eventTypes) {
            log.info("[CRM] Handling event={} entity={}/{} correlationId={}",
                eventType, ctx.getEntityType(), ctx.getEntityId(), ctx.getCorrelationId());

            switch (eventType) {
                case "lead.won"        -> handleLeadWon(event);
                case "lead.lost"       -> handleLeadLost(event);
                case "lead.cancelled"  -> handleLeadCancelled(event);
                case "quote.sent"      -> handleQuoteSent(event);
                case "quote.accepted"  -> handleQuoteAccepted(event);
                case "quote.rejected"  -> handleQuoteRejected(event);
                default -> log.debug("[CRM] No handler for eventType={}", eventType);
            }
        }
    }

    // ── Lead event handlers ───────────────────────────────────────────────────

    private void handleLeadWon(WorkflowTransitionCompletedEvent event) {
        // TODO: trigger CRM notification, update pipeline KPIs, send congratulations email
        log.info("[CRM] Lead WON — entityId={} user={}",
            event.getContext().getEntityId(), event.getContext().getUserId());
    }

    private void handleLeadLost(WorkflowTransitionCompletedEvent event) {
        // TODO: start loss analysis workflow, notify manager
        log.info("[CRM] Lead LOST — entityId={} reason={}",
            event.getContext().getEntityId(), event.getContext().payloadGet("lostReason"));
    }

    private void handleLeadCancelled(WorkflowTransitionCompletedEvent event) {
        log.info("[CRM] Lead CANCELLED — entityId={}", event.getContext().getEntityId());
    }

    // ── Quote event handlers ──────────────────────────────────────────────────

    private void handleQuoteSent(WorkflowTransitionCompletedEvent event) {
        // TODO: send email with PDF attachment, start expiry countdown
        log.info("[CRM] Quote SENT — entityId={}", event.getContext().getEntityId());
    }

    private void handleQuoteAccepted(WorkflowTransitionCompletedEvent event) {
        // TODO: trigger order creation workflow, notify sales
        log.info("[CRM] Quote ACCEPTED — entityId={}", event.getContext().getEntityId());
    }

    private void handleQuoteRejected(WorkflowTransitionCompletedEvent event) {
        log.info("[CRM] Quote REJECTED — entityId={} reason={}",
            event.getContext().getEntityId(), event.getContext().payloadGet("rejectionReason"));
    }
}
