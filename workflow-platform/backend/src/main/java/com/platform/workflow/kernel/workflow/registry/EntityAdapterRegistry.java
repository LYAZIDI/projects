package com.platform.workflow.kernel.workflow.registry;

import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import com.platform.workflow.kernel.workflow.spi.EntityAdapter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Auto-discovered registry of all {@link EntityAdapter} beans.
 *
 * <p>At startup, Spring collects every @Component implementing EntityAdapter.
 * The engine uses this registry to resolve the correct adapter for a given entityType.
 *
 * <p>Domain modules register their adapters by declaring a @Component:
 * <pre>{@code
 * // In module 'crm':
 * @Component
 * public class LeadEntityAdapter implements EntityAdapter { ... }
 *
 * // In module 'hr':
 * @Component
 * public class EmployeeEntityAdapter implements EntityAdapter { ... }
 * }</pre>
 *
 * No engine code changes needed. Ever.
 */
@Component
@Slf4j
public class EntityAdapterRegistry {

    private final Map<String, EntityAdapter> adapters;

    public EntityAdapterRegistry(List<EntityAdapter> all) {
        this.adapters = all.stream()
            .collect(Collectors.toUnmodifiableMap(
                EntityAdapter::entityType,
                Function.identity()
            ));
        log.info("[EntityAdapterRegistry] Registered {} entity adapters: {}",
            adapters.size(), adapters.keySet());
    }

    /**
     * Resolve an adapter by entity type.
     *
     * @throws WorkflowException(ADAPTER_NOT_FOUND) if no adapter is registered
     */
    public EntityAdapter get(String entityType) {
        EntityAdapter adapter = adapters.get(entityType);
        if (adapter == null) {
            throw new WorkflowException(
                WorkflowException.Code.ADAPTER_NOT_FOUND,
                "No EntityAdapter registered for type: " + entityType +
                ". Register a @Component implementing EntityAdapter with entityType() = \"" + entityType + "\""
            );
        }
        return adapter;
    }

    public boolean supports(String entityType) {
        return adapters.containsKey(entityType);
    }

    public Map<String, EntityAdapter> all() {
        return adapters;
    }
}
