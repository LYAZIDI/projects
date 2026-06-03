package com.platform.workflow.kernel.security.jwt;

import com.platform.workflow.kernel.security.provider.TokenValidationException;
import com.platform.workflow.kernel.security.provider.TokenValidatorSPI;
import com.platform.workflow.kernel.security.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Provider-agnostic JWT authentication filter.
 *
 * <p>Delegates token validation to the first {@link TokenValidatorSPI} bean that
 * {@link TokenValidatorSPI#supports supports} the incoming token.
 * This filter has zero knowledge of how tokens are signed or which IdP issued them.
 *
 * <p>Adding a new auth provider = implementing {@link TokenValidatorSPI} and registering
 * it as a Spring bean. No changes needed here.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** All registered providers, ordered by {@link org.springframework.core.annotation.Order}. */
    private final List<TokenValidatorSPI> validators;

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest  request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain         filterChain
    ) throws ServletException, IOException {

        String token = extractToken(request);

        if (StringUtils.hasText(token)) {
            tryAuthenticate(token);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            MDC.clear();
        }
    }

    private void tryAuthenticate(String token) {
        for (TokenValidatorSPI validator : validators) {
            if (!validator.supports(token)) continue;
            try {
                WorkflowPrincipal principal = validator.validate(token);
                applyToSecurityContext(principal);
                log.debug("[Auth] Authenticated via provider '{}': user={}, tenant={}",
                    validator.providerId(), principal.getUserId(), principal.getTenantId());
                return; // first successful validator wins
            } catch (TokenValidationException e) {
                log.debug("[Auth] Provider '{}' rejected token: {}", validator.providerId(), e.getMessage());
                // try next validator
            } catch (Exception e) {
                log.warn("[Auth] Unexpected error in provider '{}': {}", validator.providerId(), e.getMessage());
            }
        }
        // No validator succeeded — request continues unauthenticated (Spring Security handles 401)
    }

    private void applyToSecurityContext(WorkflowPrincipal principal) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        principal.getRoles().forEach(r       -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
        principal.getPermissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));

        UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(principal, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);

        TenantContext.set(principal.getTenantId());

        // Correlation / APM context
        String correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        MDC.put("tenantId",      principal.getTenantId().toString());
        MDC.put("userId",        principal.getUserId());
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
