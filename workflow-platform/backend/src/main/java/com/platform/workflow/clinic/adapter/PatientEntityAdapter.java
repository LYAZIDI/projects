package com.platform.workflow.clinic.adapter;

import com.platform.workflow.clinic.domain.Patient;
import com.platform.workflow.clinic.domain.PatientDocument;
import com.platform.workflow.clinic.repository.PatientDocumentRepository;
import com.platform.workflow.clinic.repository.PatientRepository;
import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.EntityAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/**
 * Bridges the Workflow Engine to the {@link Patient} domain entity.
 *
 * <h3>Computed fields exposed for condition evaluation</h3>
 * <ul>
 *   <li>{@code hasValidId}          — patient has an APPROVED identity document</li>
 *   <li>{@code hasValidInsurance}   — patient has APPROVED insurance</li>
 *   <li>{@code hasConsentSigned}    — patient has APPROVED consent form</li>
 *   <li>{@code documentsComplete}   — all required doc types present and APPROVED</li>
 *   <li>{@code nationalId}          — required for validate_documents condition</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PatientEntityAdapter implements EntityAdapter {

    private final PatientRepository        patientRepo;
    private final PatientDocumentRepository documentRepo;

    @Override
    public String entityType() { return "patient"; }

    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        UUID tid = UUID.fromString(tenantId);
        Patient patient = patientRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Patient not found: " + entityId));

        // Load document summary for condition evaluation
        List<Object[]> docRows = documentRepo.findTypeAndStateByPatient(entityId, tid);
        boolean hasId        = docRows.stream().anyMatch(r -> "ID".equals(r[0])        && "APPROVED".equals(r[1]));
        boolean hasInsurance = docRows.stream().anyMatch(r -> "INSURANCE".equals(r[0]) && "APPROVED".equals(r[1]));
        boolean hasConsent   = docRows.stream().anyMatch(r -> "CONSENT".equals(r[0])   && "APPROVED".equals(r[1]));
        boolean allApproved  = !docRows.isEmpty() && docRows.stream().allMatch(r -> "APPROVED".equals(r[1]));
        boolean docComplete  = hasId && hasInsurance && hasConsent && allApproved;

        Map<String, Object> map = new HashMap<>();
        map.put("id",                  patient.getId().toString());
        map.put("tenantId",            patient.getTenantId().toString());
        map.put("firstName",           patient.getFirstName());
        map.put("lastName",            patient.getLastName());
        map.put("nationalId",          patient.getNationalId());
        map.put("phone",               patient.getPhone());
        map.put("email",               patient.getEmail());
        map.put("workflowState",       patient.getWorkflowState());
        map.put("hasValidId",          String.valueOf(hasId));
        map.put("hasValidInsurance",   String.valueOf(hasInsurance));
        map.put("hasConsentSigned",    String.valueOf(hasConsent));
        map.put("documentsComplete",   String.valueOf(docComplete));
        return map;
    }

    @Override
    public void updateState(UUID entityId, String tenantId, String newState, ExecutionContext ctx) {
        UUID tid = UUID.fromString(tenantId);
        Patient patient = patientRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Patient not found: " + entityId));

        patient.setWorkflowState(newState);

        switch (newState) {
            case "REGISTERED" -> {
                Object userId = ctx.payloadGet("registeredBy");
                if (userId != null) patient.setRegisteredBy(UUID.fromString(userId.toString()));
            }
            case "ADMITTED" -> patient.setAdmittedAt(Instant.now());
            case "DISCHARGED" -> patient.setDischargedAt(Instant.now());
        }

        patientRepo.save(patient);
        log.info("[ClinicWF] Patient {} → {}", entityId, newState);
    }
}
