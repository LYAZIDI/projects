package com.platform.workflow.marketplace.api;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.marketplace.dto.MarketplaceRequest.*;
import com.platform.workflow.marketplace.dto.MarketplaceResponse.*;
import com.platform.workflow.marketplace.service.WorkflowMarketplaceService;
import com.platform.workflow.marketplace.service.WorkflowTemplateImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Marketplace REST API.
 *
 * <pre>
 * GET  /api/v1/marketplace/templates                   → catalog (paginated, filterable)
 * GET  /api/v1/marketplace/templates/featured          → featured templates
 * GET  /api/v1/marketplace/templates/{id}              → template detail + latest version preview
 * GET  /api/v1/marketplace/templates/{id}/versions     → version history
 * GET  /api/v1/marketplace/versions/{versionId}        → single version detail (with definition)
 * POST /api/v1/marketplace/templates                   → publish new template
 * POST /api/v1/marketplace/templates/{id}/versions     → add new version
 * POST /api/v1/marketplace/templates/{id}/install      → install template for caller's tenant
 * GET  /api/v1/marketplace/my-installs                 → list installs for caller's tenant
 * </pre>
 *
 * <p>Permission model:
 * <ul>
 *   <li>PERM_MARKETPLACE_READ    — browse catalog (should be granted to all authenticated users)</li>
 *   <li>PERM_MARKETPLACE_INSTALL — install a template (granted to tenant admins)</li>
 *   <li>PERM_MARKETPLACE_PUBLISH — publish / add versions (granted to verified publishers)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
@Tag(name = "Workflow Marketplace", description = "Browse, preview and install workflow templates")
public class MarketplaceController {

    private final WorkflowMarketplaceService marketplaceService;
    private final WorkflowTemplateImportService importService;

    // ── Catalog ───────────────────────────────────────────────────────────────

    @GetMapping("/templates")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_READ')")
    @Operation(summary = "Browse marketplace catalog (paginated)")
    public ResponseEntity<Page<TemplateSummary>> listTemplates(
        @RequestParam(required = false) String category,
        @PageableDefault(size = 20, sort = "installCount", direction = Sort.Direction.DESC) Pageable pageable,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(
            marketplaceService.listTemplates(principal.getTenantId(), category, pageable)
        );
    }

    @GetMapping("/templates/featured")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_READ')")
    @Operation(summary = "Get featured templates for homepage hero")
    public ResponseEntity<List<TemplateSummary>> listFeatured(
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(marketplaceService.listFeatured(principal.getTenantId()));
    }

    @GetMapping("/templates/{id}")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_READ')")
    @Operation(summary = "Get template detail with latest version definition preview")
    public ResponseEntity<TemplateDetail> getTemplate(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(marketplaceService.getTemplate(id, principal.getTenantId()));
    }

    @GetMapping("/templates/{id}/versions")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_READ')")
    @Operation(summary = "Get version history of a template")
    public ResponseEntity<List<VersionSummary>> getVersions(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(marketplaceService.getVersions(id, principal.getTenantId()));
    }

    @GetMapping("/versions/{versionId}")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_READ')")
    @Operation(summary = "Get a specific template version with full definition snapshot")
    public ResponseEntity<VersionDetail> getVersion(
        @PathVariable UUID versionId,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(marketplaceService.getVersion(versionId, principal.getTenantId()));
    }

    // ── Install ───────────────────────────────────────────────────────────────

    /**
     * Install a template into the calling tenant's namespace.
     *
     * <p>The engine does not need to restart — the new definition is immediately
     * available for {@code applyTransition} calls once the request completes.
     */
    @PostMapping("/templates/{id}/install")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_INSTALL')")
    @Operation(summary = "Install a template (clones the definition for the caller's tenant)")
    public ResponseEntity<InstallResult> install(
        @PathVariable UUID id,
        @RequestBody(required = false) InstallTemplateRequest request,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        InstallTemplateRequest req = request != null ? request : new InstallTemplateRequest();
        InstallResult result = importService.install(
            id, req, principal.getTenantId(), principal.getUserId()
        );
        return ResponseEntity.status(201).body(result);
    }

    // ── Tenant install history ────────────────────────────────────────────────

    @GetMapping("/my-installs")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_READ')")
    @Operation(summary = "List all templates installed by the caller's tenant")
    public ResponseEntity<List<InstallSummary>> myInstalls(
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(marketplaceService.listMyInstalls(principal.getTenantId()));
    }

    // ── Publication ───────────────────────────────────────────────────────────

    @PostMapping("/templates")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_PUBLISH')")
    @Operation(summary = "Publish a new workflow template to the marketplace")
    public ResponseEntity<TemplateDetail> publish(
        @Valid @RequestBody PublishTemplateRequest request,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        TemplateDetail result = marketplaceService.publishTemplate(
            request, principal.getTenantId(), principal.getUserId()
        );
        return ResponseEntity.status(201).body(result);
    }

    @PostMapping("/templates/{id}/versions")
    @PreAuthorize("hasAuthority('PERM_MARKETPLACE_PUBLISH')")
    @Operation(summary = "Add a new version to an existing template")
    public ResponseEntity<VersionDetail> addVersion(
        @PathVariable UUID id,
        @Valid @RequestBody AddVersionRequest request,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        VersionDetail result = marketplaceService.addVersion(
            id, request, principal.getTenantId(), principal.getUserId()
        );
        return ResponseEntity.status(201).body(result);
    }
}
