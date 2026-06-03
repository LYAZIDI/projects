package com.platform.workflow.kernel.security.jwt;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * The authenticated principal stored in the Spring Security context.
 *
 * <p>Carries all identity and authorization data decoded from the JWT.
 * Access it from any Spring component via:
 * <pre>{@code
 * WorkflowPrincipal principal = (WorkflowPrincipal)
 *     SecurityContextHolder.getContext().getAuthentication().getPrincipal();
 * }</pre>
 *
 * Or via method injection:
 * <pre>{@code
 * public void doSomething(@AuthenticationPrincipal WorkflowPrincipal principal) { ... }
 * }</pre>
 */
@Getter
@RequiredArgsConstructor
public class WorkflowPrincipal {

    private final String userId;
    private final String email;
    private final UUID tenantId;
    private final List<String> roles;
    private final List<String> permissions;

    public boolean hasPermission(String permission) {
        return permissions != null && permissions.contains(permission);
    }

    public boolean hasRole(String role) {
        return roles != null && roles.contains(role);
    }

    @Override
    public String toString() {
        return "WorkflowPrincipal{userId=" + userId + ", tenantId=" + tenantId + ", email=" + email + "}";
    }
}
