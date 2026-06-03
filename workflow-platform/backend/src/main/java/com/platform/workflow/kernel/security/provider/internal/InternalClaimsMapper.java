package com.platform.workflow.kernel.security.provider.internal;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.kernel.security.provider.ClaimsMapper;
import com.platform.workflow.kernel.security.provider.TokenValidationException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Maps claims from our own JWT format to {@link WorkflowPrincipal}.
 *
 * <pre>
 * {
 *   "sub":      "user-uuid",
 *   "email":    "user@example.com",
 *   "tenantId": "tenant-uuid",
 *   "roles":    ["ADMIN"],
 *   "perms":    ["PERM_CLINIC_ADMIN", ...]
 * }
 * </pre>
 */
public class InternalClaimsMapper implements ClaimsMapper {

    @Override
    @SuppressWarnings("unchecked")
    public WorkflowPrincipal map(Map<String, Object> claims) {
        try {
            String userId   = (String) claims.get("sub");
            String email    = (String) claims.get("email");
            String tenantRaw = (String) claims.get("tenantId");

            if (userId == null || tenantRaw == null) {
                throw new TokenValidationException("Internal token missing required claims: sub, tenantId");
            }

            UUID tenantId   = UUID.fromString(tenantRaw);
            List<String> roles = (List<String>) claims.getOrDefault("roles", List.of());
            List<String> perms = (List<String>) claims.getOrDefault("perms", List.of());

            return new WorkflowPrincipal(userId, email, tenantId, roles, perms);

        } catch (IllegalArgumentException e) {
            throw new TokenValidationException("Invalid UUID in internal token claims", e);
        }
    }
}
