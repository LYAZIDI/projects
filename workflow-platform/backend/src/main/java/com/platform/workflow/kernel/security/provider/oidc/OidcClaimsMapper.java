package com.platform.workflow.kernel.security.provider.oidc;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.kernel.security.provider.ClaimsMapper;
import com.platform.workflow.kernel.security.provider.TokenValidationException;
import com.platform.workflow.kernel.security.provider.AuthProviderProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Maps OIDC claims to {@link WorkflowPrincipal} using configurable claim names.
 *
 * <p>Supports dot-notation for nested claims (e.g. {@code "realm_access.roles"} for Keycloak).
 *
 * <h3>Keycloak example</h3>
 * <pre>
 * app.auth.oidc.claims-mapping:
 *   tenant-id-claim:    tenant_id          # custom mapper in Keycloak
 *   roles-claim:        realm_access.roles  # dot-notation = nested
 *   permissions-claim:  realm_access.roles  # same list used as perms
 * </pre>
 *
 * <h3>Azure AD example</h3>
 * <pre>
 * app.auth.oidc.claims-mapping:
 *   user-id-claim:      oid
 *   email-claim:        upn
 *   tenant-id-claim:    extension_tenantId   # custom directory extension
 *   roles-claim:        roles
 *   permissions-claim:  roles
 * </pre>
 */
@RequiredArgsConstructor
@Slf4j
public class OidcClaimsMapper implements ClaimsMapper {

    private final AuthProviderProperties.Oidc.ClaimsMapping mapping;

    @Override
    public WorkflowPrincipal map(Map<String, Object> claims) {
        String userId  = getString(claims, mapping.getUserIdClaim());
        String email   = getString(claims, mapping.getEmailClaim());
        String tenantRaw = getString(claims, mapping.getTenantIdClaim());

        if (userId == null) {
            throw new TokenValidationException(
                "OIDC token missing user-id claim: '" + mapping.getUserIdClaim() + "'");
        }
        if (tenantRaw == null) {
            throw new TokenValidationException(
                "OIDC token missing tenant-id claim: '" + mapping.getTenantIdClaim() +
                "'. Configure app.auth.oidc.claims-mapping.tenant-id-claim or add a custom mapper in your IdP.");
        }

        UUID tenantId;
        try {
            tenantId = UUID.fromString(tenantRaw);
        } catch (IllegalArgumentException e) {
            throw new TokenValidationException(
                "OIDC token tenant-id claim is not a valid UUID: '" + tenantRaw + "'", e);
        }

        List<String> roles = getList(claims, mapping.getRolesClaim());
        List<String> perms = getList(claims, mapping.getPermissionsClaim());

        log.debug("[OidcClaimsMapper] Mapped principal: userId={}, tenant={}, roles={}, perms={}",
            userId, tenantId, roles, perms);

        return new WorkflowPrincipal(userId, email, tenantId, roles, perms);
    }

    // ── Helpers — support dot-notation for nested claims ─────────────────────

    @SuppressWarnings("unchecked")
    private String getString(Map<String, Object> claims, String claimPath) {
        Object val = resolvePath(claims, claimPath);
        return val != null ? val.toString() : null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getList(Map<String, Object> claims, String claimPath) {
        Object val = resolvePath(claims, claimPath);
        if (val instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return Collections.emptyList();
    }

    /**
     * Resolves dot-notation paths like {@code "realm_access.roles"}.
     * Falls back to treating the whole path as a flat key.
     */
    @SuppressWarnings("unchecked")
    private Object resolvePath(Map<String, Object> claims, String path) {
        if (path == null) return null;
        String[] parts = path.split("\\.", 2);
        if (parts.length == 1) {
            return claims.get(path);
        }
        Object nested = claims.get(parts[0]);
        if (nested instanceof Map<?, ?> nestedMap) {
            return resolvePath((Map<String, Object>) nestedMap, parts[1]);
        }
        // fallback: try flat key with dots
        return claims.get(path);
    }
}
