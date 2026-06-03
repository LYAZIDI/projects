package com.platform.workflow.kernel.workflow.conditions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowConditionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Built-in condition: actor must hold a specific Spring Security role.
 *
 * <p>Config: {@code {"role": "MANAGER"}}
 *
 * <p>Note: transition-level permissions (requiredPermission field) already enforce
 * access control. This condition provides ADDITIONAL fine-grained control within
 * a transition that multiple roles can attempt, but only certain roles complete.
 *
 * <p>Use case: multiple roles can "submit" a document, but only MANAGER role
 * triggers final approval (as a condition, not a permission gate).
 */
@Component
public class RoleCheckCondition implements WorkflowConditionEvaluator {

    @Override
    public String conditionType() {
        return "role_check";
    }

    @Override
    public boolean evaluate(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String requiredRole = (String) config.get("role");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_" + requiredRole));
    }
}
