package com.platform.workflow.marketplace.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * WorkflowTemplate — the logical entry in the marketplace catalog.
 *
 * <p>A template is an immutable, versionable, shareable workflow definition
 * that any tenant can install into their own namespace.
 *
 * <p>Invariants:
 * <ul>
 *   <li>A template belongs to exactly one publisher tenant.</li>
 *   <li>Versions are append-only (never updated after publication).</li>
 *   <li>Install creates a full CLONE of the definition — the template is never touched.</li>
 * </ul>
 *
 * <p>Visibility scopes:
 * <ul>
 *   <li>{@code PUBLIC}   — visible to all tenants (default for community templates)</li>
 *   <li>{@code TENANT}   — only visible to the publisher's own tenant (private library)</li>
 *   <li>{@code UNLISTED} — accessible by direct link/id, not shown in catalog</li>
 * </ul>
 */
@Entity
@Table(
    name = "marketplace_templates",
    indexes = {
        @Index(name = "idx_mkt_templates_category",  columnList = "category, active"),
        @Index(name = "idx_mkt_templates_publisher", columnList = "publisher_tenant_id"),
        @Index(name = "idx_mkt_templates_scope",     columnList = "visible_scope, active"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** URL-safe identifier — stable across versions. Used for deep linking. */
    @Column(unique = true, nullable = false, length = 128)
    private String slug;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "short_desc", length = 256)
    private String shortDesc;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Taxonomy — drives filtering in the catalog UI.
     * Values: crm | hr | finance | support | legal | it | general
     */
    @Column(nullable = false, length = 64)
    private String category;

    /**
     * Free-form tags stored as a Postgres text array.
     * Exposed as List<String> via custom converter.
     */
    @Column(columnDefinition = "TEXT[]")
    @Convert(converter = StringListConverter.class)
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    /**
     * Advisory entity type hint (e.g. "lead", "leave_request").
     * Not enforced by the engine — the installer chooses the actual entityType.
     */
    @Column(name = "entity_type_hint", length = 64)
    private String entityTypeHint;

    // ── Authorship ────────────────────────────────────────────────────────────

    @Column(name = "publisher_tenant_id", nullable = false)
    private UUID publisherTenantId;

    @Column(name = "publisher_name", length = 128)
    private String publisherName;

    /**
     * Visibility scope:
     * PUBLIC | TENANT | UNLISTED
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "visible_scope", nullable = false, length = 32)
    @Builder.Default
    private VisibleScope visibleScope = VisibleScope.PUBLIC;

    // ── Stats ─────────────────────────────────────────────────────────────────

    @Column(name = "install_count", nullable = false)
    @Builder.Default
    private int installCount = 0;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    private java.math.BigDecimal ratingAvg;

    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private int ratingCount = 0;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean featured = false;

    // ── Versions (navigational — not eagerly loaded in catalog queries) ───────

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("semver_major DESC, semver_minor DESC, semver_patch DESC")
    @Builder.Default
    private List<WorkflowTemplateVersion> versions = new ArrayList<>();

    // ── Auditing ──────────────────────────────────────────────────────────────

    @CreatedDate   @Column(updatable = false) private Instant createdAt;
    @LastModifiedDate                          private Instant updatedAt;

    // ── Helper ───────────────────────────────────────────────────────────────

    public enum VisibleScope { PUBLIC, TENANT, UNLISTED }

    /** Convenience: increment install counter */
    public void recordInstall() { this.installCount++; }
}
