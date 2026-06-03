package com.platform.workflow.marketplace.domain;

import com.platform.workflow.marketplace.dto.WorkflowDefinitionSnapshot;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * WorkflowTemplateVersion — immutable, versioned snapshot of a workflow template.
 *
 * <p>Once a version is published it is NEVER modified.
 * Patch fixes require a new version (even if only the changelog changes).
 *
 * <p>The {@code definition} field stores the complete portable workflow definition
 * as JSONB. It is deserialized on demand by the ImportService — never used
 * as a query criterion.
 *
 * <p>Versioning follows semantic versioning (major.minor.patch):
 * <ul>
 *   <li>major — breaking schema changes (states removed, keys renamed)</li>
 *   <li>minor — backward-compatible additions (new state, new transition)</li>
 *   <li>patch — metadata or documentation fix, no structural change</li>
 * </ul>
 */
@Entity
@Table(
    name = "marketplace_template_versions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_template_semver",
        columnNames = {"template_id", "semver"}
    )
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowTemplateVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private WorkflowTemplate template;

    // ── Semantic version ──────────────────────────────────────────────────────

    @Column(nullable = false, length = 32)
    private String semver;

    @Column(name = "semver_major", nullable = false)
    private int semverMajor;

    @Column(name = "semver_minor", nullable = false)
    private int semverMinor;

    @Column(name = "semver_patch", nullable = false)
    private int semverPatch;

    // ── Portable definition (the actual workflow content) ─────────────────────

    /**
     * Full workflow definition stored as JSONB.
     * Contains: states, transitions, conditions (type + config), actions (type + config).
     * No tenantId — it is assigned at install time.
     *
     * @see WorkflowDefinitionSnapshot
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private WorkflowDefinitionSnapshot definition;

    // ── Metadata ──────────────────────────────────────────────────────────────

    @Column(columnDefinition = "TEXT")
    private String changelog;

    /**
     * Only the latest version of a template is returned by default
     * in catalog listings. Old versions remain accessible by direct id.
     */
    @Column(name = "is_latest", nullable = false)
    @Builder.Default
    private boolean latest = true;

    @Column(name = "published_by", length = 128)
    private String publishedBy;

    @Column(name = "published_at", nullable = false)
    @Builder.Default
    private Instant publishedAt = Instant.now();

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Parse "2.1.3" into the three int fields. */
    public static WorkflowTemplateVersion.WorkflowTemplateVersionBuilder fromSemver(String semver) {
        String[] parts = semver.split("\\.");
        if (parts.length != 3) throw new IllegalArgumentException("Invalid semver: " + semver);
        return WorkflowTemplateVersion.builder()
            .semver(semver)
            .semverMajor(Integer.parseInt(parts[0]))
            .semverMinor(Integer.parseInt(parts[1]))
            .semverPatch(Integer.parseInt(parts[2]));
    }
}
