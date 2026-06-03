package com.shopifyclone.domain.merchant;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.shopifyclone.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "merchant_profiles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MerchantProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String brandName;

    private String brandLogoUrl;
    private String websiteUrl;
    private String description;
    private String industry;

    // Stripe Connect
    private String stripeAccountId;
    private boolean stripeOnboarded = false;

    private Integer totalProducts = 0;
    private Double totalRevenue = 0.0;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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
