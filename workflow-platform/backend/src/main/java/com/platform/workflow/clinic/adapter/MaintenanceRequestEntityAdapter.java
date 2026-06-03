package com.platform.workflow.clinic.adapter;

import com.platform.workflow.clinic.domain.MaintenanceRequest;
import com.platform.workflow.clinic.repository.MaintenanceRequestRepository;
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
 * Bridges the Workflow Engine to the {@link MaintenanceRequest} entity.
 *
 * <p>Workflow states: OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MaintenanceRequestEntityAdapter implements EntityAdapter {

    private final MaintenanceRequestRepository maintenanceRepo;

    @Override
    public String entityType() { return "maintenance_request"; }

    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        UUID tid = UUID.fromString(tenantId);
        MaintenanceRequest req = maintenanceRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "MaintenanceRequest not found: " + entityId));

        Map<String, Object> map = new HashMap<>();
        map.put("id",            req.getId().toString());
        map.put("tenantId",      req.getTenantId().toString());
        map.put("requestType",   req.getRequestType());
        map.put("priority",      req.getPriority());
        map.put("description",   req.getDescription());
        map.put("workflowState", req.getWorkflowState());
        map.put("assignedTo",    req.getAssignedTo() != null ? req.getAssignedTo().toString() : "");
        map.put("assetId",       req.getAsset() != null ? req.getAsset().getId().toString() : "");
        return map;
    }

    @Override
    public void updateState(UUID entityId, String tenantId, String newState, ExecutionContext ctx) {
        UUID tid = UUID.fromString(tenantId);
        MaintenanceRequest req = maintenanceRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "MaintenanceRequest not found: " + entityId));

        req.setWorkflowState(newState);

        switch (newState) {
            case "ASSIGNED" -> {
                Object tech = ctx.payloadGet("technicianId");
                if (tech != null) req.setAssignedTo(UUID.fromString(tech.toString()));
            }
            case "RESOLVED" -> req.setResolvedAt(Instant.now());
        }

        maintenanceRepo.save(req);
        log.info("[ClinicWF] MaintenanceRequest {} → {}", entityId, newState);
    }
}
