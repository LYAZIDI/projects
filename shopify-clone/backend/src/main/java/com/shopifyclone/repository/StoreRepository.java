package com.shopifyclone.repository;

import com.shopifyclone.domain.store.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findBySlug(String slug);
    List<Store> findByOwnerId(Long ownerId);
    boolean existsBySlug(String slug);
}
