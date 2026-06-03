package com.platform.workflow.marketplace.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTOs for the Marketplace API.
 *
 * These are projection types — they never expose the raw JPA entity.
 * The separation allows evolving the persistence layer independently of the API contract.
 */
public final class MarketplaceResponse {

    private MarketplaceResponse() {}

    // ── Catalog listing (lightweight) ─────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateSummary {
        private UUID         id;
        private String       slug;
        private String       name;
        private String       shortDesc;
        private String       category;
        private List<String> tags;
        private String       entityTypeHint;
        private String       publisherName;
        private String       visibleScope;
        private int          installCount;
        private BigDecimal   ratingAvg;
        private int          ratingCount;
        private boolean      featured;
        private String       latestSemver;
        private Instant      updatedAt;
        /** Whether the calling tenant has already installed this template. */
        private boolean      installedByTenant;
    }

    // ── Full template detail (with versions) ──────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateDetail {
        private UUID             id;
        private String           slug;
        private String           name;
        private String           shortDesc;
        private String           description;
        private String           category;
        private List<String>     tags;
        private String           entityTypeHint;
        private String           publisherName;
        private String           visibleScope;
        private int              installCount;
        private BigDecimal       ratingAvg;
        private int              ratingCount;
        private boolean          featured;
        private Instant          createdAt;
        private Instant          updatedAt;
        private List<VersionSummary> versions;
        private VersionDetail    latestVersion;
        private boolean          installedByTenant;
    }

    // ── Version list item ─────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VersionSummary {
        private UUID    id;
        private String  semver;
        private String  changelog;
        private boolean latest;
        private Instant publishedAt;
    }

    // ── Full version (includes the definition snapshot for preview) ───────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VersionDetail {
        private UUID                       id;
        private String                     semver;
        private String                     changelog;
        private boolean                    latest;
        private Instant                    publishedAt;
        private WorkflowDefinitionSnapshot definition;
    }

    // ── Install result ────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstallResult {
        private UUID    installId;
        private UUID    resultingDefinitionId;
        private String  entityType;
        private String  label;
        private String  templateName;
        private String  installedVersion;
        private Instant installedAt;
        /** Direct URL to open the definition in the Workflow Designer. */
        private String  designerUrl;
    }

    // ── Tenant installs list ──────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstallSummary {
        private UUID    installId;
        private UUID    templateId;
        private String  templateName;
        private String  templateSlug;
        private String  installedVersion;
        private UUID    resultingDefinitionId;
        private String  entityType;
        private String  label;
        private Instant installedAt;
    }
}
