package com.platform.workflow.kernel.security.provider.internal;

import com.platform.workflow.kernel.security.jwt.JwtService;
import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.kernel.security.provider.TokenValidationException;
import com.platform.workflow.kernel.security.provider.TokenValidatorSPI;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Validates tokens issued by our own {@link com.platform.workflow.kernel.security.auth.AuthController}.
 *
 * <p>Active when {@code app.auth.provider=internal} (default).
 * Also active alongside OIDC if you need both (e.g. migration period).
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "app.auth.provider", havingValue = "internal", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class InternalTokenValidator implements TokenValidatorSPI {

    private final JwtService       jwtService;
    private final InternalClaimsMapper claimsMapper = new InternalClaimsMapper();

    @Override
    public String providerId() { return "internal"; }

    @Override
    public boolean supports(String rawToken) {
        // Fast check before crypto: all internal tokens are HS384 (alg header = HS384)
        // We delegate full validation to jwtService.isValid() in validate()
        return rawToken != null && !rawToken.isBlank();
    }

    @Override
    public WorkflowPrincipal validate(String rawToken) {
        try {
            Claims claims = jwtService.validateAndParse(rawToken);

            Map<String, Object> claimsMap = new HashMap<>(claims);
            claimsMap.put("sub", claims.getSubject());

            return claimsMapper.map(claimsMap);

        } catch (JwtException e) {
            throw new TokenValidationException("Internal token validation failed: " + e.getMessage(), e);
        }
    }
}
