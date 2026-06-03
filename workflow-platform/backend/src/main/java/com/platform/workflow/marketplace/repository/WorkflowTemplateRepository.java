package com.platform.workflow.marketplace.repository;

import com.platform.workflow.marketplace.domain.WorkflowTemplate;
import com.platform.workflow.marketplace.domain.WorkflowTemplate.VisibleScope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkflowTemplateRepository extends JpaRepository<WorkflowTemplate, UUID> {

    /** Catalog browse: all public templates + tenant-owned private ones, sorted by featured then installs. */
    @Query("""
        SELECT t FROM WorkflowTemplate t
        WHERE t.active = true
          AND (t.visibleScope = 'PUBLIC'
               OR (t.visibleScope = 'TENANT' AND t.publisherTenantId = :tenantId)
               OR (t.visibleScope = 'UNLISTED' AND t.publisherTenantId = :tenantId))
          AND (:category IS NULL OR t.category = :category)
        ORDER BY t.featured DESC, t.installCount DESC, t.createdAt DESC
        """)
    Page<WorkflowTemplate> findVisibleTemplates(
        @Param("tenantId") UUID tenantId,
        @Param("category") String category,
        Pageable pageable
    );

    /** Featured templates for homepage hero section. */
    @Query("SELECT t FROM WorkflowTemplate t WHERE t.active = true AND t.featured = true AND t.visibleScope = 'PUBLIC'")
    List<WorkflowTemplate> findFeatured();

    Optional<WorkflowTemplate> findBySlug(String slug);

    /** Templates published by a specific tenant. */
    Page<WorkflowTemplate> findByPublisherTenantIdAndActiveTrue(UUID publisherTenantId, Pageable pageable);

    /** Increment install counter atomically. */
    @Modifying
    @Query("UPDATE WorkflowTemplate t SET t.installCount = t.installCount + 1 WHERE t.id = :id")
    void incrementInstallCount(@Param("id") UUID id);
}
