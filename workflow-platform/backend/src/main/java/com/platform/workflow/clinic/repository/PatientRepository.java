package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Patient> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Patient> findByTenantIdAndWorkflowState(UUID tenantId, String workflowState, Pageable pageable);

    @Query("SELECT p FROM Patient p WHERE p.tenantId = :tenantId " +
           "AND (LOWER(p.lastName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(p.firstName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR p.nationalId LIKE CONCAT('%', :q, '%'))")
    Page<Patient> search(UUID tenantId, String q, Pageable pageable);

    @Query("SELECT p.workflowState, COUNT(p) FROM Patient p WHERE p.tenantId = :tenantId GROUP BY p.workflowState")
    List<Object[]> countByState(UUID tenantId);
}
