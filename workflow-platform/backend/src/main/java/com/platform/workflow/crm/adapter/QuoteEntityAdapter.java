package com.platform.workflow.crm.adapter;

import com.platform.workflow.crm.domain.Quote;
import com.platform.workflow.crm.repository.QuoteRepository;
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
 * EntityAdapter for the CRM Quote entity.
 *
 * <p>Quote status machine:
 * <pre>
 *   draft ──send──→ sent ──accept──→ accepted
 *                       ──reject──→ rejected
 *                       ──expire──→ expired
 * </pre>
 *
 * <p>Transition "send" requires the quote to have a non-empty contactId
 * (enforced by a {@code field_not_empty} condition in the definition).
 */
@Component
@RequiredArgsConstructor
public class QuoteEntityAdapter implements EntityAdapter {

    private final QuoteRepository quoteRepository;

    @Override
    public String entityType() {
        return "quote";
    }

    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        Quote quote = quoteRepository.findByIdAndTenantId(entityId, UUID.fromString(tenantId))
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Quote not found: " + entityId
            ));

        Map<String, Object> map = new HashMap<>();
        map.put("id",               quote.getId().toString());
        map.put("tenantId",         quote.getTenantId().toString());
        map.put("reference",        quote.getReference());
        map.put("status",           quote.getStatus());
        map.put("contactId",        quote.getContactId());
        map.put("contactName",      quote.getContactName());
        map.put("leadId",           quote.getLeadId());
        map.put("totalAmountExcl",  quote.getTotalAmountExcl());
        map.put("totalAmountIncl",  quote.getTotalAmountIncl());
        map.put("expiryDate",       quote.getExpiryDate());
        map.put("rejectionReason",  quote.getRejectionReason());
        return map;
    }

    @Override
    public void updateState(UUID entityId, String tenantId, String newStateKey, ExecutionContext ctx) {
        Quote quote = quoteRepository.findByIdAndTenantId(entityId, UUID.fromString(tenantId))
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Quote not found: " + entityId
            ));

        quote.setStatus(newStateKey);

        switch (newStateKey) {
            case "sent"     -> quote.setSentAt(Instant.now());
            case "accepted" -> quote.setAcceptedAt(Instant.now());
            case "rejected" -> {
                quote.setRejectedAt(Instant.now());
                Object reason = ctx.payloadGet("rejectionReason");
                if (reason != null) quote.setRejectionReason(reason.toString());
            }
        }

        quoteRepository.save(quote);
    }
}
