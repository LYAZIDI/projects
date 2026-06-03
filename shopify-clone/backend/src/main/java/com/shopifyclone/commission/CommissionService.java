package com.shopifyclone.commission;

import com.shopifyclone.domain.artisan.ArtisanProfile;
import com.shopifyclone.domain.commission.Commission;
import com.shopifyclone.domain.commission.CommissionStatus;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.order.Order;
import com.shopifyclone.repository.ArtisanProfileRepository;
import com.shopifyclone.repository.CommissionRepository;
import com.shopifyclone.repository.MerchantProfileRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Transfer;
import com.stripe.param.TransferCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommissionService {

    private final CommissionRepository commissionRepository;
    private final ArtisanProfileRepository artisanProfileRepository;
    private final MerchantProfileRepository merchantProfileRepository;

    @Value("${app.stripe.secret-key}")
    private String stripeSecretKey;

    private static final double PLATFORM_RATE = 0.15;

    // Called when an order is confirmed (payment succeeded)
    @Transactional
    public Commission calculateAndCreate(Order order, Long artisanUserId, Long merchantUserId, BigDecimal saleAmount, BigDecimal wholesaleAmount) {
        ArtisanProfile artisan = artisanProfileRepository.findByUserId(artisanUserId).orElse(null);
        MerchantProfile merchant = merchantProfileRepository.findByUserId(merchantUserId).orElse(null);

        BigDecimal platformAmount = saleAmount.multiply(BigDecimal.valueOf(PLATFORM_RATE)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal merchantProfit = saleAmount.subtract(wholesaleAmount).subtract(platformAmount);

        Commission commission = Commission.builder()
                .order(order)
                .artisan(artisan)
                .merchant(merchant)
                .saleAmount(saleAmount)
                .wholesaleAmount(wholesaleAmount)
                .platformAmount(platformAmount)
                .merchantProfit(merchantProfit)
                .commissionRate(PLATFORM_RATE)
                .status(CommissionStatus.CALCULATED)
                .build();

        return commissionRepository.save(commission);
    }

    // Transfer money to artisan via Stripe Connect
    @Transactional
    public Commission transferToArtisan(Long commissionId) {
        Commission commission = commissionRepository.findById(commissionId)
                .orElseThrow(() -> new RuntimeException("Commission not found"));

        if (commission.getArtisan() == null || commission.getArtisan().getStripeAccountId() == null) {
            log.warn("Artisan has no Stripe Connect account, skipping transfer");
            return commission;
        }

        try {
            Stripe.apiKey = stripeSecretKey;
            long amountInCents = commission.getWholesaleAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValue();

            Transfer transfer = Transfer.create(TransferCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("eur")
                    .setDestination(commission.getArtisan().getStripeAccountId())
                    .build());

            commission.setStripeTransferId(transfer.getId());
            commission.setStatus(CommissionStatus.TRANSFERRED);
            commission.setPaidAt(LocalDateTime.now());

        } catch (StripeException e) {
            log.error("Stripe transfer failed: {}", e.getMessage());
            commission.setStatus(CommissionStatus.FAILED);
        }

        return commissionRepository.save(commission);
    }

    public RevenueStats getArtisanStats(Long artisanUserId) {
        ArtisanProfile artisan = artisanProfileRepository.findByUserId(artisanUserId)
                .orElseThrow(() -> new RuntimeException("Artisan not found"));

        BigDecimal totalEarnings = commissionRepository.getTotalEarningsByArtisan(artisan.getId());
        long totalOrders = commissionRepository.findByArtisanId(artisan.getId(), PageRequest.of(0, 1)).getTotalElements();

        return new RevenueStats(
            artisan.getBrandName(),
            totalEarnings,
            totalOrders,
            artisan.getRating(),
            artisan.getReviewCount()
        );
    }

    public RevenueStats getMerchantStats(Long merchantUserId) {
        MerchantProfile merchant = merchantProfileRepository.findByUserId(merchantUserId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        BigDecimal totalProfit = commissionRepository.getTotalProfitByMerchant(merchant.getId());
        long totalOrders = commissionRepository.findByMerchantId(merchant.getId(), PageRequest.of(0, 1)).getTotalElements();

        return new RevenueStats(
            merchant.getBrandName(),
            totalProfit,
            totalOrders,
            0.0,
            0
        );
    }

    public BigDecimal getPlatformRevenue() {
        return commissionRepository.getTotalPlatformRevenue();
    }

    public Page<Commission> getArtisanCommissions(Long artisanUserId, int page, int size) {
        ArtisanProfile artisan = artisanProfileRepository.findByUserId(artisanUserId)
                .orElseThrow(() -> new RuntimeException("Artisan not found"));
        return commissionRepository.findByArtisanId(artisan.getId(), PageRequest.of(page, size));
    }

    public Page<Commission> getMerchantCommissions(Long merchantUserId, int page, int size) {
        MerchantProfile merchant = merchantProfileRepository.findByUserId(merchantUserId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));
        return commissionRepository.findByMerchantId(merchant.getId(), PageRequest.of(page, size));
    }

    public record RevenueStats(
        String name,
        BigDecimal totalRevenue,
        long totalOrders,
        double rating,
        int reviewCount
    ) {}
}
