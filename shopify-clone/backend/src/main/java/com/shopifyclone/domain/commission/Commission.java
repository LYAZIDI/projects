package com.shopifyclone.domain.commission;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.shopifyclone.domain.artisan.ArtisanProfile;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.order.Order;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "commissions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Commission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artisan_id")
    private ArtisanProfile artisan;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id")
    private MerchantProfile merchant;

    // Financial breakdown
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal saleAmount;       // Total customer paid

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal wholesaleAmount;  // Artisan receives

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal platformAmount;   // Platform commission

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal merchantProfit;   // Merchant margin

    private Double commissionRate;        // e.g. 0.15 = 15%

    @Enumerated(EnumType.STRING)
    private CommissionStatus status;

    private String stripeTransferId;      // Stripe transfer to artisan
    private String stripePlatformChargeId;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = CommissionStatus.PENDING;
    }
}
