package com.platform.workflow.marketplace.repository;

import com.platform.workflow.marketplace.domain.WorkflowTemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkflowTemplateVersionRepository extends JpaRepository<WorkflowTemplateVersion, UUID> {

    /** All versions of a template sorted newest first. */
    @Query("""
        SELECT v FROM WorkflowTemplateVersion v
        WHERE v.template.id = :templateId
        ORDER BY v.semverMajor DESC, v.semverMinor DESC, v.semverPatch DESC
        """)
    List<WorkflowTemplateVersion> findByTemplateIdOrderByVersionDesc(@Param("templateId") UUID templateId);

    /** The single latest version of a template. */
    Optional<WorkflowTemplateVersion> findByTemplateIdAndLatestTrue(UUID templateId);

    /** Mark all existing versions of a template as not-latest (call before saving the new one). */
    @Modifying
    @Query("UPDATE WorkflowTemplateVersion v SET v.latest = false WHERE v.template.id = :templateId")
    void markAllNotLatest(@Param("templateId") UUID templateId);

    /** Check version uniqueness within a template. */
    boolean existsByTemplateIdAndSemver(UUID templateId, String semver);
}
