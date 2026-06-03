package com.platform.workflow.marketplace.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;

/**
 * Request/Response DTOs for the Marketplace API.
 * Using nested static classes to group them logically.
 */
public final class MarketplaceRequest {

    private MarketplaceRequest() {}

    // ── Publish ───────────────────────────────────────────────────────────────

    /** POST /marketplace/templates — publish a new template with its first version. */
    @Data
    public static class PublishTemplateRequest {

        @NotBlank
        @Pattern(regexp = "[a-z0-9-]+", message = "slug must be lowercase alphanumeric with hyphens")
        private String slug;

        @NotBlank
        private String name;

        private String shortDesc;
        private String description;

        @NotBlank
        private String category;

        private List<String> tags;
        private String entityTypeHint;
        private String publisherName;

        /** PUBLIC | TENANT | UNLISTED */
        private String visibleScope = "PUBLIC";

        // First version
        @NotBlank
        private String semver = "1.0.0";

        private String changelog;

        @NotNull
        @Valid
        private WorkflowDefinitionSnapshot definition;
    }

    /** POST /marketplace/templates/{id}/versions — add a new version to an existing template. */
    @Data
    public static class AddVersionRequest {

        @NotBlank
        private String semver;

        private String changelog;

        @NotNull
        @Valid
        private WorkflowDefinitionSnapshot definition;
    }

    // ── Install ───────────────────────────────────────────────────────────────

    /** POST /marketplace/templates/{id}/install — install a template for the current tenant. */
    @Data
    public static class InstallTemplateRequest {
        /**
         * Version id to install. If null, the latest version is used.
         * Pinning a version is recommended for production installs.
         */
        private String versionId;

        /** Override the default label from the template (optional). */
        private String customLabel;

        /** Override the entityType hint from the template (required if no hint set). */
        private String customEntityType;
    }
}
