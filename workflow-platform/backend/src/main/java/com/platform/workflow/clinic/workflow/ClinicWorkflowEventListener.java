package com.platform.workflow.clinic.workflow;

import com.platform.workflow.kernel.workflow.events.WorkflowTransitionCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Reacts to workflow transition events emitted by the engine AFTER commit.
 *
 * <p>This class is the ONLY place where post-transition side effects live:
 * notifications, external API calls, audit log enrichment, etc.
 *
 * <p>All handlers are {@code @Async} — they run outside the HTTP request thread
 * and AFTER the transaction has committed. Failures here do NOT roll back the transition.
 *
 * <p>The engine is completely unaware of these handlers.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClinicWorkflowEventListener {

    // ── Patient events ────────────────────────────────────────────────────────

    @EventListener(condition = "#event.context.entityType == 'patient' && #event.context.transitionKey == 'register_patient'")
    @Async
    public void onPatientRegistered(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Patient {} registered → sending welcome notification",
            event.getContext().getEntityId());
        // TODO: trigger notification service (SMS / email)
    }

    @EventListener(condition = "#event.context.entityType == 'patient' && #event.context.transitionKey == 'admit'")
    @Async
    public void onPatientAdmitted(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Patient {} admitted → creating visit record if needed",
            event.getContext().getEntityId());
        // TODO: auto-create PatientVisit if not exists
    }

    @EventListener(condition = "#event.context.entityType == 'patient' && #event.context.transitionKey == 'discharge'")
    @Async
    public void onPatientDischarged(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Patient {} discharged → releasing bed assignments",
            event.getContext().getEntityId());
        // TODO: release bed, trigger billing workflow
    }

    // ── Visit events ──────────────────────────────────────────────────────────

    @EventListener(condition = "#event.context.entityType == 'patient_visit' && #event.context.transitionKey == 'assign_bed'")
    @Async
    public void onBedAssigned(WorkflowTransitionCompletedEvent event) {
        String bedId = String.valueOf(event.getContext().payloadGet("bedId"));
        log.info("[ClinicEvent] Visit {} assigned to bed {} → updating bed state",
            event.getContext().getEntityId(), bedId);
        // TODO: trigger facility_asset workflow → reserve
    }

    @EventListener(condition = "#event.context.entityType == 'patient_visit' && #event.context.transitionKey == 'close_visit'")
    @Async
    public void onVisitClosed(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Visit {} closed → releasing bed and triggering invoice generation",
            event.getContext().getEntityId());
        // TODO: release bed, trigger billing
    }

    // ── Document events ───────────────────────────────────────────────────────

    @EventListener(condition = "#event.context.entityType == 'patient_document' && #event.context.transitionKey == 'approve'")
    @Async
    public void onDocumentApproved(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Document {} approved → checking patient document completeness",
            event.getContext().getEntityId());
        // TODO: check if all patient docs approved → auto-advance patient to ADMISSION_READY
    }

    @EventListener(condition = "#event.context.entityType == 'patient_document' && #event.context.transitionKey == 'reject'")
    @Async
    public void onDocumentRejected(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Document {} rejected → notifying patient/front desk",
            event.getContext().getEntityId());
        // TODO: send rejection notification
    }

    // ── Asset events ──────────────────────────────────────────────────────────

    @EventListener(condition = "#event.context.entityType == 'facility_asset' && #event.context.transitionKey == 'out_of_service'")
    @Async
    public void onAssetOutOfService(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Asset {} out of service → auto-creating maintenance request",
            event.getContext().getEntityId());
        // TODO: auto-create MaintenanceRequest with priority=HIGH
    }

    // ── Maintenance events ────────────────────────────────────────────────────

    @EventListener(condition = "#event.context.entityType == 'maintenance_request' && #event.context.transitionKey == 'resolve'")
    @Async
    public void onMaintenanceResolved(WorkflowTransitionCompletedEvent event) {
        log.info("[ClinicEvent] Maintenance {} resolved → notifying facility manager",
            event.getContext().getEntityId());
        // TODO: notify facility manager for final close validation
    }

    // ── Generic audit log ─────────────────────────────────────────────────────

    @EventListener(condition = "#event.context.entityType.startsWith('patient') || " +
                               "#event.context.entityType.startsWith('facility') || " +
                               "#event.context.entityType == 'maintenance_request'")
    public void onAnyClinicTransition(WorkflowTransitionCompletedEvent event) {
        log.debug("[ClinicAudit] {} {} : {} → {} ({}ms, user={})",
            event.getContext().getEntityType(),
            event.getContext().getEntityId(),
            event.getFromState(),
            event.getToState(),
            event.getResult().getDurationMs(),
            event.getContext().getUserId());
    }
}
