package com.platform.workflow.clinic.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** Liaison entre un lit et un séjour patient. */
@Entity
@Table(
    name = "clinic_bed_assignments",
    uniqueConstraints = @UniqueConstraint(name = "uq_clinic_bed_visit", columnNames = {"visit_id"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BedAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bed_id", nullable = false)
    private FacilityBed bed;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private PatientVisit visit;

    @Column(name = "workflow_state", nullable = false, length = 64)
    @Builder.Default
    private String workflowState = "ACTIVE";

    @Column(name = "assigned_at", nullable = false)
    @Builder.Default
    private Instant assignedAt = Instant.now();

    @Column(name = "released_at")
    private Instant releasedAt;
}
