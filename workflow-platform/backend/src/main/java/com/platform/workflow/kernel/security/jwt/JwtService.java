package com.platform.workflow.kernel.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * JWT generation and validation service.
 *
 * <p>Claims layout:
 * <pre>
 * {
 *   "sub":       "userId",
 *   "email":     "user@example.com",
 *   "tenantId":  "uuid",
 *   "roles":     ["ADMIN", "SALES"],
 *   "perms":     ["QUOTE_APPROVE", "LEAD_CREATE"],
 *   "iat":       ...,
 *   "exp":       ...
 * }
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {

    private final JwtProperties props;

    private SecretKey secretKey() {
        return Keys.hmacShaKeyFor(props.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    /** Generate a signed access token. */
    public String generateAccessToken(UUID userId, String email, UUID tenantId,
                                      List<String> roles, List<String> permissions) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("tenantId", tenantId.toString())
            .claim("roles", roles)
            .claim("perms", permissions)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusMillis(props.getAccessTokenExpiryMs())))
            .signWith(secretKey())
            .compact();
    }

    /** Parse and validate a token. Returns parsed claims or throws. */
    public Claims validateAndParse(String token) {
        return Jwts.parser()
            .verifyWith(secretKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public boolean isValid(String token) {
        try {
            validateAndParse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("[JWT] Invalid token: {}", e.getMessage());
            return false;
        }
    }

    // ── Claim extractors ─────────────────────────────────────────────────────

    public String extractUserId(String token) {
        return validateAndParse(token).getSubject();
    }

    public String extractEmail(String token) {
        return (String) validateAndParse(token).get("email");
    }

    public UUID extractTenantId(String token) {
        return UUID.fromString((String) validateAndParse(token).get("tenantId"));
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        return (List<String>) validateAndParse(token).get("roles");
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        return (List<String>) validateAndParse(token).get("perms");
    }
}
