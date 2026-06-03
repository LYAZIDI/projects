package com.platform.workflow;

import com.platform.workflow.crm.workflow.CrmWorkflowDefinitions;
import com.platform.workflow.marketplace.seed.MarketplaceTemplateSeeder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Spring Boot entry point for the Workflow Platform.
 *
 * <p>Enabled features:
 * <ul>
 *   <li>{@code @EnableJpaAuditing} — fills createdAt/updatedAt/createdBy/updatedBy automatically</li>
 *   <li>{@code @EnableCaching}     — activates @Cacheable on WorkflowDefinitionRepository</li>
 *   <li>{@code @EnableAsync}       — allows @Async on CrmWorkflowEventListener</li>
 * </ul>
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@Slf4j
public class WorkflowPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkflowPlatformApplication.class, args);
    }

    // ── Demo data seeder (dev + staging only) ─────────────────────────────────

    /**
     * Seeds CRM workflow definitions for a fixed demo tenant at startup.
     *
     * <p>Only active in {@code dev} and {@code staging} profiles.
     * Production tenants manage definitions via the admin API.
     */
    @Component
    @Profile({"dev", "staging"})
    @RequiredArgsConstructor
    @Slf4j
    static class DevDataSeeder implements ApplicationRunner {

        private final CrmWorkflowDefinitions    crmDefs;
        private final MarketplaceTemplateSeeder marketplaceSeeder;

        /** Demo tenant UUID — must match the seed JWT issuer config in application-dev.yml */
        static final UUID DEMO_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000001");

        @Override
        public void run(ApplicationArguments args) {
            // 1. Seed engine definitions for the demo tenant
            log.info("[Seed] Seeding CRM workflow definitions for demo tenant {}", DEMO_TENANT);
            try {
                crmDefs.seedLeadDefinition(DEMO_TENANT);
                crmDefs.seedQuoteDefinition(DEMO_TENANT);
                log.info("[Seed] CRM workflow definitions seeded successfully");
            } catch (Exception ex) {
                log.error("[Seed] Failed to seed CRM definitions — app continues, but dev data is missing", ex);
            }

            // 2. Seed marketplace catalog templates (public, platform-owned)
            log.info("[Seed] Seeding marketplace templates");
            try {
                marketplaceSeeder.seedAll();
            } catch (Exception ex) {
                log.error("[Seed] Failed to seed marketplace templates — catalog may be empty", ex);
            }
        }
    }
}
