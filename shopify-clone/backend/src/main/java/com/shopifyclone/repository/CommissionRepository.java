package com.shopifyclone.repository;

import com.shopifyclone.domain.commission.Commission;
import com.shopifyclone.domain.commission.CommissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface CommissionRepository extends JpaRepository<Commission, Long> {
    Page<Commission> findByArtisanId(Long artisanId, Pageable pageable);
    Page<Commission> findByMerchantId(Long merchantId, Pageable pageable);
    Page<Commission> findByStatus(CommissionStatus status, Pageable pageable);

    @Query("SELECT COALESCE(SUM(c.wholesaleAmount), 0) FROM Commission c WHERE c.artisan.id = :artisanId AND c.status = 'TRANSFERRED'")
    BigDecimal getTotalEarningsByArtisan(@Param("artisanId") Long artisanId);

    @Query("SELECT COALESCE(SUM(c.merchantProfit), 0) FROM Commission c WHERE c.merchant.id = :merchantId")
    BigDecimal getTotalProfitByMerchant(@Param("merchantId") Long merchantId);

    @Query("SELECT COALESCE(SUM(c.platformAmount), 0) FROM Commission c WHERE c.status = 'TRANSFERRED'")
    BigDecimal getTotalPlatformRevenue();
}
