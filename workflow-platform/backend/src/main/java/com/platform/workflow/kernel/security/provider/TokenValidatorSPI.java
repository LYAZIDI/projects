package com.platform.workflow.kernel.security.provider;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;

/**
 * SPI — pluggable token validator.
 *
 * <p>Implement this interface to support any authentication provider:
 * internal JWT, Keycloak, Azure AD, Okta, Auth0, etc.
 *
 * <p>The {@link com.platform.workflow.kernel.security.jwt.JwtAuthenticationFilter}
 * iterates all registered beans and delegates to the first one that
 * {@link #supports(String)} the incoming token.
 *
 * <h3>Built-in implementations</h3>
 * <ul>
 *   <li>{@code InternalTokenValidator}  — HMAC-signed JWT (our own AuthController)</li>
 *   <li>{@code OidcTokenValidator}      — OIDC RS256 JWT (Keycloak, Azure AD, Okta…)</li>
 * </ul>
 */
public interface TokenValidatorSPI {

    /** Unique identifier for this provider (used in logs and config). */
    String providerId();

    /**
     * Returns {@code true} if this validator can handle the given raw token.
     * Fast check — no network call, no crypto.
     */
    boolean supports(String rawToken);

    /**
     * Validates the token and returns the authenticated principal.
     *
     * @throws com.platform.workflow.kernel.security.provider.TokenValidationException
     *         if the token is invalid, expired, or cannot be mapped to a principal
     */
    WorkflowPrincipal validate(String rawToken);
}
