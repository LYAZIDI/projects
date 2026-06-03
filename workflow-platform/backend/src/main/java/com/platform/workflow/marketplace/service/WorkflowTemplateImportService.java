package com.platform.workflow.marketplace.service;

import com.platform.workflow.kernel.workflow.model.*;
import com.platform.workflow.kernel.workflow.repository.WorkflowDefinitionRepository;
import com.platform.workflow.marketplace.domain.WorkflowTemplate;
import com.platform.workflow.marketplace.domain.WorkflowTemplateInstall;
import com.platform.workflow.marketplace.domain.WorkflowTemplateVersion;
import com.platform.workflow.marketplace.dto.MarketplaceRequest.InstallTemplateRequest;
import com.platform.workflow.marketplace.dto.MarketplaceResponse.InstallResult;
import com.platform.workflow.marketplace.dto.WorkflowDefinitionSnapshot;
import com.platform.workflow.marketplace.dto.WorkflowDefinitionSnapshot.*;
import com.platform.workflow.marketplace.repository.WorkflowTemplateInstallRepository;
import com.platform.workflow.marketplace.repository.WorkflowTemplateRepository;
import com.platform.workflow.marketplace.repository.WorkflowTemplateVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * WorkflowTemplateImportService — the CORE of the marketplace install flow.
 *
 * <p>Install process (all within a single transaction):
 * <ol>
 *   <li>Resolve the template version to install (latest or pinned)</li>
 *   <li>Validate tenant isolation (can't install a TENANT-scoped template from another tenant)</li>
 *   <li>Clone the {@link WorkflowDefinitionSnapshot}:
 *       <ul>
 *         <li>Generate brand-new UUIDs for definition, states, transitions, conditions, actions</li>
 *         <li>Assign the caller's tenantId</li>
 *         <li>Apply custom label / entityType from the install request</li>
 *       </ul>
 *   </li>
 *   <li>Persist the cloned {@link WorkflowDefinition} (fully independent from the template)</li>
 *   <li>Record the install in {@link WorkflowTemplateInstall}</li>
 *   <li>Increment the template's install counter</li>
 * </ol>
 *
 * <p><strong>Isolation guarantee:</strong> the installed definition is a deep clone.
 * Subsequent updates to the template (new versions) do NOT affect installed instances.
 * The tenant owns their copy completely.
 *
 * <p><strong>Idempotency:</strong> installing the same version twice is blocked by the
 * unique constraint on (tenantId, templateVersionId). A conflict throws a
 * descriptive error rather than creating a duplicate.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowTemplateImportService {

    private final WorkflowTemplateRepository        templateRepository;
    private final WorkflowTemplateVersionRepository versionRepository;
    private final WorkflowTemplateInstallRepository installRepository;
    private final WorkflowDefinitionRepository      definitionRepository;

    @Transactional
    public InstallResult install(
        UUID templateId,
        InstallTemplateRequest request,
        UUID tenantId,
        String userId
    ) {
        // ── 1. Resolve template ───────────────────────────────────────────────

        WorkflowTemplate template = templateRepository.findById(templateId)
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateId));

        if (!template.isActive()) {
            throw new IllegalStateException("Template is no longer active: " + templateId);
        }

        // Tenant-scoped templates can only be installed by the publisher's tenant
        if (template.getVisibleScope() == WorkflowTemplate.VisibleScope.TENANT
            && !template.getPublisherTenantId().equals(tenantId)) {
            throw new SecurityException("Template is private to its publisher tenant");
        }

        // ── 2. Resolve version ────────────────────────────────────────────────

        WorkflowTemplateVersion version;
        if (request.getVersionId() != null) {
            version = versionRepository.findById(UUID.fromString(request.getVersionId()))
                .filter(v -> v.getTemplate().getId().equals(templateId))
                .orElseThrow(() -> new IllegalArgumentException("Version not found: " + request.getVersionId()));
        } else {
            version = versionRepository.findByTemplateIdAndLatestTrue(templateId)
                .orElseThrow(() -> new IllegalStateException("Template has no published version: " + templateId));
        }

        // ── 3. Idempotency check ──────────────────────────────────────────────

        if (installRepository.existsByTenantIdAndTemplateVersionId(tenantId, version.getId())) {
            throw new IllegalStateException(
                "Version " + version.getSemver() + " is already installed for this tenant. " +
                "To re-install, use a different version."
            );
        }

        // ── 4. Clone definition ───────────────────────────────────────────────

        WorkflowDefinitionSnapshot snapshot = version.getDefinition();

        String entityType = resolve(request.getCustomEntityType(), snapshot.getEntityType(),
            "entityType must be provided (template has no hint)");
        String label = resolveOrDefault(request.getCustomLabel(),
            template.getName() + " (from marketplace)");

        WorkflowDefinition cloned = cloneDefinition(snapshot, tenantId, entityType, label);

        // ── 5. Persist cloned definition ──────────────────────────────────────

        WorkflowDefinition saved = definitionRepository.save(cloned);

        log.info("[Marketplace] Cloned definition id={} entityType={} tenant={} from template={} version={}",
            saved.getId(), entityType, tenantId, template.getSlug(), version.getSemver());

        // ── 6. Record install ─────────────────────────────────────────────────

        WorkflowTemplateInstall install = WorkflowTemplateInstall.builder()
            .template(template)
            .templateVersion(version)
            .tenantId(tenantId)
            .installedBy(userId)
            .resultingDefinitionId(saved.getId())
            .customLabel(request.getCustomLabel())
            .customEntityType(request.getCustomEntityType())
            .installedAt(Instant.now())
            .build();

        installRepository.save(install);

        // ── 7. Update stats ───────────────────────────────────────────────────

        templateRepository.incrementInstallCount(templateId);

        // ── 8. Return result ──────────────────────────────────────────────────

        return InstallResult.builder()
            .installId(install.getId())
            .resultingDefinitionId(saved.getId())
            .entityType(entityType)
            .label(label)
            .templateName(template.getName())
            .installedVersion(version.getSemver())
            .installedAt(install.getInstalledAt())
            .designerUrl("/designer?definitionId=" + saved.getId())
            .build();
    }

    // ── Clone logic ───────────────────────────────────────────────────────────

    /**
     * Deep-clone a WorkflowDefinitionSnapshot into a real WorkflowDefinition.
     *
     * <p>Every element gets a fresh UUID so there is zero overlap with the
     * original template data. The cloned definition is completely owned by the
     * target tenant.
     */
    private WorkflowDefinition cloneDefinition(
        WorkflowDefinitionSnapshot snapshot,
        UUID tenantId,
        String entityType,
        String label
    ) {
        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId)
            .entityType(entityType)
            .version(snapshot.getVersion() > 0 ? snapshot.getVersion() : 1)
            .label(label)
            .description(snapshot.getDescription())
            .isActive(true)
            .build();

        // Clone states
        List<WorkflowState> states = new ArrayList<>();
        for (StateSnapshot ss : snapshot.getStates()) {
            WorkflowState state = WorkflowState.builder()
                .definition(def)
                .key(ss.getKey())
                .label(ss.getLabel())
                .color(ss.getColor())
                .icon(ss.getIcon())
                .isInitial(ss.isInitial())
                .isFinal(ss.isFinal())
                .sortOrder(ss.getSortOrder())
                .build();
            states.add(state);
        }
        def.setStates(states);

        // Clone transitions (including nested conditions and actions)
        List<WorkflowTransition> transitions = new ArrayList<>();
        for (TransitionSnapshot ts : snapshot.getTransitions()) {
            WorkflowTransition transition = WorkflowTransition.builder()
                .definition(def)
                .key(ts.getKey())
                .label(ts.getLabel())
                .fromStateKey(ts.getFromStateKey())
                .toStateKey(ts.getToStateKey())
                .requiredPermission(ts.getRequiredPermission())
                .uiVariant(ts.getUiVariant() != null ? ts.getUiVariant() : "default")
                .sortOrder(ts.getSortOrder())
                .build();

            // Clone conditions
            List<WorkflowConditionConfig> conditions = new ArrayList<>();
            for (ConfigSnapshot cs : ts.getConditions()) {
                conditions.add(WorkflowConditionConfig.builder()
                    .transition(transition)
                    .type(cs.getType())
                    .config(cs.getConfig())
                    .sortOrder(cs.getSortOrder())
                    .build());
            }
            transition.setConditions(conditions);

            // Clone actions
            List<WorkflowActionConfig> actions = new ArrayList<>();
            for (ConfigSnapshot as : ts.getActions()) {
                actions.add(WorkflowActionConfig.builder()
                    .transition(transition)
                    .type(as.getType())
                    .config(as.getConfig())
                    .sortOrder(as.getSortOrder())
                    .build());
            }
            transition.setActions(actions);

            transitions.add(transition);
        }
        def.setTransitions(transitions);

        return def;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String resolve(String override, String fallback, String errorMsg) {
        if (override != null && !override.isBlank()) return override;
        if (fallback != null && !fallback.isBlank()) return fallback;
        throw new IllegalArgumentException(errorMsg);
    }

    private String resolveOrDefault(String override, String defaultValue) {
        return (override != null && !override.isBlank()) ? override : defaultValue;
    }
}
