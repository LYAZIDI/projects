package com.platform.workflow.clinic.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Équipement / actif de la clinique (appareil, véhicule, dispositif médical…).
 *
 * <p>Workflow states: AVAILABLE → RESERVED → IN_USE → OUT_OF_SERVICE → MAINTENANCE → RETIRED
 */
@Entity
@Table(name = "clinic_assets")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FacilityAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private FacilityRoom room;

    @Column(name = "asset_type", nullable = false, length = 32)
    private String assetType;   // EQUIPMENT | VEHICLE | DEVICE | FURNITURE

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "serial_number", length = 64)
    private String serialNumber;

    @Column(name = "purchased_at")
    private LocalDate purchasedAt;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    // ── Workflow mirror ───────────────────────────────────────────────────────
    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "AVAILABLE";

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @CreatedDate  @Column(name = "created_at", updatable = false) private Instant createdAt;
    @LastModifiedDate @Column(name = "updated_at")                private Instant updatedAt;
    @CreatedBy    @Column(name = "created_by", updatable = false) private String createdBy;
    @LastModifiedBy   @Column(name = "updated_by")               private String updatedBy;

    @OneToMany(mappedBy = "asset", fetch = FetchType.LAZY)
    @Builder.Default
    private List<MaintenanceRequest> maintenanceRequests = new ArrayList<>();
}
