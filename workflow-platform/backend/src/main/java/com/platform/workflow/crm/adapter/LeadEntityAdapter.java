package com.platform.workflow.crm.adapter;

import com.platform.workflow.crm.domain.Lead;
import com.platform.workflow.crm.repository.LeadRepository;
import com.platform.workflow.kernel.security.tenant.TenantContext;
import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.EntityAdapter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * EntityAdapter implementation for the CRM Lead entity.
 *
 * <p>Wires the workflow engine to the Lead JPA entity.
 * The engine calls {@link #loadEntity} to check conditions against real data,
 * then calls {@link #updateState} inside the same transaction to persist the
 * new status and any payload-driven fields.
 *
 * <p>Supported payload keys (sent by caller in the transition request):
 * <ul>
 *   <li>{@code lostReason} – persisted when transitioning to "lost"</li>
 *   <li>{@code contactId} – required by the "win" condition; persisted here as confirmation</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class LeadEntityAdapter implements EntityAdapter {

    private final LeadRepository leadRepository;

    @Override
    public String entityType() {
        return "lead";
    }

    /**
     * Load the lead as a flat {@code Map<String, Object>} for condition evaluation.
     * The engine never mutates this map — it is read-only context for conditions/actions.
     */
    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        Lead lead = leadRepository.findByIdAndTenantId(entityId, UUID.fromString(tenantId))
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Lead not found: " + entityId
            ));

        Map<String, Object> map = new HashMap<>();
        map.put("id",           lead.getId().toString());
        map.put("tenantId",     lead.getTenantId().toString());
        map.put("reference",    lead.getReference());
        map.put("title",        lead.getTitle());
        map.put("status",       lead.getStatus());
        map.put("contactId",    lead.getContactId());
        map.put("contactName",  lead.getContactName());
        map.put("contactEmail", lead.getContactEmail());
        map.put("lostReason",   lead.getLostReason());
        return map;
    }

    /**
     * Persist the new state onto the Lead after successful transition.
     *
     * <p>Called inside the engine's @Transactional boundary — no explicit save() needed
     * (dirty-checking will flush on commit).
     */
    @Override
    public void updateState(UUID entityId, String tenantId, String newStateKey, ExecutionContext ctx) {
        Lead lead = leadRepository.findByIdAndTenantId(entityId, UUID.fromString(tenantId))
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Lead not found: " + entityId
            ));

        lead.setStatus(newStateKey);

        switch (newStateKey) {
            case "won" -> {
                lead.setWonAt(Instant.now());
                // contactId may have been copied to payload by CopyPayloadFieldAction
                Object contactId = ctx.payloadGet("contactId");
                if (contactId != null) lead.setContactId(contactId.toString());
            }
            case "lost" -> {
                lead.setLostAt(Instant.now());
                Object reason = ctx.payloadGet("lostReason");
                if (reason != null) lead.setLostReason(reason.toString());
            }
            case "cancelled" -> lead.setCancelledAt(Instant.now());
        }

        // Explicit save is not needed (JPA dirty-checking), but helps readability
        // and avoids surprises if the entity were detached.
        leadRepository.save(lead);
    }
}
