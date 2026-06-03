package com.platform.workflow.clinic.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Clinic Patient entity.
 *
 * <p>{@code workflowState} is the mirror of {@code wf_instances.current_state_key}.
 * It is NEVER updated directly — the {@link com.platform.workflow.clinic.adapter.PatientEntityAdapter}
 * updates it inside the workflow engine's transaction.
 *
 * <p>Workflow states: NEW → REGISTERED → DOCUMENTS_PENDING → ADMISSION_READY → ADMITTED → DISCHARGED → ARCHIVED
 */
@Entity
@Table(
    name = "clinic_patients",
    uniqueConstraints = @UniqueConstraint(name = "uq_clinic_patient_national_id", columnNames = {"tenant_id", "national_id"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "first_name", nullable = false, length = 128)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 128)
    private String lastName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 16)
    private String gender;

    @Column(name = "national_id", length = 64)
    private String nationalId;

    @Column(length = 32)
    private String phone;

    @Column(length = 128)
    private String email;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> address = Map.of();

    // ── Workflow mirror ───────────────────────────────────────────────────────
    /** Kept in sync by PatientEntityAdapter — do NOT update directly. */
    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "NEW";

    // ── Lifecycle timestamps set by adapter ───────────────────────────────────
    @Column(name = "registered_by")
    private UUID registeredBy;

    @Column(name = "admitted_at")
    private Instant admittedAt;

    @Column(name = "discharged_at")
    private Instant dischargedAt;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @CreatedDate  @Column(name = "created_at", updatable = false) private Instant createdAt;
    @LastModifiedDate @Column(name = "updated_at")                private Instant updatedAt;
    @CreatedBy    @Column(name = "created_by", updatable = false) private String createdBy;
    @LastModifiedBy   @Column(name = "updated_by")               private String updatedBy;

    // ── Relations (lazy — never fetch from adapter) ───────────────────────────
    @OneToMany(mappedBy = "patient", fetch = FetchType.LAZY)
    @Builder.Default
    private List<PatientVisit> visits = new ArrayList<>();

    @OneToMany(mappedBy = "patient", fetch = FetchType.LAZY)
    @Builder.Default
    private List<PatientDocument> documents = new ArrayList<>();
}
