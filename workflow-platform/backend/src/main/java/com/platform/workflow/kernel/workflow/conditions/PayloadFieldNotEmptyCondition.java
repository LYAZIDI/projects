package com.platform.workflow.kernel.workflow.conditions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowConditionEvaluator;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Built-in condition: the caller's request payload must contain a non-blank value.
 *
 * <p>Config: {@code {"field": "lostReason"}}
 *
 * <p>Use case: force the user to provide a lostReason when closing a Lead as lost.
 * Without this condition, the "lose" transition would succeed with no reason recorded.
 */
@Component
public class PayloadFieldNotEmptyCondition implements WorkflowConditionEvaluator {

    @Override
    public String conditionType() {
        return "payload_field_not_empty";
    }

    @Override
    public boolean evaluate(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String field = (String) config.get("field");
        return context.payloadContains(field);
    }
}
