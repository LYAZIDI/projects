package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.MaintenanceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, UUID> {
    Optional<MaintenanceRequest> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<MaintenanceRequest> findByTenantId(UUID tenantId, Pageable pageable);
    Page<MaintenanceRequest> findByTenantIdAndWorkflowState(UUID tenantId, String state, Pageable pageable);
    Page<MaintenanceRequest> findByTenantIdAndPriority(UUID tenantId, String priority, Pageable pageable);
    long countByTenantIdAndWorkflowState(UUID tenantId, String state);

    @Query("SELECT m.workflowState, COUNT(m) FROM MaintenanceRequest m WHERE m.tenantId = :tenantId GROUP BY m.workflowState")
    List<Object[]> countByState(UUID tenantId);
}
