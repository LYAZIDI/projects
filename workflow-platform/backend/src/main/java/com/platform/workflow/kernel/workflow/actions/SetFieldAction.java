package com.platform.workflow.kernel.workflow.actions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowActionExecutor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Built-in action: set a payload field to a configured value.
 *
 * <p>Config: {@code {"field": "sentAt", "value": "__NOW__"}}
 *
 * <p>Magic values:
 * <ul>
 *   <li>{@code __NOW__} — current UTC instant (ISO-8601 string)</li>
 *   <li>{@code __USER_ID__} — the authenticated user's ID</li>
 *   <li>{@code __USER_EMAIL__} — the authenticated user's email</li>
 *   <li>Any other value — used as a literal string</li>
 * </ul>
 *
 * <p>The EntityAdapter reads {@code context.getPayload()} and persists these values.
 */
@Component
public class SetFieldAction implements WorkflowActionExecutor {

    @Override
    public String actionType() {
        return "set_field";
    }

    @Override
    public void execute(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String field = (String) config.get("field");
        Object raw   = config.get("value");

        Object resolved = switch (raw.toString()) {
            case "__NOW__"        -> Instant.now().toString();
            case "__USER_ID__"    -> context.getUserId();
            case "__USER_EMAIL__" -> context.getUserEmail();
            default               -> raw;
        };

        context.payloadPut(field, resolved);
    }
}
