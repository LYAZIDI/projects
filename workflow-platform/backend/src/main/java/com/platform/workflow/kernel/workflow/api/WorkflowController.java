package com.platform.workflow.kernel.workflow.api;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.kernel.workflow.engine.AvailableTransition;
import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.TransitionResult;
import com.platform.workflow.kernel.workflow.engine.WorkflowEngine;
import com.platform.workflow.kernel.workflow.model.WorkflowDefinition;
import com.platform.workflow.kernel.workflow.model.WorkflowExecutionLog;
import com.platform.workflow.kernel.workflow.repository.WorkflowDefinitionRepository;
import com.platform.workflow.kernel.workflow.repository.WorkflowExecutionLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Workflow Engine REST API.
 *
 * <p>All endpoints are multi-tenant — tenantId is extracted from the JWT, never from
 * the URL. This prevents cross-tenant data access.
 *
 * <pre>
 * POST   /api/v1/workflow/{entityType}/{entityId}/transition/{key}  → apply transition
 * GET    /api/v1/workflow/{entityType}/{entityId}/transitions         → available transitions
 * GET    /api/v1/workflow/{entityType}/{entityId}/history             → audit trail
 * GET    /api/v1/workflow/{entityType}/{entityId}/state               → current state
 * GET    /api/v1/workflow/definitions                                  → list definitions (admin)
 * GET    /api/v1/workflow/definitions/{id}                            → get definition (admin)
 * GET    /api/v1/workflow/registry                                     → introspect registry (admin)
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/workflow")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Workflow Engine", description = "Generic multi-tenant workflow state machine API")
@SecurityRequirement(name = "bearerAuth")
public class WorkflowController {

    private final WorkflowEngine                 engine;
    private final WorkflowDefinitionRepository   definitionRepository;
    private final WorkflowExecutionLogRepository logRepository;

    // ── Apply transition ──────────────────────────────────────────────────────

    @PostMapping("/{entityType}/{entityId}/transition/{transitionKey}")
    @Operation(summary = "Apply a workflow transition to an entity")
    public ResponseEntity<TransitionResult> applyTransition(
        @PathVariable String entityType,
        @PathVariable String entityId,
        @PathVariable String transitionKey,
        @RequestBody(required = false) TransitionRequest body,
        @AuthenticationPrincipal WorkflowPrincipal principal,
        HttpServletRequest httpRequest
    ) {
        Map<String, Object> payload = body != null && body.payload() != null ? body.payload() : Map.of();

        ExecutionContext ctx = ExecutionContext.builder()
            .tenantId(principal.getTenantId())
            .userId(principal.getUserId())
            .userEmail(principal.getEmail())
            .entityType(entityType)
            .entityId(entityId)
            .transitionKey(transitionKey)
            .correlationId(extractCorrelationId(httpRequest))
            .build();

        ctx.getPayload().putAll(payload);

        TransitionResult result = engine.applyTransition(ctx);
        return ResponseEntity.ok(result);
    }

    // ── Available transitions ─────────────────────────────────────────────────

    @GetMapping("/{entityType}/{entityId}/transitions")
    @Operation(summary = "List transitions available to the current user from the entity's current state")
    public ResponseEntity<List<AvailableTransition>> getAvailableTransitions(
        @PathVariable String entityType,
        @PathVariable String entityId,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        List<AvailableTransition> transitions = engine.getAvailableTransitions(
            principal.getTenantId(), entityType, entityId,
            perm -> principal.hasPermission(perm)
        );
        return ResponseEntity.ok(transitions);
    }

    // ── Audit history ─────────────────────────────────────────────────────────

    @GetMapping("/{entityType}/{entityId}/history")
    @Operation(summary = "Full immutable audit trail for a domain entity")
    public ResponseEntity<List<WorkflowExecutionLog>> getHistory(
        @PathVariable String entityType,
        @PathVariable String entityId,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        List<WorkflowExecutionLog> logs = logRepository.findHistoryForEntity(
            principal.getTenantId(), entityType, entityId
        );
        return ResponseEntity.ok(logs);
    }

    // ── Definitions (admin) ───────────────────────────────────────────────────

    @GetMapping("/definitions")
    @PreAuthorize("hasAuthority('PERM_WORKFLOW_READ')")
    @Operation(summary = "List all workflow definitions for the tenant")
    public ResponseEntity<List<WorkflowDefinition>> listDefinitions(
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(
            definitionRepository.findAllByTenantId(principal.getTenantId())
        );
    }

    @GetMapping("/definitions/{id}")
    @PreAuthorize("hasAuthority('PERM_WORKFLOW_READ')")
    @Operation(summary = "Get a full workflow definition with states and transitions")
    public ResponseEntity<WorkflowDefinition> getDefinition(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return definitionRepository.findById(id)
            .filter(d -> d.getTenantId().equals(principal.getTenantId()))
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new workflow definition (designer save — new graph).
     *
     * <p>The caller must be the definition's tenant. The engine will auto-detect
     * the definition on the first {@code applyTransition} call.
     */
    @PostMapping("/definitions")
    @PreAuthorize("hasAuthority('PERM_WORKFLOW_WRITE')")
    @Operation(summary = "Create a new workflow definition (designer)")
    public ResponseEntity<WorkflowDefinition> createDefinition(
        @Valid @RequestBody WorkflowDefinition body,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        // Force tenant isolation — ignore whatever tenantId the client sent
        body.setTenantId(principal.getTenantId());
        body.setId(null);   // ensure INSERT, not UPDATE
        WorkflowDefinition saved = definitionRepository.save(body);
        return ResponseEntity.status(201).body(saved);
    }

    /**
     * Full replace of a definition (designer save — existing graph).
     *
     * <p>This is a destructive PUT: existing states, transitions, conditions, and
     * actions are replaced by the incoming body. The engine's cache is evicted
     * automatically because the repository is @CacheEvict-annotated.
     *
     * <p>In-flight WorkflowInstances are NOT affected — they keep their current
     * stateKey and will continue working against the new definition on the next
     * transition (provided the stateKey still exists; engine validates this).
     */
    @PutMapping("/definitions/{id}")
    @PreAuthorize("hasAuthority('PERM_WORKFLOW_WRITE')")
    @Operation(summary = "Replace a workflow definition (designer save)")
    public ResponseEntity<WorkflowDefinition> updateDefinition(
        @PathVariable UUID id,
        @Valid @RequestBody WorkflowDefinition body,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return definitionRepository.findById(id)
            .filter(d -> d.getTenantId().equals(principal.getTenantId()))
            .map(existing -> {
                body.setId(id);
                body.setTenantId(principal.getTenantId());
                return ResponseEntity.ok(definitionRepository.save(body));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Soft-deactivate a definition.
     * Existing instances are not deleted — they just can't receive new transitions.
     */
    @DeleteMapping("/definitions/{id}")
    @PreAuthorize("hasAuthority('PERM_WORKFLOW_WRITE')")
    @Operation(summary = "Deactivate a workflow definition")
    public ResponseEntity<Void> deactivateDefinition(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        definitionRepository.findById(id)
            .filter(d -> d.getTenantId().equals(principal.getTenantId()))
            .ifPresent(d -> {
                d.setActive(false);
                definitionRepository.save(d);
            });
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractCorrelationId(HttpServletRequest request) {
        String id = (String) request.getAttribute("correlationId");
        return id != null ? id : UUID.randomUUID().toString();
    }

    // ── Request/Response DTOs ─────────────────────────────────────────────────

    public record TransitionRequest(Map<String, Object> payload) {}
}
