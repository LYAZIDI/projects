package com.platform.workflow.clinic.workflow;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Seeds clinic workflow definitions at startup (idempotent — safe to run on every boot).
 *
 * <p>By default, seeds for the demo tenant configured via {@code app.clinic.demo-tenant-id}.
 * If not set, a fixed dev UUID is used so the local/Neon dev environment always has workflows.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClinicBootstrapper {

    private final ClinicWorkflowDefinitions definitions;

    /** Override via env var or application.yml: {@code app.clinic.demo-tenant-id=<uuid>} */
    @Value("${app.clinic.demo-tenant-id:00000000-0000-0000-0000-000000000001}")
    private UUID demoTenantId;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("[ClinicBootstrapper] Seeding clinic workflows for tenant {}", demoTenantId);
        try {
            definitions.seedAll(demoTenantId);
            log.info("[ClinicBootstrapper] Clinic workflows ready.");
        } catch (Exception e) {
            // Non-fatal: app starts normally even if seeding fails (e.g. already exists, DB constraint)
            log.warn("[ClinicBootstrapper] Seeding failed (may already exist): {}", e.getMessage());
        }
    }
}
