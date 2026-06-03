package com.platform.workflow.kernel.workflow.spi;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;

import java.util.Map;

/**
 * PORT — executes a single pre-commit action on a transition.
 *
 * <p>Actions run BEFORE the DB transaction (step 7 in the pipeline).
 * They can enrich {@code context.getPayload()} with derived values that
 * the EntityAdapter will persist in step 8b.
 *
 * <h3>Registration</h3>
 * <pre>{@code
 * @Component
 * public class SetFieldAction implements WorkflowActionExecutor {
 *     public String actionType() { return "set_field"; }
 *     public void execute(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
 *         String field = (String) config.get("field");
 *         Object value = resolveValue(config.get("value"), context);
 *         context.getPayload().put(field, value);
 *     }
 * }
 * }</pre>
 *
 * <h3>Built-in types</h3>
 * <ul>
 *   <li>set_field — sets a payload field to a literal value or magic (__NOW__, __USER_ID__)</li>
 *   <li>copy_payload_field — copies a value from one payload key to another</li>
 *   <li>emit_event — records an event type in payload (engine publishes it post-commit)</li>
 *   <li>compute_total — domain-agnostic numeric computation</li>
 * </ul>
 *
 * <h3>Thread safety</h3>
 * Implementations must be stateless Spring singletons.
 */
public interface WorkflowActionExecutor {

    /**
     * @return unique type key, matches WorkflowActionConfig.type
     */
    String actionType();

    /**
     * Execute the action.
     *
     * <p>May mutate {@code context.getPayload()} to enrich state that
     * EntityAdapter.updateState() will persist.
     *
     * @param config  the action's configuration (from DB)
     * @param context the full execution context (mutable payload)
     * @param entity  the domain entity snapshot (read-only)
     */
    void execute(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity);
}
