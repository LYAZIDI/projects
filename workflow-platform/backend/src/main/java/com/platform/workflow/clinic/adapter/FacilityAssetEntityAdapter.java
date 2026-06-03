package com.platform.workflow.clinic.adapter;

import com.platform.workflow.clinic.domain.FacilityAsset;
import com.platform.workflow.clinic.repository.FacilityAssetRepository;
import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.EntityAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Bridges the Workflow Engine to the {@link FacilityAsset} entity.
 *
 * <p>Workflow states: AVAILABLE → RESERVED → IN_USE → OUT_OF_SERVICE → MAINTENANCE → RETIRED
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FacilityAssetEntityAdapter implements EntityAdapter {

    private final FacilityAssetRepository assetRepo;

    @Override
    public String entityType() { return "facility_asset"; }

    @Override
    public Map<String, Object> loadEntity(UUID entityId, String tenantId) {
        UUID tid = UUID.fromString(tenantId);
        FacilityAsset asset = assetRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "FacilityAsset not found: " + entityId));

        boolean hasPendingMaintenance = asset.getMaintenanceRequests().stream()
            .anyMatch(m -> List.of("OPEN", "ASSIGNED", "IN_PROGRESS").contains(m.getWorkflowState()));

        Map<String, Object> map = new HashMap<>();
        map.put("id",                   asset.getId().toString());
        map.put("tenantId",             asset.getTenantId().toString());
        map.put("assetType",            asset.getAssetType());
        map.put("name",                 asset.getName());
        map.put("serialNumber",         asset.getSerialNumber() != null ? asset.getSerialNumber() : "");
        map.put("workflowState",        asset.getWorkflowState());
        map.put("hasPendingMaintenance",String.valueOf(hasPendingMaintenance));
        map.put("roomId",               asset.getRoom() != null ? asset.getRoom().getId().toString() : "");
        return map;
    }

    @Override
    public void updateState(UUID entityId, String tenantId, String newState, ExecutionContext ctx) {
        UUID tid = UUID.fromString(tenantId);
        FacilityAsset asset = assetRepo.findByIdAndTenantId(entityId, tid)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "FacilityAsset not found: " + entityId));

        asset.setWorkflowState(newState);
        assetRepo.save(asset);
        log.info("[ClinicWF] FacilityAsset {} → {}", entityId, newState);
    }
}
