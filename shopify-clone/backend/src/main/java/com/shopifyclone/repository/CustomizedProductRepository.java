package com.shopifyclone.repository;

import com.shopifyclone.domain.branding.CustomizedProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomizedProductRepository extends JpaRepository<CustomizedProduct, Long> {
    Page<CustomizedProduct> findByMerchantId(Long merchantId, Pageable pageable);
    Page<CustomizedProduct> findByMerchantIdAndPublished(Long merchantId, boolean published, Pageable pageable);
    List<CustomizedProduct> findByBaseProductId(Long baseProductId);
    Optional<CustomizedProduct> findBySlug(String slug);
    Page<CustomizedProduct> findByPublished(boolean published, Pageable pageable);
}
