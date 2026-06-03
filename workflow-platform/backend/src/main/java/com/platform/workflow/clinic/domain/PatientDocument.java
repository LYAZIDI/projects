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
 * Document associé à un patient (pièce d'identité, assurance, consentement…).
 *
 * <p>Workflow states: UPLOADED → IN_REVIEW → APPROVED | REJECTED | EXPIRED
 */
@Entity
@Table(name = "clinic_documents")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PatientDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id")
    private PatientVisit visit;

    @Column(name = "document_type", nullable = false, length = 64)
    private String documentType;   // ID | INSURANCE | CONSENT | LAB_RESULT | OTHER

    @Column(name = "file_name", nullable = false, length = 256)
    private String fileName;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Column(name = "mime_type", length = 128)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    // ── Workflow mirror ───────────────────────────────────────────────────────
    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "UPLOADED";

    // ── Review fields set by adapter ──────────────────────────────────────────
    @Column(name = "reviewed_by")  private UUID reviewedBy;
    @Column(name = "reviewed_at")  private Instant reviewedAt;
    @Column(name = "expires_at")   private Instant expiresAt;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @CreatedDate  @Column(name = "created_at", updatable = false) private Instant createdAt;
    @LastModifiedDate @Column(name = "updated_at")                private Instant updatedAt;
    @CreatedBy    @Column(name = "created_by", updatable = false) private String createdBy;
    @LastModifiedBy   @Column(name = "updated_by")               private String updatedBy;
}
