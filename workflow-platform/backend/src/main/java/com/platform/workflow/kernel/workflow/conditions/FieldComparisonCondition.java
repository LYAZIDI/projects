package com.platform.workflow.kernel.workflow.conditions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowConditionEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Built-in condition: compare an entity field to a literal value.
 *
 * <p>Config: {@code {"field": "total", "operator": "gt", "value": 0}}
 *
 * <p>Supported operators: {@code eq, ne, gt, gte, lt, lte}
 *
 * <p>Use case: ensure a Quote total > 0 before sending.
 */
@Component
public class FieldComparisonCondition implements WorkflowConditionEvaluator {

    @Override
    public String conditionType() {
        return "field_comparison";
    }

    @Override
    public boolean evaluate(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String field    = (String) config.get("field");
        String operator = (String) config.get("operator");
        Object cfgValue = config.get("value");

        Object fieldValue = entity.get(field);
        if (fieldValue == null) return false;

        try {
            BigDecimal actual   = new BigDecimal(fieldValue.toString());
            BigDecimal expected = new BigDecimal(cfgValue.toString());
            int cmp = actual.compareTo(expected);

            return switch (operator) {
                case "eq"  -> cmp == 0;
                case "ne"  -> cmp != 0;
                case "gt"  -> cmp > 0;
                case "gte" -> cmp >= 0;
                case "lt"  -> cmp < 0;
                case "lte" -> cmp <= 0;
                default    -> false;
            };
        } catch (NumberFormatException e) {
            // Fall back to string equality for non-numeric fields
            return "eq".equals(operator)
                ? fieldValue.toString().equals(cfgValue.toString())
                : !fieldValue.toString().equals(cfgValue.toString());
        }
    }
}
