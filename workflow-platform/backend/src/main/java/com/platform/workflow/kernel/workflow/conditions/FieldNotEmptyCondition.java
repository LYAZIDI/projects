package com.platform.workflow.kernel.workflow.conditions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowConditionEvaluator;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Built-in condition: entity field must be non-null and non-blank.
 *
 * <p>Config: {@code {"field": "contactId"}}
 *
 * <p>Use case: ensure a Quote has a contact before it can be sent.
 */
@Component
public class FieldNotEmptyCondition implements WorkflowConditionEvaluator {

    @Override
    public String conditionType() {
        return "field_not_empty";
    }

    @Override
    public boolean evaluate(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String field = (String) config.get("field");
        Object value = entity.get(field);
        return value != null && !value.toString().isBlank();
    }
}
