package com.platform.workflow.clinic.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Chambre / salle de la clinique. */
@Entity
@Table(
    name = "clinic_rooms",
    uniqueConstraints = @UniqueConstraint(name = "uq_clinic_room_code", columnNames = {"tenant_id", "code"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FacilityRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 32)
    private String code;        // ex: "CH-101"

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private int floor = 1;

    @Column(length = 64)
    private String wing;        // ex: "Aile Nord"

    @Column(name = "room_type", nullable = false, length = 32)
    @Builder.Default
    private String roomType = "STANDARD";  // STANDARD | VIP | ICU | OPERATING

    @Column(nullable = false)
    @Builder.Default
    private int capacity = 1;

    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY)
    @Builder.Default
    private List<FacilityBed> beds = new ArrayList<>();

    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY)
    @Builder.Default
    private List<FacilityAsset> assets = new ArrayList<>();
}
