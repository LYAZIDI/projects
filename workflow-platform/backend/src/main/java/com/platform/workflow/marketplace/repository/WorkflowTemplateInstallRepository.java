package com.platform.workflow.marketplace.repository;

import com.platform.workflow.marketplace.domain.WorkflowTemplateInstall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface WorkflowTemplateInstallRepository extends JpaRepository<WorkflowTemplateInstall, UUID> {

    /** All installs for a given tenant (for "My Installs" page). */
    @Query("""
        SELECT i FROM WorkflowTemplateInstall i
        JOIN FETCH i.template t
        JOIN FETCH i.templateVersion v
        WHERE i.tenantId = :tenantId
        ORDER BY i.installedAt DESC
        """)
    List<WorkflowTemplateInstall> findByTenantIdWithDetails(@Param("tenantId") UUID tenantId);

    /** Check if a tenant has already installed a specific version. */
    boolean existsByTenantIdAndTemplateVersionId(UUID tenantId, UUID templateVersionId);

    /** Check if a tenant has installed ANY version of a template. */
    boolean existsByTenantIdAndTemplateId(UUID tenantId, UUID templateId);

    /** Find which templateIds have been installed by this tenant (for catalog UI badges). */
    @Query("SELECT i.template.id FROM WorkflowTemplateInstall i WHERE i.tenantId = :tenantId")
    Set<UUID> findInstalledTemplateIdsByTenant(@Param("tenantId") UUID tenantId);

    Optional<WorkflowTemplateInstall> findByTenantIdAndTemplateVersionId(UUID tenantId, UUID versionId);
}
