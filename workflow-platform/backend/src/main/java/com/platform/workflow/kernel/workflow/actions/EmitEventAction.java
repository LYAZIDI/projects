package com.platform.workflow.kernel.workflow.actions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowActionExecutor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Built-in action: records an event type to be published post-commit.
 *
 * <p>Config: {@code {"eventType": "quote.sent"}}
 *
 * <p>This action does NOT publish the event itself — it marks the payload
 * so the engine and domain listeners can react via
 * {@link com.platform.workflow.kernel.workflow.events.WorkflowTransitionCompletedEvent}.
 *
 * <p>Actual Spring Event publishing is always done by the engine after commit.
 * This action merely annotates the context for downstream listeners to filter on.
 */
@Component
public class EmitEventAction implements WorkflowActionExecutor {

    public static final String PAYLOAD_KEY = "_eventTypes";

    @Override
    public String actionType() {
        return "emit_event";
    }

    @Override
    public void execute(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String eventType = (String) config.get("eventType");
        @SuppressWarnings("unchecked")
        java.util.List<String> events = (java.util.List<String>)
            context.getPayload().computeIfAbsent(PAYLOAD_KEY, k -> new java.util.ArrayList<>());
        events.add(eventType);
    }
}
