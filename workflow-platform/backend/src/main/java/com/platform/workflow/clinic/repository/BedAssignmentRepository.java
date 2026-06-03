package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.BedAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BedAssignmentRepository extends JpaRepository<BedAssignment, UUID> {

    Optional<BedAssignment> findByVisitIdAndTenantId(UUID visitId, UUID tenantId);

    Optional<BedAssignment> findByVisitIdAndWorkflowStateAndTenantId(UUID visitId, String workflowState, UUID tenantId);
}
