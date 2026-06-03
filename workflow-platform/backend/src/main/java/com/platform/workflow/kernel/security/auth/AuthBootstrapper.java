package com.platform.workflow.kernel.security.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Seeds demo users at startup (idempotent).
 * Désactivé si provider=oidc (les users viennent de l'IdP externe).
 *
 * <p>All users belong to the demo tenant {@code 00000000-0000-0000-0000-000000000001}.
 *
 * <pre>
 * admin@clinic.demo       / Admin123!    → ADMIN + all clinic perms
 * frontdesk@clinic.demo   / Demo123!     → PERM_CLINIC_FRONT_DESK
 * nurse@clinic.demo       / Demo123!     → PERM_CLINIC_NURSE
 * admissions@clinic.demo  / Demo123!     → PERM_CLINIC_ADMISSIONS
 * facility@clinic.demo    / Demo123!     → PERM_CLINIC_FACILITY_MANAGER
 * technician@clinic.demo  / Demo123!     → PERM_CLINIC_TECHNICIAN
 * </pre>
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.auth.provider", havingValue = "internal", matchIfMissing = true)
public class AuthBootstrapper {

    private static final UUID DEMO_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final UserRepository  userRepo;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        createIfAbsent("admin@clinic.demo",      "Admin123!", "Admin Clinique",
            List.of("ADMIN"),
            List.of("PERM_CLINIC_ADMIN", "PERM_CLINIC_FRONT_DESK", "PERM_CLINIC_ADMISSIONS",
                    "PERM_CLINIC_NURSE", "PERM_CLINIC_FACILITY_MANAGER", "PERM_CLINIC_TECHNICIAN",
                    "PERM_WORKFLOW_ADMIN"));

        createIfAbsent("frontdesk@clinic.demo",  "Demo123!", "Accueil",
            List.of("FRONT_DESK"),
            List.of("PERM_CLINIC_FRONT_DESK"));

        createIfAbsent("nurse@clinic.demo",      "Demo123!", "Infirmière",
            List.of("NURSE"),
            List.of("PERM_CLINIC_NURSE"));

        createIfAbsent("admissions@clinic.demo", "Demo123!", "Admissions",
            List.of("ADMISSIONS"),
            List.of("PERM_CLINIC_ADMISSIONS"));

        createIfAbsent("facility@clinic.demo",   "Demo123!", "Responsable Installations",
            List.of("FACILITY_MANAGER"),
            List.of("PERM_CLINIC_FACILITY_MANAGER"));

        createIfAbsent("technician@clinic.demo", "Demo123!", "Technicien",
            List.of("TECHNICIAN"),
            List.of("PERM_CLINIC_TECHNICIAN"));

        log.info("[AuthBootstrapper] Demo users ready (tenant={})", DEMO_TENANT);
    }

    private void createIfAbsent(String email, String password, String fullName,
                                 List<String> roles, List<String> permissions) {
        if (userRepo.existsByEmailAndTenantId(email, DEMO_TENANT)) return;

        userRepo.save(User.builder()
            .tenantId(DEMO_TENANT)
            .email(email)
            .passwordHash(passwordEncoder.encode(password))
            .fullName(fullName)
            .roles(roles)
            .permissions(permissions)
            .build());

        log.info("[AuthBootstrapper] Created user: {}", email);
    }
}
