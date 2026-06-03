package com.platform.workflow.clinic.adapter;

import com.platform.workflow.clinic.domain.PatientDocument;
import com.platform.workflow.clinic.repository.PatientDocumentRepository;
import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.EntityAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Bridges the Workflow Engine to the {@link PatientDocument} entity.
 *
 * <p>Workflow states: UPLOADED → IN_REVIEW → APPROVED | REJECTED | EXPIRED
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PatientDocumentEntityAdapter implements EntityAdapter {

    private final PatientDocumentRepository documentRepo;

    @Override
    public String entityType() { return "patient_document"; }

    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        UUID tid = UUID.fromString(tenantId);
        PatientDocument doc = documentRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "PatientDocument not found: " + entityId));

        Map<String, Object> map = new HashMap<>();
        map.put("id",             doc.getId().toString());
        map.put("tenantId",       doc.getTenantId().toString());
        map.put("documentType",   doc.getDocumentType());
        map.put("fileName",       doc.getFileName());
        map.put("workflowState",  doc.getWorkflowState());
        map.put("patientId",      doc.getPatient().getId().toString());
        map.put("mimeType",       doc.getMimeType() != null ? doc.getMimeType() : "");
        return map;
    }

    @Override
    public void updateState(UUID entityId, String tenantId, String newState, ExecutionContext ctx) {
        UUID tid = UUID.fromString(tenantId);
        PatientDocument doc = documentRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "PatientDocument not found: " + entityId));

        doc.setWorkflowState(newState);

        if ("APPROVED".equals(newState) || "REJECTED".equals(newState)) {
            doc.setReviewedAt(Instant.now());
            Object reviewer = ctx.payloadGet("reviewedBy");
            if (reviewer != null) doc.setReviewedBy(UUID.fromString(reviewer.toString()));
        }

        documentRepo.save(doc);
        log.info("[ClinicWF] PatientDocument {} → {}", entityId, newState);
    }
}
