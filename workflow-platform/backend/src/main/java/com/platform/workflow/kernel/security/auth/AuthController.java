package com.platform.workflow.kernel.security.auth;

import com.platform.workflow.kernel.security.jwt.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication endpoints — all public (whitelisted in SecurityConfig).
 *
 * <pre>
 * POST /api/v1/auth/login   → { accessToken, user }
 * GET  /api/v1/auth/me      → current user info (requires JWT)
 * </pre>
 */
/**
 * Active uniquement avec le provider interne ({@code app.auth.provider=internal}).
 * Avec un provider OIDC externe (Keycloak, Azure AD…), ce controller est désactivé —
 * les tokens sont émis par le serveur d'authentification du client.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.auth.provider", havingValue = "internal", matchIfMissing = true)
public class AuthController {

    private final UserRepository userRepo;
    private final JwtService     jwtService;
    private final PasswordEncoder passwordEncoder;

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid LoginRequest req) {
        User user = userRepo.findByEmailAndActiveTrue(req.email())
            .orElse(null);

        if (user == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            return ResponseEntity.status(401)
                .body(Map.of("error", "Invalid credentials", "code", "AUTH_INVALID_CREDENTIALS"));
        }

        String token = jwtService.generateAccessToken(
            user.getId(), user.getEmail(), user.getTenantId(),
            user.getRoles(), user.getPermissions()
        );

        log.info("[Auth] Login success: {} (tenant={})", user.getEmail(), user.getTenantId());

        return ResponseEntity.ok(Map.of(
            "accessToken", token,
            "tokenType",   "Bearer",
            "user", Map.of(
                "id",          user.getId().toString(),
                "email",       user.getEmail(),
                "fullName",    user.getFullName() != null ? user.getFullName() : "",
                "tenantId",    user.getTenantId().toString(),
                "roles",       user.getRoles(),
                "permissions", user.getPermissions()
            )
        ));
    }

    // ── Refresh-friendly: return current user from token ──────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> me(
        @RequestHeader("Authorization") String authHeader
    ) {
        String token = authHeader.replace("Bearer ", "");
        String userId = jwtService.extractUserId(token);

        return userRepo.findById(java.util.UUID.fromString(userId))
            .map(user -> ResponseEntity.ok(Map.of(
                "id",          user.getId().toString(),
                "email",       user.getEmail(),
                "fullName",    user.getFullName() != null ? user.getFullName() : "",
                "tenantId",    user.getTenantId().toString(),
                "roles",       user.getRoles(),
                "permissions", user.getPermissions()
            )))
            .orElse(ResponseEntity.notFound().build());
    }

    // ── DTO ───────────────────────────────────────────────────────────────────

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank        String password
    ) {}
}
