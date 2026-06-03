package com.platform.workflow.kernel.security.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndActiveTrue(String email);

    Optional<User> findByEmailAndTenantIdAndActiveTrue(String email, UUID tenantId);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);
}
