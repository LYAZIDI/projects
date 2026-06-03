package com.platform.workflow.kernel.security.provider;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration for the pluggable auth provider.
 *
 * <pre>
 * # application.yml
 * app:
 *   auth:
 *     provider: internal          # internal | oidc
 *     oidc:
 *       issuer-uri: https://keycloak.client.com/realms/myrealm
 *       claims-mapping:
 *         user-id-claim:       sub
 *         email-claim:         email
 *         tenant-id-claim:     tenant_id
 *         roles-claim:         realm_access.roles    # dot-notation for nested
 *         permissions-claim:   permissions
 * </pre>
 */
@Component
@ConfigurationProperties(prefix = "app.auth")
@Data
public class AuthProviderProperties {

    /** Active provider: {@code internal} (default) or {@code oidc}. */
    private String provider = "internal";

    private Oidc oidc = new Oidc();

    @Data
    public static class Oidc {

        /**
         * OIDC issuer URI — used to fetch JWKS and validate {@code iss} claim.
         * Example: {@code https://keycloak.client.com/realms/production}
         */
        private String issuerUri;

        /** Optional: audience to validate ({@code aud} claim). Leave blank to skip. */
        private String audience;

        private ClaimsMapping claimsMapping = new ClaimsMapping();

        @Data
        public static class ClaimsMapping {
            /** Claim that contains the user ID (default: {@code sub}). */
            private String userIdClaim      = "sub";
            /** Claim that contains the user email (default: {@code email}). */
            private String emailClaim       = "email";
            /**
             * Claim for tenant ID.
             * Supports dot-notation for nested claims: {@code "context.tenant_id"}
             */
            private String tenantIdClaim    = "tenant_id";
            /**
             * Claim for roles list.
             * Supports dot-notation: {@code "realm_access.roles"} for Keycloak.
             */
            private String rolesClaim       = "roles";
            /**
             * Claim for permissions list.
             * For Keycloak use {@code "realm_access.roles"}.
             * For Azure AD use {@code "roles"}.
             * For Auth0 use {@code "https://myapp.com/permissions"}.
             */
            private String permissionsClaim = "permissions";
        }
    }
}
