package com.shopifyclone.repository;

import com.shopifyclone.domain.artisan.ArtisanProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ArtisanProfileRepository extends JpaRepository<ArtisanProfile, Long> {
    Optional<ArtisanProfile> findByUserId(Long userId);
    Page<ArtisanProfile> findByVerified(boolean verified, Pageable pageable);

    @Query("SELECT a FROM ArtisanProfile a WHERE " +
           "LOWER(a.brandName) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(a.specialties) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<ArtisanProfile> search(@Param("q") String query, Pageable pageable);
}
