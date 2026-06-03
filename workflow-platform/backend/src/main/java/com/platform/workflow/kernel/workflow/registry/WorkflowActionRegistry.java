package com.platform.workflow.kernel.workflow.registry;

import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.WorkflowActionExecutor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Auto-discovered registry of all {@link WorkflowActionExecutor} beans.
 *
 * @see WorkflowConditionRegistry for the Open/Closed rationale.
 */
@Component
@Slf4j
public class WorkflowActionRegistry {

    private final Map<String, WorkflowActionExecutor> executors;

    public WorkflowActionRegistry(List<WorkflowActionExecutor> all) {
        this.executors = all.stream()
            .collect(Collectors.toUnmodifiableMap(
                WorkflowActionExecutor::actionType,
                Function.identity()
            ));
        log.info("[WorkflowActionRegistry] Registered {} action types: {}",
            executors.size(), executors.keySet());
    }

    public WorkflowActionExecutor get(String type) {
        WorkflowActionExecutor executor = executors.get(type);
        if (executor == null) {
            throw new WorkflowException(
                WorkflowException.Code.ADAPTER_NOT_FOUND,
                "No action executor registered for type: " + type
            );
        }
        return executor;
    }

    public Map<String, WorkflowActionExecutor> all() {
        return executors;
    }
}
