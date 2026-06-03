package com.shopifyclone.repository;

import com.shopifyclone.domain.merchant.MerchantProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MerchantProfileRepository extends JpaRepository<MerchantProfile, Long> {
    Optional<MerchantProfile> findByUserId(Long userId);
}
