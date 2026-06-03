package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.PatientVisit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientVisitRepository extends JpaRepository<PatientVisit, UUID> {

    Optional<PatientVisit> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<PatientVisit> findByTenantId(UUID tenantId, Pageable pageable);

    List<PatientVisit> findByPatientIdAndTenantId(UUID patientId, UUID tenantId);

    Page<PatientVisit> findByTenantIdAndWorkflowState(UUID tenantId, String state, Pageable pageable);

    @Query("SELECT v.workflowState, COUNT(v) FROM PatientVisit v WHERE v.tenantId = :tenantId GROUP BY v.workflowState")
    List<Object[]> countByState(UUID tenantId);

    boolean existsByTenantIdAndVisitNumber(UUID tenantId, String visitNumber);
}
