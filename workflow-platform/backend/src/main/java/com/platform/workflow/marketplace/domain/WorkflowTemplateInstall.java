package com.platform.workflow.marketplace.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * WorkflowTemplateInstall — audit record linking a tenant to the template version
 * they installed and the resulting WorkflowDefinition that was cloned for them.
 *
 * <p>This is a write-once record: once installed, this row is never updated.
 * Re-installation creates a new row (and a new cloned definition).
 *
 * <p>The {@code resultingDefinitionId} is a soft FK to {@code wf_definitions}.
 * It is nullable so that orphan safety is preserved if the definition is later
 * deactivated or deleted.
 */
@Entity
@Table(
    name = "marketplace_template_installs",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_install_tenant_version",
        columnNames = {"tenant_id", "template_version_id"}
    )
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowTemplateInstall {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private WorkflowTemplate template;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_version_id", nullable = false)
    private WorkflowTemplateVersion templateVersion;

    /** The tenant into whose namespace the definition was installed. */
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    /** The user who triggered the install. */
    @Column(name = "installed_by", length = 128)
    private String installedBy;

    /**
     * The WorkflowDefinition id created for this tenant by the ImportService.
     * Soft FK — nullable for orphan safety.
     */
    @Column(name = "resulting_definition_id")
    private UUID resultingDefinitionId;

    /** Tenant-customized label (overrides the template label if set). */
    @Column(name = "custom_label", length = 128)
    private String customLabel;

    /** Tenant-chosen entityType (overrides the template's entityTypeHint if set). */
    @Column(name = "custom_entity_type", length = 64)
    private String customEntityType;

    @Column(name = "installed_at", nullable = false)
    @Builder.Default
    private Instant installedAt = Instant.now();
}
