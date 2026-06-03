package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.PatientDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientDocumentRepository extends JpaRepository<PatientDocument, UUID> {

    Optional<PatientDocument> findByIdAndTenantId(UUID id, UUID tenantId);

    List<PatientDocument> findByPatientIdAndTenantId(UUID patientId, UUID tenantId);

    List<PatientDocument> findByPatientIdAndDocumentTypeAndTenantId(UUID patientId, String type, UUID tenantId);

    /** Used by PatientAdapter to compute documentsComplete. */
    @Query("SELECT d.documentType, d.workflowState FROM PatientDocument d " +
           "WHERE d.patient.id = :patientId AND d.tenantId = :tenantId")
    List<Object[]> findTypeAndStateByPatient(UUID patientId, UUID tenantId);

    long countByTenantIdAndWorkflowState(UUID tenantId, String state);
}
