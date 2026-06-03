package com.platform.workflow.kernel.security.provider;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;

import java.util.Map;

/**
 * SPI — normalises provider-specific JWT claims into a {@link WorkflowPrincipal}.
 *
 * <p>Every authentication provider uses different claim names:
 * <ul>
 *   <li>Internal    : {@code sub}, {@code email}, {@code tenantId}, {@code roles}, {@code perms}</li>
 *   <li>Keycloak    : {@code realm_access.roles}, {@code resource_access}, custom {@code tenant_id}</li>
 *   <li>Azure AD    : {@code oid}, {@code upn}, {@code roles}, custom extension attribute</li>
 *   <li>Okta / Auth0: {@code https://app/roles}, {@code https://app/tenant_id}, etc.</li>
 * </ul>
 *
 * <p>Each {@link TokenValidatorSPI} implementation uses its own {@code ClaimsMapper}
 * to produce a uniform {@link WorkflowPrincipal} regardless of the token source.
 */
public interface ClaimsMapper {

    /**
     * Maps raw JWT claims to a {@link WorkflowPrincipal}.
     *
     * @param claims raw claims map from the decoded JWT
     * @return fully populated principal
     * @throws TokenValidationException if required claims are missing or malformed
     */
    WorkflowPrincipal map(Map<String, Object> claims);
}
