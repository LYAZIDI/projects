package com.platform.workflow.kernel.workflow.engine;

import com.platform.workflow.kernel.workflow.events.WorkflowTransitionCompletedEvent;
import com.platform.workflow.kernel.workflow.events.WorkflowTransitionStartedEvent;
import com.platform.workflow.kernel.workflow.model.*;
import com.platform.workflow.kernel.workflow.registry.EntityAdapterRegistry;
import com.platform.workflow.kernel.workflow.registry.WorkflowActionRegistry;
import com.platform.workflow.kernel.workflow.registry.WorkflowConditionRegistry;
import com.platform.workflow.kernel.workflow.repository.WorkflowDefinitionRepository;
import com.platform.workflow.kernel.workflow.repository.WorkflowExecutionLogRepository;
import com.platform.workflow.kernel.workflow.repository.WorkflowInstanceRepository;
import com.platform.workflow.kernel.workflow.spi.EntityAdapter;
import com.platform.workflow.kernel.workflow.spi.WorkflowActionExecutor;
import com.platform.workflow.kernel.workflow.spi.WorkflowConditionEvaluator;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * The Workflow Engine — the single, domain-agnostic state machine orchestrator.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * <p>This class is the ONLY orchestration point. All state transitions in every
 * domain module (CRM, HR, Finance, Support) pass through this pipeline.
 *
 * <h3>9-step pipeline</h3>
 * <ol>
 *   <li>Load WorkflowDefinition for (tenantId, entityType)</li>
 *   <li>Find or bootstrap WorkflowInstance (current state)</li>
 *   <li>Resolve the requested transition from current state</li>
 *   <li>Spring Security RBAC gate (permission check)</li>
 *   <li>Load entity snapshot via EntityAdapter</li>
 *   <li>Evaluate all conditions (strategy pattern, ALL must pass)</li>
 *   <li>Execute pre-commit actions (enrich context.payload)</li>
 *   <li>── BEGIN TRANSACTION ────────────────────────────────────────────────
 *       <ul>
 *         <li>8a. Update WorkflowInstance.currentStateKey</li>
 *         <li>8b. EntityAdapter.updateState() (domain write, same TX)</li>
 *         <li>8c. Persist WorkflowExecutionLog (immutable audit trail)</li>
 *       </ul>
 *       ── COMMIT ───────────────────────────────────────────────────────────</li>
 *   <li>Publish Spring Application Events (post-commit, non-blocking)</li>
 * </ol>
 *
 * <p>The engine publishes:
 * <ul>
 *   <li>{@link WorkflowTransitionStartedEvent} — before the transaction (for hooks/monitors)</li>
 *   <li>{@link WorkflowTransitionCompletedEvent} — after commit (for downstream reactions)</li>
 * </ul>
 *
 * <p>Design invariants:
 * <ul>
 *   <li>No import of any domain class (CRM, HR, Finance)</li>
 *   <li>No hardcoded permissions or condition logic</li>
 *   <li>Always produces an ExecutionLog, even on failure</li>
 *   <li>Thread-safe: stateless Spring singleton</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowEngine {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowInstanceRepository   instanceRepository;
    private final WorkflowExecutionLogRepository logRepository;

    private final EntityAdapterRegistry    adapterRegistry;
    private final WorkflowConditionRegistry conditionRegistry;
    private final WorkflowActionRegistry   actionRegistry;

    private final ApplicationEventPublisher eventPublisher;
    private final MeterRegistry             meterRegistry;

    // ── Main entry point ──────────────────────────────────────────────────────

    /**
     * Apply a transition to a domain entity.
     *
     * @param context all execution parameters (tenantId, entityType, entityId, transitionKey, payload)
     * @return the execution result
     * @throws WorkflowException for any workflow-level failure (NOT_FOUND, PERMISSION_DENIED, etc.)
     */
    @Transactional
    public TransitionResult applyTransition(ExecutionContext context) {
        long startMs = System.currentTimeMillis();
        log.info("[WorkflowEngine] Applying transition '{}' on {}/{} for tenant {}",
            context.getTransitionKey(), context.getEntityType(), context.getEntityId(), context.getTenantId());

        // ── Step 1: Load definition ───────────────────────────────────────────
        WorkflowDefinition definition = loadDefinition(context);

        // ── Step 2: Find or bootstrap instance ───────────────────────────────
        WorkflowInstance instance = findOrCreateInstance(context, definition);
        String fromState = instance.getCurrentStateKey();

        // Guard: no transitions from a final state
        definition.findState(fromState)
            .filter(WorkflowState::isFinal)
            .ifPresent(s -> {
                throw new WorkflowException(
                    WorkflowException.Code.TRANSITION_NOT_FOUND,
                    "State '" + fromState + "' is final — no transitions allowed"
                );
            });

        // ── Step 3: Resolve transition ────────────────────────────────────────
        WorkflowTransition transition = definition
            .findTransition(fromState, context.getTransitionKey())
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.TRANSITION_NOT_FOUND,
                "Transition '" + context.getTransitionKey() + "' not found from state '" + fromState + "'"
            ));
        String toState = transition.getToStateKey();

        // ── Step 4: Spring Security RBAC gate ─────────────────────────────────
        checkPermission(transition, context);

        // ── Step 5: Load entity snapshot ──────────────────────────────────────
        EntityAdapter adapter = adapterRegistry.get(context.getEntityType());
        Map<String, Object> entity = adapter.loadEntity(context.getTenantId(), context.getEntityId());
        if (entity == null || entity.isEmpty()) {
            throw new WorkflowException(
                WorkflowException.Code.ENTITY_NOT_FOUND,
                "Entity " + context.getEntityType() + "/" + context.getEntityId() + " not found"
            );
        }

        // ── Step 6: Evaluate conditions ───────────────────────────────────────
        List<String> failedConditions = evaluateConditions(transition, context, entity);
        if (!failedConditions.isEmpty()) {
            logFailedAttempt(instance, context, fromState, toState, transition,
                "Conditions not met: " + failedConditions, "CONDITION_FAILED", startMs);
            throw new WorkflowException(
                WorkflowException.Code.CONDITION_FAILED,
                "Transition blocked — conditions not satisfied: " + String.join(", ", failedConditions)
            );
        }

        // ── Step 7: Execute pre-commit actions ────────────────────────────────
        List<String> actionsRun = executeActions(transition, context, entity);

        // Publish "started" event before transaction (for monitoring/tracing)
        eventPublisher.publishEvent(new WorkflowTransitionStartedEvent(
            this, context, fromState, toState
        ));

        // ── Step 8: Atomic transaction ────────────────────────────────────────
        // 8a. Update instance state
        instance.setCurrentStateKey(toState);
        instanceRepository.save(instance);

        // 8b. Domain entity update via adapter (same transaction)
        adapter.updateState(context.getTenantId(), context.getEntityId(), toState, context);

        // 8c. Immutable audit log
        long durationMs = System.currentTimeMillis() - startMs;
        WorkflowExecutionLog executionLog = WorkflowExecutionLog.builder()
            .tenantId(context.getTenantId())
            .entityType(context.getEntityType())
            .entityId(context.getEntityId().toString())
            .transitionKey(context.getTransitionKey())
            .fromStateKey(fromState)
            .toStateKey(toState)
            .userId(context.getUserId())
            .userEmail(context.getUserEmail())
            .success(true)
            .actionsRun(actionsRun)
            .payloadSnapshot(Map.copyOf(context.getPayload()))
            .durationMs(durationMs)
            .correlationId(context.getCorrelationId())
            .build();
        logRepository.save(executionLog);

        // ── Step 9: Publish completion event (post-commit) ────────────────────
        // TransactionSynchronizationManager registers this for after-commit
        TransitionResult result = TransitionResult.builder()
            .success(true)
            .fromState(fromState)
            .toState(toState)
            .actionsRun(actionsRun)
            .durationMs(durationMs)
            .logId(executionLog.getId())
            .correlationId(context.getCorrelationId())
            .build();

        eventPublisher.publishEvent(new WorkflowTransitionCompletedEvent(
            this, context, fromState, toState, result
        ));

        // Micrometer metric
        Timer.builder("workflow.transition.duration")
            .tag("entityType", context.getEntityType())
            .tag("transition", context.getTransitionKey())
            .tag("success", "true")
            .register(meterRegistry)
            .record(java.time.Duration.ofMillis(durationMs));

        log.info("[WorkflowEngine] Transition '{}' on {}/{} completed: {} → {} in {}ms",
            context.getTransitionKey(), context.getEntityType(), context.getEntityId(),
            fromState, toState, durationMs);

        return result;
    }

    // ── Available transitions ─────────────────────────────────────────────────

    /**
     * Returns transitions available to the current user from the entity's current state.
     *
     * <p>Filtered by:
     * <ul>
     *   <li>Current state (fromStateKey)</li>
     *   <li>Required permission (only transitions the user can execute)</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public List<AvailableTransition> getAvailableTransitions(
        UUID tenantId, String entityType, String entityId, WorkflowPermissionChecker permChecker
    ) {
        WorkflowDefinition definition = definitionRepository
            .findActiveByTenantAndType(tenantId, entityType)
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.DEFINITION_NOT_FOUND,
                "No active workflow for " + entityType
            ));

        WorkflowInstance instance = instanceRepository
            .findByTenantAndEntity(tenantId, entityType, entityId)
            .orElse(null);

        String currentState = instance != null
            ? instance.getCurrentStateKey()
            : definition.getInitialState();

        return definition.transitionsFrom(currentState).stream()
            .filter(t -> t.getRequiredPermission() == null || permChecker.hasPermission(t.getRequiredPermission()))
            .map(t -> AvailableTransition.builder()
                .key(t.getKey())
                .label(t.getLabel())
                .toState(t.getToStateKey())
                .uiVariant(t.getUiVariant())
                .requiredPermission(t.getRequiredPermission())
                .build())
            .toList();
    }

    // ── Private pipeline steps ────────────────────────────────────────────────

    private WorkflowDefinition loadDefinition(ExecutionContext context) {
        return definitionRepository
            .findActiveByTenantAndType(context.getTenantId(), context.getEntityType())
            .orElseThrow(() -> new WorkflowException(
                WorkflowException.Code.DEFINITION_NOT_FOUND,
                "No active workflow definition for entity type '" + context.getEntityType()
                + "' in tenant " + context.getTenantId()
            ));
    }

    private WorkflowInstance findOrCreateInstance(ExecutionContext ctx, WorkflowDefinition def) {
        return instanceRepository.findByTenantAndEntity(
                ctx.getTenantId(), ctx.getEntityType(), ctx.getEntityId())
            .orElseGet(() -> {
                log.debug("[WorkflowEngine] Bootstrapping new instance for {}/{}", ctx.getEntityType(), ctx.getEntityId());
                WorkflowInstance newInstance = WorkflowInstance.builder()
                    .tenantId(ctx.getTenantId())
                    .definition(def)
                    .entityType(ctx.getEntityType())
                    .entityId(ctx.getEntityId())
                    .currentStateKey(def.getInitialState())
                    .build();
                return instanceRepository.save(newInstance);
            });
    }

    private void checkPermission(WorkflowTransition transition, ExecutionContext context) {
        String required = transition.getRequiredPermission();
        if (required == null) return;

        // Delegate to Spring Security context
        org.springframework.security.core.Authentication auth =
            org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        boolean granted = auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("PERM_" + required));

        if (!granted) {
            log.warn("[WorkflowEngine] Permission denied: user {} missing '{}' for transition '{}'",
                context.getUserId(), required, transition.getKey());
            throw new WorkflowException(
                WorkflowException.Code.PERMISSION_DENIED,
                "Missing permission '" + required + "' to apply transition '" + transition.getKey() + "'"
            );
        }
    }

    private List<String> evaluateConditions(
        WorkflowTransition transition,
        ExecutionContext context,
        Map<String, Object> entity
    ) {
        List<String> failures = new ArrayList<>();
        for (WorkflowConditionConfig condCfg : transition.getConditions()) {
            WorkflowConditionEvaluator evaluator = conditionRegistry.get(condCfg.getType());
            boolean passed = evaluator.evaluate(condCfg.getConfig(), context, entity);
            if (!passed) {
                log.debug("[WorkflowEngine] Condition '{}' failed for {}/{}",
                    condCfg.getType(), context.getEntityType(), context.getEntityId());
                failures.add(condCfg.getType());
            }
        }
        return failures;
    }

    private List<String> executeActions(
        WorkflowTransition transition,
        ExecutionContext context,
        Map<String, Object> entity
    ) {
        List<String> executed = new ArrayList<>();
        for (WorkflowActionConfig actionCfg : transition.getActions()) {
            WorkflowActionExecutor executor = actionRegistry.get(actionCfg.getType());
            executor.execute(actionCfg.getConfig(), context, entity);
            executed.add(actionCfg.getType());
            log.debug("[WorkflowEngine] Action '{}' executed for {}/{}",
                actionCfg.getType(), context.getEntityType(), context.getEntityId());
        }
        return executed;
    }

    private void logFailedAttempt(
        WorkflowInstance instance, ExecutionContext context,
        String fromState, String toState, WorkflowTransition transition,
        String errorMessage, String errorCode, long startMs
    ) {
        try {
            WorkflowExecutionLog failLog = WorkflowExecutionLog.builder()
                .tenantId(context.getTenantId())
                .entityType(context.getEntityType())
                .entityId(context.getEntityId().toString())
                .transitionKey(context.getTransitionKey())
                .fromStateKey(fromState)
                .toStateKey(toState)
                .userId(context.getUserId())
                .userEmail(context.getUserEmail())
                .success(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .actionsRun(List.of())
                .payloadSnapshot(Map.copyOf(context.getPayload()))
                .durationMs(System.currentTimeMillis() - startMs)
                .correlationId(context.getCorrelationId())
                .build();
            logRepository.save(failLog);
        } catch (Exception e) {
            log.error("[WorkflowEngine] Failed to persist failure log: {}", e.getMessage());
        }
    }

    // ── Callback interface for permission filtering ────────────────────────────

    @FunctionalInterface
    public interface WorkflowPermissionChecker {
        boolean hasPermission(String permission);
    }
}
