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
 * Demande de maintenance pour un équipement ou une chambre.
 *
 * <p>Workflow states: OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
 */
@Entity
@Table(name = "clinic_maintenance_requests")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MaintenanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private FacilityAsset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private FacilityRoom room;

    @Column(name = "request_type", nullable = false, length = 32)
    private String requestType;   // REPAIR | CLEANING | INSPECTION | REPLACEMENT

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String priority = "NORMAL";   // LOW | NORMAL | HIGH | URGENT

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    // ── Workflow mirror ───────────────────────────────────────────────────────
    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "OPEN";

    // ── Assignment fields set by adapter ──────────────────────────────────────
    @Column(name = "requested_by") private UUID requestedBy;
    @Column(name = "assigned_to")  private UUID assignedTo;
    @Column(name = "resolved_at")  private Instant resolvedAt;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @CreatedDate  @Column(name = "created_at", updatable = false) private Instant createdAt;
    @LastModifiedDate @Column(name = "updated_at")                private Instant updatedAt;
    @CreatedBy    @Column(name = "created_by", updatable = false) private String createdBy;
    @LastModifiedBy   @Column(name = "updated_by")               private String updatedBy;
}
