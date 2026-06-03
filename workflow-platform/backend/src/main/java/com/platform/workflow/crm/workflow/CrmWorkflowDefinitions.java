package com.platform.workflow.crm.workflow;

import com.platform.workflow.kernel.workflow.model.*;
import com.platform.workflow.kernel.workflow.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class CrmWorkflowDefinitions {

    private final WorkflowDefinitionRepository definitionRepository;

    // ── Lead ─────────────────────────────────────────────────────────────────

    @Transactional
    public void seedLeadDefinition(UUID tenantId) {
        if (definitionRepository.findActiveByTenantAndType(tenantId, "lead").isPresent()) {
            log.info("[CRM] Lead workflow definition already exists for tenant {}", tenantId);
            return;
        }

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId)
            .entityType("lead")
            .version(1)
            .label("Lead Lifecycle")
            .description("Standard CRM lead state machine")
            .isActive(true)
            .build();

        WorkflowState open = state(def, "open",      "Open",      "#3B82F6", "circle",  true,  false, 0);
        WorkflowState won  = state(def, "won",       "Won",       "#22C55E", "trophy",  false, true,  1);
        WorkflowState lost = state(def, "lost",      "Lost",      "#EF4444", "x-circle",false, true,  2);
        WorkflowState canc = state(def, "cancelled", "Cancelled", "#6B7280", "archive", false, true,  3);

        def.setStates(List.of(open, won, lost, canc));

        WorkflowTransition win = transition(def, "win", "Mark as Won", "open", "won", "PERM_CRM_WRITE", "success");
        win.setConditions(List.of(
            condition(win, "field_not_empty", Map.of("field", "contactId"), 0)
        ));
        win.setActions(List.of(
            action(win, "copy_payload_field", Map.of("from", "contactId", "to", "contactId"), 0),
            action(win, "set_field",          Map.of("field", "wonAt", "value", "__NOW__"),    1),
            action(win, "emit_event",         Map.of("eventType", "lead.won"),                 2)
        ));

        WorkflowTransition lose = transition(def, "lose", "Mark as Lost", "open", "lost", "PERM_CRM_WRITE", "danger");
        lose.setConditions(List.of(
            condition(lose, "payload_field_not_empty", Map.of("field", "lostReason"), 0)
        ));
        lose.setActions(List.of(
            action(lose, "copy_payload_field", Map.of("from", "lostReason", "to", "lostReason"), 0),
            action(lose, "emit_event",         Map.of("eventType", "lead.lost"),                   1)
        ));

        WorkflowTransition cancel = transition(def, "cancel", "Cancel", "open", "cancelled", "PERM_CRM_DELETE", "warning");
        cancel.setActions(List.of(
            action(cancel, "emit_event", Map.of("eventType", "lead.cancelled"), 0)
        ));

        def.setTransitions(List.of(win, lose, cancel));

        definitionRepository.save(def);
        log.info("[CRM] Seeded Lead workflow definition for tenant {}", tenantId);
    }

    // ── Quote ─────────────────────────────────────────────────────────────────

    @Transactional
    public void seedQuoteDefinition(UUID tenantId) {
        if (definitionRepository.findActiveByTenantAndType(tenantId, "quote").isPresent()) {
            log.info("[CRM] Quote workflow definition already exists for tenant {}", tenantId);
            return;
        }

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId)
            .entityType("quote")
            .version(1)
            .label("Quote Lifecycle")
            .description("CRM quote approval state machine")
            .isActive(true)
            .build();

        WorkflowState draft    = state(def, "draft",    "Draft",    "#94A3B8", "file-edit",    true,  false, 0);
        WorkflowState sent     = state(def, "sent",     "Sent",     "#3B82F6", "send",         false, false, 1);
        WorkflowState accepted = state(def, "accepted", "Accepted", "#22C55E", "check-circle", false, true,  2);
        WorkflowState rejected = state(def, "rejected", "Rejected", "#EF4444", "x-circle",     false, true,  3);
        WorkflowState expired  = state(def, "expired",  "Expired",  "#6B7280", "clock",        false, true,  4);

        def.setStates(List.of(draft, sent, accepted, rejected, expired));

        WorkflowTransition send = transition(def, "send", "Send to Client", "draft", "sent", "PERM_CRM_WRITE", "primary");
        send.setConditions(List.of(
            condition(send, "field_not_empty", Map.of("field", "contactId"), 0)
        ));
        send.setActions(List.of(
            action(send, "set_field",  Map.of("field", "sentAt", "value", "__NOW__"), 0),
            action(send, "emit_event", Map.of("eventType", "quote.sent"),              1)
        ));

        WorkflowTransition accept = transition(def, "accept", "Accept", "sent", "accepted", "PERM_QUOTE_APPROVE", "success");
        accept.setActions(List.of(
            action(accept, "emit_event", Map.of("eventType", "quote.accepted"), 0)
        ));

        WorkflowTransition reject = transition(def, "reject", "Reject", "sent", "rejected", "PERM_CRM_WRITE", "danger");
        reject.setConditions(List.of(
            condition(reject, "payload_field_not_empty", Map.of("field", "rejectionReason"), 0)
        ));
        reject.setActions(List.of(
            action(reject, "copy_payload_field", Map.of("from", "rejectionReason", "to", "rejectionReason"), 0),
            action(reject, "emit_event",         Map.of("eventType", "quote.rejected"),                        1)
        ));

        WorkflowTransition expire = transition(def, "expire", "Mark Expired", "sent", "expired", "PERM_CRM_WRITE", "warning");
        expire.setActions(List.of(
            action(expire, "emit_event", Map.of("eventType", "quote.expired"), 0)
        ));

        def.setTransitions(List.of(send, accept, reject, expire));

        definitionRepository.save(def);
        log.info("[CRM] Seeded Quote workflow definition for tenant {}", tenantId);
    }

    // ── Builder helpers ───────────────────────────────────────────────────────

    private WorkflowState state(WorkflowDefinition def, String key, String label,
                                String color, String icon, boolean initial, boolean terminal, int order) {
        return WorkflowState.builder()
            .definition(def)
            .key(key).label(label).color(color).icon(icon)
            .isInitial(initial).isFinal(terminal).sortOrder(order)
            .build();
    }

    private WorkflowTransition transition(WorkflowDefinition def, String key, String label,
                                          String from, String to, String permission, String uiVariant) {
        return WorkflowTransition.builder()
            .definition(def)
            .key(key).label(label)
            .fromStateKey(from).toStateKey(to)
            .requiredPermission(permission)
            .uiVariant(uiVariant)
            .build();
    }

    private WorkflowConditionConfig condition(WorkflowTransition t, String type, Map<String, Object> config, int order) {
        return WorkflowConditionConfig.builder()
            .transition(t)
            .type(type)
            .config(config)
            .sortOrder(order)
            .build();
    }

    private WorkflowActionConfig action(WorkflowTransition t, String type, Map<String, Object> config, int order) {
        return WorkflowActionConfig.builder()
            .transition(t)
            .type(type)
            .config(config)
            .sortOrder(order)
            .build();
    }
}
