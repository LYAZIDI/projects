package com.platform.workflow.clinic.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Clinic patient visit (séjour).
 *
 * <p>Workflow states: CREATED → CHECKED_IN → ASSIGNED_TO_BED → IN_PROGRESS → READY_FOR_DISCHARGE → CLOSED
 */
@Entity
@Table(
    name = "clinic_visits",
    uniqueConstraints = @UniqueConstraint(name = "uq_clinic_visit_number", columnNames = {"tenant_id", "visit_number"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PatientVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "visit_number", nullable = false, length = 32)
    private String visitNumber;

    @Column(name = "admission_type", nullable = false, length = 32)
    @Builder.Default
    private String admissionType = "STANDARD";

    @Column(name = "chief_complaint", columnDefinition = "TEXT")
    private String chiefComplaint;

    // ── Workflow mirror ───────────────────────────────────────────────────────
    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "CREATED";

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    @Column(name = "check_in_at")  private Instant checkInAt;
    @Column(name = "check_out_at") private Instant checkOutAt;

    @Column(name = "assigned_bed_id")  private UUID assignedBedId;
    @Column(name = "assigned_room_id") private UUID assignedRoomId;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @CreatedDate  @Column(name = "created_at", updatable = false) private Instant createdAt;
    @LastModifiedDate @Column(name = "updated_at")                private Instant updatedAt;
    @CreatedBy    @Column(name = "created_by", updatable = false) private String createdBy;
    @LastModifiedBy   @Column(name = "updated_by")               private String updatedBy;

    // ── Relations ─────────────────────────────────────────────────────────────
    @OneToOne(mappedBy = "visit", fetch = FetchType.LAZY)
    private BedAssignment bedAssignment;
}
