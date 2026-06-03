package com.shopifyclone.domain.artisan;

import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.shopifyclone.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "artisan_profiles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ArtisanProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String brandName;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String location;
    private String logoUrl;
    private String websiteUrl;

    // Leather specialties
    private String specialties; // e.g. "Jackets, Bags, Belts"
    private String leatherTypes; // e.g. "Full-grain, Nubuck, Suede"

    private boolean verified = false;

    // Stripe Connect (for direct payouts to artisan)
    private String stripeAccountId;
    private boolean stripeOnboarded = false;

    @Column(nullable = false)
    private Double commissionRate = 0.15; // Platform takes 15% by default

    private Integer totalSales = 0;
    private Double totalRevenue = 0.0;
    private Double rating = 0.0;
    private Integer reviewCount = 0;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @JsonGetter("specialties")
    public List<String> getSpecialtiesList() {
        if (specialties == null || specialties.isBlank()) return Collections.emptyList();
        return Arrays.stream(specialties.split(",")).map(String::trim).toList();
    }

    @JsonGetter("leatherTypes")
    public List<String> getLeatherTypesList() {
        if (leatherTypes == null || leatherTypes.isBlank()) return Collections.emptyList();
        return Arrays.stream(leatherTypes.split(",")).map(String::trim).toList();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
