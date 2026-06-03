package com.platform.workflow.clinic.adapter;

import com.platform.workflow.clinic.domain.PatientVisit;
import com.platform.workflow.clinic.repository.PatientVisitRepository;
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
 * Bridges the Workflow Engine to the {@link PatientVisit} entity.
 *
 * <h3>Computed fields</h3>
 * <ul>
 *   <li>{@code patientAdmitted} — true if the linked patient is in ADMITTED state</li>
 *   <li>{@code hasBedAssigned}  — true if a BedAssignment exists for this visit</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PatientVisitEntityAdapter implements EntityAdapter {

    private final PatientVisitRepository visitRepo;

    @Override
    public String entityType() { return "patient_visit"; }

    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        UUID tid = UUID.fromString(tenantId);
        PatientVisit visit = visitRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "PatientVisit not found: " + entityId));

        String patientState = visit.getPatient().getWorkflowState();
        boolean hasBed = visit.getBedAssignment() != null;

        Map<String, Object> map = new HashMap<>();
        map.put("id",              visit.getId().toString());
        map.put("tenantId",        visit.getTenantId().toString());
        map.put("visitNumber",     visit.getVisitNumber());
        map.put("admissionType",   visit.getAdmissionType());
        map.put("workflowState",   visit.getWorkflowState());
        map.put("patientAdmitted", String.valueOf("ADMITTED".equals(patientState)));
        map.put("hasBedAssigned",  String.valueOf(hasBed));
        map.put("assignedBedId",   visit.getAssignedBedId() != null ? visit.getAssignedBedId().toString() : "");
        return map;
    }

    @Override
    public void updateState(UUID entityId, String tenantId, String newState, ExecutionContext ctx) {
        UUID tid = UUID.fromString(tenantId);
        PatientVisit visit = visitRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "PatientVisit not found: " + entityId));

        visit.setWorkflowState(newState);

        switch (newState) {
            case "CHECKED_IN"  -> visit.setCheckInAt(Instant.now());
            case "ASSIGNED_TO_BED" -> {
                Object bedId = ctx.payloadGet("bedId");
                if (bedId != null) visit.setAssignedBedId(UUID.fromString(bedId.toString()));
            }
            case "CLOSED" -> visit.setCheckOutAt(Instant.now());
        }

        visitRepo.save(visit);
        log.info("[ClinicWF] PatientVisit {} → {}", entityId, newState);
    }
}
