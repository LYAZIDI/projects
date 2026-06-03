package com.platform.workflow.clinic.workflow;

import com.platform.workflow.kernel.workflow.model.*;
import com.platform.workflow.kernel.workflow.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Seeds the 5 clinic workflow definitions at startup (idempotent — skips if already exists).
 *
 * <p>Each workflow is self-contained: states, transitions, conditions, and actions
 * are declared here in pure Java — no YAML, no external config.
 *
 * <h3>Workflows</h3>
 * <ol>
 *   <li>{@code patient}             — onboarding / lifecycle</li>
 *   <li>{@code patient_visit}       — séjour / care episode</li>
 *   <li>{@code patient_document}    — document review</li>
 *   <li>{@code facility_asset}      — equipment lifecycle</li>
 *   <li>{@code maintenance_request} — maintenance ticket</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClinicWorkflowDefinitions {

    private final WorkflowDefinitionRepository repo;

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. PATIENT ONBOARDING
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void seedPatient(UUID tenantId) {
        if (repo.findActiveByTenantAndType(tenantId, "patient").isPresent()) return;

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId).entityType("patient").version(1)
            .label("Parcours Patient")
            .description("Cycle de vie complet du patient : enregistrement → admission → sortie → archivage")
            .isActive(true).build();

        WorkflowState sNew   = s(def, "NEW",               "Nouveau",              "#94A3B8", true,  false, 0);
        WorkflowState sReg   = s(def, "REGISTERED",        "Enregistré",           "#3B82F6", false, false, 1);
        WorkflowState sDocs  = s(def, "DOCUMENTS_PENDING", "Documents en attente", "#F59E0B", false, false, 2);
        WorkflowState sReady = s(def, "ADMISSION_READY",   "Prêt pour admission",  "#8B5CF6", false, false, 3);
        WorkflowState sAdm   = s(def, "ADMITTED",          "Admis",                "#22C55E", false, false, 4);
        WorkflowState sDis   = s(def, "DISCHARGED",        "Sorti",                "#6B7280", false, false, 5);
        WorkflowState sArc   = s(def, "ARCHIVED",          "Archivé",              "#1F2937", false, true,  6);
        def.setStates(List.of(sNew, sReg, sDocs, sReady, sAdm, sDis, sArc));

        // register_patient : NEW → REGISTERED
        WorkflowTransition register = t(def, "register_patient", "Enregistrer le patient",
            "NEW", "REGISTERED", "PERM_CLINIC_FRONT_DESK", "primary");
        register.setActions(List.of(
            a(register, "set_field",  Map.of("field", "registeredBy", "value", "__USER_ID__"), 0),
            a(register, "emit_event", Map.of("eventType", "clinic.patient.registered"),        1)
        ));

        // request_documents : REGISTERED → DOCUMENTS_PENDING
        WorkflowTransition reqDocs = t(def, "request_documents", "Demander documents",
            "REGISTERED", "DOCUMENTS_PENDING", "PERM_CLINIC_ADMISSIONS", "default");
        reqDocs.setActions(List.of(
            a(reqDocs, "emit_event", Map.of("eventType", "clinic.patient.documents_requested"), 0)
        ));

        // validate_documents : DOCUMENTS_PENDING → ADMISSION_READY
        WorkflowTransition valDocs = t(def, "validate_documents", "Valider les documents",
            "DOCUMENTS_PENDING", "ADMISSION_READY", "PERM_CLINIC_ADMISSIONS", "success");
        valDocs.setConditions(List.of(
            c(valDocs, "field_not_empty",   Map.of("field", "nationalId"),       0),
            c(valDocs, "field_comparison",  Map.of("field", "documentsComplete", "operator", "eq", "value", "true"), 1)
        ));
        valDocs.setActions(List.of(
            a(valDocs, "emit_event", Map.of("eventType", "clinic.patient.ready_for_admission"), 0)
        ));

        // admit : ADMISSION_READY → ADMITTED
        WorkflowTransition admit = t(def, "admit", "Admettre",
            "ADMISSION_READY", "ADMITTED", "PERM_CLINIC_ADMISSIONS", "success");
        admit.setConditions(List.of(
            c(admit, "field_comparison", Map.of("field", "hasConsentSigned", "operator", "eq", "value", "true"), 0)
        ));
        admit.setActions(List.of(
            a(admit, "set_field",  Map.of("field", "admittedAt", "value", "__NOW__"), 0),
            a(admit, "emit_event", Map.of("eventType", "clinic.patient.admitted"),    1)
        ));

        // discharge : ADMITTED → DISCHARGED
        WorkflowTransition discharge = t(def, "discharge", "Sortie du patient",
            "ADMITTED", "DISCHARGED", "PERM_CLINIC_ADMISSIONS", "warning");
        discharge.setActions(List.of(
            a(discharge, "set_field",  Map.of("field", "dischargedAt", "value", "__NOW__"), 0),
            a(discharge, "emit_event", Map.of("eventType", "clinic.patient.discharged"),    1)
        ));

        // archive : DISCHARGED → ARCHIVED
        WorkflowTransition archive = t(def, "archive", "Archiver",
            "DISCHARGED", "ARCHIVED", "PERM_CLINIC_ADMIN", "default");
        archive.setActions(List.of(
            a(archive, "emit_event", Map.of("eventType", "clinic.patient.archived"), 0)
        ));

        def.setTransitions(List.of(register, reqDocs, valDocs, admit, discharge, archive));
        repo.save(def);
        log.info("[Clinic] Seeded PATIENT workflow for tenant {}", tenantId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. PATIENT VISIT (SÉJOUR)
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void seedPatientVisit(UUID tenantId) {
        if (repo.findActiveByTenantAndType(tenantId, "patient_visit").isPresent()) return;

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId).entityType("patient_visit").version(1)
            .label("Séjour Patient")
            .description("Suivi du séjour du patient : arrivée → lit → soins → sortie")
            .isActive(true).build();

        def.setStates(List.of(
            s(def, "CREATED",             "Créé",               "#94A3B8", true,  false, 0),
            s(def, "CHECKED_IN",          "Arrivé",             "#3B82F6", false, false, 1),
            s(def, "ASSIGNED_TO_BED",     "Lit assigné",        "#8B5CF6", false, false, 2),
            s(def, "IN_PROGRESS",         "En cours",           "#22C55E", false, false, 3),
            s(def, "READY_FOR_DISCHARGE", "Prêt pour sortie",   "#F59E0B", false, false, 4),
            s(def, "CLOSED",              "Clôturé",            "#1F2937", false, true,  5)
        ));

        // check_in
        WorkflowTransition checkIn = t(def, "check_in", "Enregistrer l'arrivée",
            "CREATED", "CHECKED_IN", "PERM_CLINIC_FRONT_DESK", "primary");
        checkIn.setConditions(List.of(
            c(checkIn, "field_comparison", Map.of("field", "patientAdmitted", "operator", "eq", "value", "true"), 0)
        ));
        checkIn.setActions(List.of(
            a(checkIn, "set_field",  Map.of("field", "checkInAt", "value", "__NOW__"), 0),
            a(checkIn, "emit_event", Map.of("eventType", "clinic.visit.checked_in"),   1)
        ));

        // assign_bed
        WorkflowTransition assignBed = t(def, "assign_bed", "Assigner un lit",
            "CHECKED_IN", "ASSIGNED_TO_BED", "PERM_CLINIC_NURSE", "primary");
        assignBed.setConditions(List.of(
            c(assignBed, "payload_field_not_empty", Map.of("field", "bedId"), 0)
        ));
        assignBed.setActions(List.of(
            a(assignBed, "copy_payload_field", Map.of("from", "bedId", "to", "assignedBedId"), 0),
            a(assignBed, "emit_event",         Map.of("eventType", "clinic.visit.bed_assigned"), 1)
        ));

        // start_care
        WorkflowTransition startCare = t(def, "start_care", "Démarrer la prise en charge",
            "ASSIGNED_TO_BED", "IN_PROGRESS", "PERM_CLINIC_NURSE", "success");
        startCare.setConditions(List.of(
            c(startCare, "field_comparison", Map.of("field", "hasBedAssigned", "operator", "eq", "value", "true"), 0)
        ));
        startCare.setActions(List.of(
            a(startCare, "emit_event", Map.of("eventType", "clinic.visit.care_started"), 0)
        ));

        // prepare_discharge
        WorkflowTransition prepDischarge = t(def, "prepare_discharge", "Préparer la sortie",
            "IN_PROGRESS", "READY_FOR_DISCHARGE", "PERM_CLINIC_ADMISSIONS", "warning");
        prepDischarge.setActions(List.of(
            a(prepDischarge, "emit_event", Map.of("eventType", "clinic.visit.discharge_prepared"), 0)
        ));

        // close_visit
        WorkflowTransition close = t(def, "close_visit", "Clôturer le séjour",
            "READY_FOR_DISCHARGE", "CLOSED", "PERM_CLINIC_ADMISSIONS", "default");
        close.setActions(List.of(
            a(close, "set_field",  Map.of("field", "checkOutAt", "value", "__NOW__"), 0),
            a(close, "emit_event", Map.of("eventType", "clinic.visit.closed"),         1)
        ));

        def.setTransitions(List.of(checkIn, assignBed, startCare, prepDischarge, close));
        repo.save(def);
        log.info("[Clinic] Seeded PATIENT_VISIT workflow for tenant {}", tenantId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. PATIENT DOCUMENT
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void seedPatientDocument(UUID tenantId) {
        if (repo.findActiveByTenantAndType(tenantId, "patient_document").isPresent()) return;

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId).entityType("patient_document").version(1)
            .label("Document Patient")
            .description("Circuit de validation des documents patient (identité, assurance, consentement)")
            .isActive(true).build();

        def.setStates(List.of(
            s(def, "UPLOADED",  "Téléversé",    "#3B82F6", true,  false, 0),
            s(def, "IN_REVIEW", "En révision",  "#F59E0B", false, false, 1),
            s(def, "APPROVED",  "Approuvé",     "#22C55E", false, true,  2),
            s(def, "REJECTED",  "Rejeté",       "#EF4444", false, true,  3),
            s(def, "EXPIRED",   "Expiré",       "#6B7280", false, true,  4)
        ));

        WorkflowTransition submit = t(def, "submit_review", "Soumettre à révision",
            "UPLOADED", "IN_REVIEW", "PERM_CLINIC_FRONT_DESK", "primary");
        submit.setActions(List.of(
            a(submit, "emit_event", Map.of("eventType", "clinic.document.submitted"), 0)
        ));

        WorkflowTransition approve = t(def, "approve", "Approuver",
            "IN_REVIEW", "APPROVED", "PERM_CLINIC_ADMISSIONS", "success");
        approve.setActions(List.of(
            a(approve, "set_field",  Map.of("field", "reviewedBy", "value", "__USER_ID__"), 0),
            a(approve, "set_field",  Map.of("field", "reviewedAt", "value", "__NOW__"),      1),
            a(approve, "emit_event", Map.of("eventType", "clinic.document.approved"),         2)
        ));

        WorkflowTransition reject = t(def, "reject", "Rejeter",
            "IN_REVIEW", "REJECTED", "PERM_CLINIC_ADMISSIONS", "danger");
        reject.setConditions(List.of(
            c(reject, "payload_field_not_empty", Map.of("field", "rejectionReason"), 0)
        ));
        reject.setActions(List.of(
            a(reject, "emit_event", Map.of("eventType", "clinic.document.rejected"), 0)
        ));

        WorkflowTransition expire = t(def, "expire", "Marquer expiré",
            "APPROVED", "EXPIRED", "PERM_CLINIC_ADMIN", "warning");
        expire.setActions(List.of(
            a(expire, "emit_event", Map.of("eventType", "clinic.document.expired"), 0)
        ));

        def.setTransitions(List.of(submit, approve, reject, expire));
        repo.save(def);
        log.info("[Clinic] Seeded PATIENT_DOCUMENT workflow for tenant {}", tenantId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. FACILITY ASSET
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void seedFacilityAsset(UUID tenantId) {
        if (repo.findActiveByTenantAndType(tenantId, "facility_asset").isPresent()) return;

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId).entityType("facility_asset").version(1)
            .label("Actif Clinique")
            .description("Cycle de vie des équipements, lits et ressources de la clinique")
            .isActive(true).build();

        def.setStates(List.of(
            s(def, "AVAILABLE",      "Disponible",       "#22C55E", true,  false, 0),
            s(def, "RESERVED",       "Réservé",          "#3B82F6", false, false, 1),
            s(def, "IN_USE",         "En utilisation",   "#8B5CF6", false, false, 2),
            s(def, "OUT_OF_SERVICE", "Hors service",     "#EF4444", false, false, 3),
            s(def, "MAINTENANCE",    "En maintenance",   "#F59E0B", false, false, 4),
            s(def, "RETIRED",        "Retiré",           "#1F2937", false, true,  5)
        ));

        WorkflowTransition reserve = t(def, "reserve", "Réserver",
            "AVAILABLE", "RESERVED", "PERM_CLINIC_NURSE", "primary");
        reserve.setActions(List.of(a(reserve, "emit_event", Map.of("eventType", "clinic.asset.reserved"), 0)));

        WorkflowTransition use = t(def, "put_in_use", "Mettre en service",
            "RESERVED", "IN_USE", "PERM_CLINIC_NURSE", "success");
        use.setActions(List.of(a(use, "emit_event", Map.of("eventType", "clinic.asset.in_use"), 0)));

        WorkflowTransition release = t(def, "release", "Libérer",
            "IN_USE", "AVAILABLE", "PERM_CLINIC_NURSE", "default");
        release.setActions(List.of(a(release, "emit_event", Map.of("eventType", "clinic.asset.released"), 0)));

        WorkflowTransition outOfService = t(def, "out_of_service", "Mettre hors service",
            "IN_USE", "OUT_OF_SERVICE", "PERM_CLINIC_FACILITY_MANAGER", "danger");
        outOfService.setActions(List.of(a(outOfService, "emit_event", Map.of("eventType", "clinic.asset.out_of_service"), 0)));

        WorkflowTransition toMaintenance = t(def, "send_to_maintenance", "Envoyer en maintenance",
            "OUT_OF_SERVICE", "MAINTENANCE", "PERM_CLINIC_FACILITY_MANAGER", "warning");
        toMaintenance.setActions(List.of(a(toMaintenance, "emit_event", Map.of("eventType", "clinic.asset.maintenance_started"), 0)));

        WorkflowTransition restore = t(def, "restore", "Remettre en service",
            "MAINTENANCE", "AVAILABLE", "PERM_CLINIC_FACILITY_MANAGER", "success");
        restore.setActions(List.of(a(restore, "emit_event", Map.of("eventType", "clinic.asset.restored"), 0)));

        WorkflowTransition retire = t(def, "retire", "Retirer définitivement",
            "OUT_OF_SERVICE", "RETIRED", "PERM_CLINIC_ADMIN", "danger");
        retire.setActions(List.of(a(retire, "emit_event", Map.of("eventType", "clinic.asset.retired"), 0)));

        def.setTransitions(List.of(reserve, use, release, outOfService, toMaintenance, restore, retire));
        repo.save(def);
        log.info("[Clinic] Seeded FACILITY_ASSET workflow for tenant {}", tenantId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. MAINTENANCE REQUEST
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void seedMaintenanceRequest(UUID tenantId) {
        if (repo.findActiveByTenantAndType(tenantId, "maintenance_request").isPresent()) return;

        WorkflowDefinition def = WorkflowDefinition.builder()
            .tenantId(tenantId).entityType("maintenance_request").version(1)
            .label("Demande de Maintenance")
            .description("Ticket de maintenance : signalement → assignation → résolution → clôture")
            .isActive(true).build();

        def.setStates(List.of(
            s(def, "OPEN",        "Ouverte",      "#EF4444", true,  false, 0),
            s(def, "ASSIGNED",    "Assignée",     "#F59E0B", false, false, 1),
            s(def, "IN_PROGRESS", "En cours",     "#3B82F6", false, false, 2),
            s(def, "RESOLVED",    "Résolue",      "#22C55E", false, false, 3),
            s(def, "CLOSED",      "Fermée",       "#1F2937", false, true,  4)
        ));

        WorkflowTransition assign = t(def, "assign", "Assigner",
            "OPEN", "ASSIGNED", "PERM_CLINIC_FACILITY_MANAGER", "primary");
        assign.setConditions(List.of(
            c(assign, "payload_field_not_empty", Map.of("field", "technicianId"), 0)
        ));
        assign.setActions(List.of(
            a(assign, "copy_payload_field", Map.of("from", "technicianId", "to", "assignedTo"), 0),
            a(assign, "emit_event",         Map.of("eventType", "clinic.maintenance.assigned"),  1)
        ));

        WorkflowTransition start = t(def, "start", "Démarrer",
            "ASSIGNED", "IN_PROGRESS", "PERM_CLINIC_TECHNICIAN", "primary");
        start.setActions(List.of(
            a(start, "emit_event", Map.of("eventType", "clinic.maintenance.started"), 0)
        ));

        WorkflowTransition resolve = t(def, "resolve", "Marquer résolu",
            "IN_PROGRESS", "RESOLVED", "PERM_CLINIC_TECHNICIAN", "success");
        resolve.setActions(List.of(
            a(resolve, "set_field",  Map.of("field", "resolvedAt", "value", "__NOW__"),   0),
            a(resolve, "emit_event", Map.of("eventType", "clinic.maintenance.resolved"),  1)
        ));

        WorkflowTransition closeReq = t(def, "close", "Fermer",
            "RESOLVED", "CLOSED", "PERM_CLINIC_FACILITY_MANAGER", "default");
        closeReq.setActions(List.of(
            a(closeReq, "emit_event", Map.of("eventType", "clinic.maintenance.closed"), 0)
        ));

        // Reopen from RESOLVED if issue persists
        WorkflowTransition reopen = t(def, "reopen", "Réouvrir",
            "RESOLVED", "IN_PROGRESS", "PERM_CLINIC_TECHNICIAN", "warning");
        reopen.setActions(List.of(
            a(reopen, "emit_event", Map.of("eventType", "clinic.maintenance.reopened"), 0)
        ));

        def.setTransitions(List.of(assign, start, resolve, closeReq, reopen));
        repo.save(def);
        log.info("[Clinic] Seeded MAINTENANCE_REQUEST workflow for tenant {}", tenantId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Seed all — called by ClinicBootstrapper at startup
    // ═══════════════════════════════════════════════════════════════════════════

    public void seedAll(UUID tenantId) {
        seedPatient(tenantId);
        seedPatientVisit(tenantId);
        seedPatientDocument(tenantId);
        seedFacilityAsset(tenantId);
        seedMaintenanceRequest(tenantId);
    }

    // ── Builder helpers ───────────────────────────────────────────────────────

    private WorkflowState s(WorkflowDefinition def, String key, String label,
                             String color, boolean initial, boolean terminal, int order) {
        return WorkflowState.builder()
            .definition(def).key(key).label(label).color(color)
            .isInitial(initial).isFinal(terminal).sortOrder(order).build();
    }

    private WorkflowTransition t(WorkflowDefinition def, String key, String label,
                                  String from, String to, String perm, String variant) {
        return WorkflowTransition.builder()
            .definition(def).key(key).label(label)
            .fromStateKey(from).toStateKey(to)
            .requiredPermission(perm).uiVariant(variant).build();
    }

    private WorkflowConditionConfig c(WorkflowTransition tr, String type, Map<String, Object> cfg, int order) {
        return WorkflowConditionConfig.builder().transition(tr).type(type).config(cfg).sortOrder(order).build();
    }

    private WorkflowActionConfig a(WorkflowTransition tr, String type, Map<String, Object> cfg, int order) {
        return WorkflowActionConfig.builder().transition(tr).type(type).config(cfg).sortOrder(order).build();
    }
}
