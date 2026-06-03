package com.platform.workflow.clinic.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Lit dans une chambre.
 *
 * <p>Workflow states (facility_asset): AVAILABLE → RESERVED → IN_USE → OUT_OF_SERVICE → MAINTENANCE → RETIRED
 */
@Entity
@Table(
    name = "clinic_beds",
    uniqueConstraints = @UniqueConstraint(name = "uq_clinic_bed_code", columnNames = {"tenant_id", "code"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FacilityBed {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private FacilityRoom room;

    @Column(nullable = false, length = 32)
    private String code;        // ex: "LIT-101-A"

    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "AVAILABLE";

    @Column(columnDefinition = "TEXT")
    private String notes;
}
