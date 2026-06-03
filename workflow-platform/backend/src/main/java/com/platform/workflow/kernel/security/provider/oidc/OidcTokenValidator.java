package com.platform.workflow.kernel.security.provider.oidc;

import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.kernel.security.provider.AuthProviderProperties;
import com.platform.workflow.kernel.security.provider.TokenValidationException;
import com.platform.workflow.kernel.security.provider.TokenValidatorSPI;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Validates RS256/RS512 tokens issued by any OIDC-compliant provider
 * (Keycloak, Azure AD, Okta, Auth0, etc.).
 *
 * <p>Active when {@code app.auth.provider=oidc}.
 * Fetches JWKS from {@code <issuer-uri>/.well-known/openid-configuration} automatically.
 *
 * <h3>Switch to Keycloak in 3 lines</h3>
 * <pre>
 * app:
 *   auth:
 *     provider: oidc
 *     oidc:
 *       issuer-uri: https://keycloak.client.com/realms/production
 *       claims-mapping:
 *         tenant-id-claim:    tenant_id
 *         roles-claim:        realm_access.roles
 *         permissions-claim:  realm_access.roles
 * </pre>
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "app.auth.provider", havingValue = "oidc")
@RequiredArgsConstructor
@Slf4j
public class OidcTokenValidator implements TokenValidatorSPI {

    private final AuthProviderProperties props;

    private JwtDecoder      jwtDecoder;
    private OidcClaimsMapper claimsMapper;

    @PostConstruct
    public void init() {
        String issuerUri = props.getOidc().getIssuerUri();
        if (issuerUri == null || issuerUri.isBlank()) {
            throw new IllegalStateException(
                "[OidcTokenValidator] app.auth.oidc.issuer-uri is required when provider=oidc");
        }

        // Spring fetches JWKS automatically from <issuer>/.well-known/openid-configuration
        this.jwtDecoder  = NimbusJwtDecoder.withIssuerLocation(issuerUri).build();
        this.claimsMapper = new OidcClaimsMapper(props.getOidc().getClaimsMapping());

        log.info("[OidcTokenValidator] Initialized — issuer: {}", issuerUri);
    }

    @Override
    public String providerId() { return "oidc"; }

    @Override
    public boolean supports(String rawToken) {
        // Accept any non-blank token — crypto validation happens in validate()
        return rawToken != null && !rawToken.isBlank();
    }

    @Override
    public WorkflowPrincipal validate(String rawToken) {
        try {
            Jwt jwt = jwtDecoder.decode(rawToken);

            Map<String, Object> claims = new HashMap<>(jwt.getClaims());
            // Normalize: ensure "sub" key is present (Spring JWT puts it in subject)
            claims.put("sub", jwt.getSubject());

            return claimsMapper.map(claims);

        } catch (JwtException e) {
            throw new TokenValidationException("OIDC token validation failed: " + e.getMessage(), e);
        }
    }
}
