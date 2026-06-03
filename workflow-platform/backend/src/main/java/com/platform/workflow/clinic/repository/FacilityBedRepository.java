package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.FacilityBed;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FacilityBedRepository extends JpaRepository<FacilityBed, UUID> {
    Optional<FacilityBed> findByIdAndTenantId(UUID id, UUID tenantId);
    List<FacilityBed> findByTenantIdAndWorkflowState(UUID tenantId, String state);
    List<FacilityBed> findByRoomIdAndTenantId(UUID roomId, UUID tenantId);
    long countByTenantIdAndWorkflowState(UUID tenantId, String state);
}
