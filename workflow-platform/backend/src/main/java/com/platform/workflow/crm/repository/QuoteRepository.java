package com.platform.workflow.crm.repository;

import com.platform.workflow.crm.domain.Quote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QuoteRepository extends JpaRepository<Quote, UUID> {

    Optional<Quote> findByIdAndTenantId(UUID id, UUID tenantId);
}
