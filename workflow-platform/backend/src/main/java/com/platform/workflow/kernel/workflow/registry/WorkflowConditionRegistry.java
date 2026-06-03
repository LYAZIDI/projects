package com.platform.workflow.kernel.workflow.registry;

import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.WorkflowConditionEvaluator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Auto-discovered registry of all {@link WorkflowConditionEvaluator} beans.
 *
 * <p>Spring collects every @Component implementing WorkflowConditionEvaluator
 * and injects them here at startup. Domain modules add their custom evaluators
 * simply by declaring a @Component — zero engine changes required.
 *
 * <p>Open/Closed Principle in action: closed for modification, open for extension.
 */
@Component
@Slf4j
public class WorkflowConditionRegistry {

    private final Map<String, WorkflowConditionEvaluator> evaluators;

    public WorkflowConditionRegistry(List<WorkflowConditionEvaluator> all) {
        this.evaluators = all.stream()
            .collect(Collectors.toUnmodifiableMap(
                WorkflowConditionEvaluator::conditionType,
                Function.identity()
            ));
        log.info("[WorkflowConditionRegistry] Registered {} condition types: {}",
            evaluators.size(), evaluators.keySet());
    }

    /**
     * Resolve an evaluator by type key.
     *
     * @throws WorkflowException(CONDITION_FAILED) if no evaluator is registered for this type
     */
    public WorkflowConditionEvaluator get(String type) {
        WorkflowConditionEvaluator evaluator = evaluators.get(type);
        if (evaluator == null) {
            throw new WorkflowException(
                WorkflowException.Code.CONDITION_FAILED,
                "No condition evaluator registered for type: " + type
            );
        }
        return evaluator;
    }

    public Map<String, WorkflowConditionEvaluator> all() {
        return evaluators;
    }
}
