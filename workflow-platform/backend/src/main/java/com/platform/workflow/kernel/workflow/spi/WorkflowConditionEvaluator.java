package com.platform.workflow.kernel.workflow.spi;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;

import java.util.Map;

/**
 * PORT — evaluates a single condition on a transition.
 *
 * <p>All conditions on a transition must return {@code true} for the transition
 * to proceed (implicit AND). The engine stops at the first failing condition
 * and throws WorkflowException(CONDITION_FAILED, HTTP 422).
 *
 * <h3>Registration</h3>
 * <pre>{@code
 * @Component
 * public class FieldNotEmptyCondition implements WorkflowConditionEvaluator {
 *     public String conditionType() { return "field_not_empty"; }
 *     public boolean evaluate(Map<String, Object> config, ExecutionContext ctx, Map<String, Object> entity) {
 *         String field = (String) config.get("field");
 *         return entity.get(field) != null && !entity.get(field).toString().isBlank();
 *     }
 * }
 * }</pre>
 *
 * <h3>Built-in types</h3>
 * <ul>
 *   <li>field_not_empty — entity field must be non-null</li>
 *   <li>field_comparison — entity field compared to a literal value</li>
 *   <li>payload_field_not_empty — transition payload must contain a key</li>
 *   <li>role_check — actor must hold a role</li>
 * </ul>
 *
 * <h3>Thread safety</h3>
 * Implementations must be stateless Spring singletons.
 */
public interface WorkflowConditionEvaluator {

    /**
     * @return unique type key, matches WorkflowConditionConfig.type
     */
    String conditionType();

    /**
     * Evaluate the condition.
     *
     * @param config  the condition's configuration (from DB, e.g. {"field":"total","operator":"gt","value":0})
     * @param context the full execution context including principal, payload, correlationId
     * @param entity  the domain entity loaded by EntityAdapter.loadEntity()
     * @return {@code true} if the condition passes, {@code false} to block the transition
     */
    boolean evaluate(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity);
}
