package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.FacilityAsset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FacilityAssetRepository extends JpaRepository<FacilityAsset, UUID> {
    Optional<FacilityAsset> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<FacilityAsset> findByTenantId(UUID tenantId, Pageable pageable);
    Page<FacilityAsset> findByTenantIdAndWorkflowState(UUID tenantId, String state, Pageable pageable);
    long countByTenantIdAndWorkflowState(UUID tenantId, String state);
}
