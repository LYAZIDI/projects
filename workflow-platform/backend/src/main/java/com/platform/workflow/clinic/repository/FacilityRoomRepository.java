package com.platform.workflow.clinic.repository;

import com.platform.workflow.clinic.domain.FacilityRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FacilityRoomRepository extends JpaRepository<FacilityRoom, UUID> {
    List<FacilityRoom> findByTenantId(UUID tenantId);
    Optional<FacilityRoom> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<FacilityRoom> findByCodeAndTenantId(String code, UUID tenantId);
}
