package com.platform.workflow.marketplace.service;

import com.platform.workflow.marketplace.domain.WorkflowTemplate;
import com.platform.workflow.marketplace.domain.WorkflowTemplateVersion;
import com.platform.workflow.marketplace.dto.MarketplaceRequest.*;
import com.platform.workflow.marketplace.dto.MarketplaceResponse.*;
import com.platform.workflow.marketplace.dto.WorkflowDefinitionSnapshot;
import com.platform.workflow.marketplace.repository.WorkflowTemplateInstallRepository;
import com.platform.workflow.marketplace.repository.WorkflowTemplateRepository;
import com.platform.workflow.marketplace.repository.WorkflowTemplateVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * WorkflowMarketplaceService — catalog browsing + template publication.
 *
 * <p>Separation of concerns:
 * <ul>
 *   <li>This service handles READ operations (catalog) and WRITE operations (publish)</li>
 *   <li>The ImportService handles install (write to the workflow engine)</li>
 *   <li>No business logic is duplicated across both</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkflowMarketplaceService {

    private final WorkflowTemplateRepository        templateRepository;
    private final WorkflowTemplateVersionRepository versionRepository;
    private final WorkflowTemplateInstallRepository installRepository;

    // ── Catalog browse ────────────────────────────────────────────────────────

    /**
     * Paginated catalog listing.
     * Filters by category (optional) and adds an installedByTenant flag for the UI.
     */
    public Page<TemplateSummary> listTemplates(
        UUID tenantId,
        String category,
        Pageable pageable
    ) {
        Set<UUID> installedIds = installRepository.findInstalledTemplateIdsByTenant(tenantId);

        return templateRepository
            .findVisibleTemplates(tenantId, category, pageable)
            .map(t -> toSummary(t, installedIds.contains(t.getId())));
    }

    /** Featured templates for the marketplace homepage. */
    public List<TemplateSummary> listFeatured(UUID tenantId) {
        Set<UUID> installedIds = installRepository.findInstalledTemplateIdsByTenant(tenantId);
        return templateRepository.findFeatured().stream()
            .map(t -> toSummary(t, installedIds.contains(t.getId())))
            .collect(Collectors.toList());
    }

    /** Full template detail including all versions and the latest definition snapshot. */
    public TemplateDetail getTemplate(UUID templateId, UUID tenantId) {
        WorkflowTemplate template = templateRepository.findById(templateId)
            .filter(t -> isVisible(t, tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateId));

        List<WorkflowTemplateVersion> versions =
            versionRepository.findByTemplateIdOrderByVersionDesc(templateId);

        WorkflowTemplateVersion latest = versions.stream()
            .filter(WorkflowTemplateVersion::isLatest)
            .findFirst()
            .orElse(versions.isEmpty() ? null : versions.get(0));

        boolean installed = installRepository.existsByTenantIdAndTemplateId(tenantId, templateId);

        return TemplateDetail.builder()
            .id(template.getId())
            .slug(template.getSlug())
            .name(template.getName())
            .shortDesc(template.getShortDesc())
            .description(template.getDescription())
            .category(template.getCategory())
            .tags(template.getTags())
            .entityTypeHint(template.getEntityTypeHint())
            .publisherName(template.getPublisherName())
            .visibleScope(template.getVisibleScope().name())
            .installCount(template.getInstallCount())
            .ratingAvg(template.getRatingAvg())
            .ratingCount(template.getRatingCount())
            .featured(template.isFeatured())
            .createdAt(template.getCreatedAt())
            .updatedAt(template.getUpdatedAt())
            .versions(versions.stream().map(this::toVersionSummary).collect(Collectors.toList()))
            .latestVersion(latest != null ? toVersionDetail(latest) : null)
            .installedByTenant(installed)
            .build();
    }

    /** Version history for a template. */
    public List<VersionSummary> getVersions(UUID templateId, UUID tenantId) {
        templateRepository.findById(templateId)
            .filter(t -> isVisible(t, tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateId));

        return versionRepository
            .findByTemplateIdOrderByVersionDesc(templateId)
            .stream()
            .map(this::toVersionSummary)
            .collect(Collectors.toList());
    }

    /** Full version detail with definition snapshot (for preview). */
    public VersionDetail getVersion(UUID versionId, UUID tenantId) {
        return versionRepository.findById(versionId)
            .filter(v -> isVisible(v.getTemplate(), tenantId))
            .map(this::toVersionDetail)
            .orElseThrow(() -> new IllegalArgumentException("Version not found: " + versionId));
    }

    // ── Template publication ──────────────────────────────────────────────────

    @Transactional
    public TemplateDetail publishTemplate(PublishTemplateRequest req, UUID publisherTenantId, String publisherId) {
        if (templateRepository.findBySlug(req.getSlug()).isPresent()) {
            throw new IllegalArgumentException("Slug already in use: " + req.getSlug());
        }

        WorkflowTemplate template = WorkflowTemplate.builder()
            .slug(req.getSlug())
            .name(req.getName())
            .shortDesc(req.getShortDesc())
            .description(req.getDescription())
            .category(req.getCategory())
            .tags(req.getTags() != null ? req.getTags() : List.of())
            .entityTypeHint(req.getEntityTypeHint())
            .publisherTenantId(publisherTenantId)
            .publisherName(req.getPublisherName())
            .visibleScope(parseScope(req.getVisibleScope()))
            .active(true)
            .build();

        template = templateRepository.save(template);

        // Save the first version
        versionRepository.markAllNotLatest(template.getId());
        WorkflowTemplateVersion version = WorkflowTemplateVersion.fromSemver(req.getSemver())
            .template(template)
            .definition(req.getDefinition())
            .changelog(req.getChangelog())
            .latest(true)
            .publishedBy(publisherId)
            .build();

        versionRepository.save(version);

        return getTemplate(template.getId(), publisherTenantId);
    }

    /** Add a new version to an existing template. */
    @Transactional
    public VersionDetail addVersion(UUID templateId, AddVersionRequest req, UUID publisherTenantId, String publisherId) {
        WorkflowTemplate template = templateRepository.findById(templateId)
            .filter(t -> t.getPublisherTenantId().equals(publisherTenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found or not owned by tenant"));

        if (versionRepository.existsByTemplateIdAndSemver(templateId, req.getSemver())) {
            throw new IllegalArgumentException("Version " + req.getSemver() + " already exists");
        }

        versionRepository.markAllNotLatest(templateId);

        WorkflowTemplateVersion version = WorkflowTemplateVersion.fromSemver(req.getSemver())
            .template(template)
            .definition(req.getDefinition())
            .changelog(req.getChangelog())
            .latest(true)
            .publishedBy(publisherId)
            .build();

        return toVersionDetail(versionRepository.save(version));
    }

    // ── Tenant installs list ──────────────────────────────────────────────────

    public List<InstallSummary> listMyInstalls(UUID tenantId) {
        return installRepository.findByTenantIdWithDetails(tenantId).stream()
            .map(i -> InstallSummary.builder()
                .installId(i.getId())
                .templateId(i.getTemplate().getId())
                .templateName(i.getTemplate().getName())
                .templateSlug(i.getTemplate().getSlug())
                .installedVersion(i.getTemplateVersion().getSemver())
                .resultingDefinitionId(i.getResultingDefinitionId())
                .entityType(i.getCustomEntityType() != null
                    ? i.getCustomEntityType()
                    : i.getTemplate().getEntityTypeHint())
                .label(i.getCustomLabel() != null ? i.getCustomLabel() : i.getTemplate().getName())
                .installedAt(i.getInstalledAt())
                .build())
            .collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private boolean isVisible(WorkflowTemplate t, UUID tenantId) {
        return switch (t.getVisibleScope()) {
            case PUBLIC, UNLISTED -> true;
            case TENANT -> t.getPublisherTenantId().equals(tenantId);
        };
    }

    private WorkflowTemplate.VisibleScope parseScope(String s) {
        try { return WorkflowTemplate.VisibleScope.valueOf(s); }
        catch (Exception e) { return WorkflowTemplate.VisibleScope.PUBLIC; }
    }

    private TemplateSummary toSummary(WorkflowTemplate t, boolean installedByTenant) {
        String latestSemver = versionRepository.findByTemplateIdAndLatestTrue(t.getId())
            .map(WorkflowTemplateVersion::getSemver).orElse(null);

        return TemplateSummary.builder()
            .id(t.getId())
            .slug(t.getSlug())
            .name(t.getName())
            .shortDesc(t.getShortDesc())
            .category(t.getCategory())
            .tags(t.getTags())
            .entityTypeHint(t.getEntityTypeHint())
            .publisherName(t.getPublisherName())
            .visibleScope(t.getVisibleScope().name())
            .installCount(t.getInstallCount())
            .ratingAvg(t.getRatingAvg())
            .ratingCount(t.getRatingCount())
            .featured(t.isFeatured())
            .latestSemver(latestSemver)
            .updatedAt(t.getUpdatedAt())
            .installedByTenant(installedByTenant)
            .build();
    }

    private VersionSummary toVersionSummary(WorkflowTemplateVersion v) {
        return VersionSummary.builder()
            .id(v.getId())
            .semver(v.getSemver())
            .changelog(v.getChangelog())
            .latest(v.isLatest())
            .publishedAt(v.getPublishedAt())
            .build();
    }

    private VersionDetail toVersionDetail(WorkflowTemplateVersion v) {
        return VersionDetail.builder()
            .id(v.getId())
            .semver(v.getSemver())
            .changelog(v.getChangelog())
            .latest(v.isLatest())
            .publishedAt(v.getPublishedAt())
            .definition(v.getDefinition())
            .build();
    }
}
