package com.platform.workflow.clinic.api;

import com.platform.workflow.clinic.domain.*;
import com.platform.workflow.clinic.repository.*;
import com.platform.workflow.kernel.security.jwt.WorkflowPrincipal;
import com.platform.workflow.kernel.workflow.engine.*;
import com.platform.workflow.kernel.workflow.model.WorkflowExecutionLog;
import com.platform.workflow.kernel.workflow.repository.WorkflowExecutionLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * Clinic REST API — zero business logic.
 *
 * <p>Every state change goes through {@link WorkflowEngine#applyTransition}.
 * Controllers only handle HTTP concerns (parsing, serialization, HTTP status codes).
 *
 * <pre>
 * Patients
 *   POST   /api/v1/clinic/patients                         → create patient
 *   GET    /api/v1/clinic/patients                         → list / search
 *   GET    /api/v1/clinic/patients/{id}                    → get patient
 *   POST   /api/v1/clinic/patients/{id}/transition/{key}   → apply workflow transition
 *   GET    /api/v1/clinic/patients/{id}/history            → audit trail
 *
 * Visits
 *   POST   /api/v1/clinic/visits                           → create visit
 *   GET    /api/v1/clinic/visits/{id}                      → get visit
 *   POST   /api/v1/clinic/visits/{id}/transition/{key}     → apply transition
 *
 * Documents
 *   POST   /api/v1/clinic/documents                        → register document
 *   GET    /api/v1/clinic/patients/{id}/documents          → list for patient
 *   POST   /api/v1/clinic/documents/{id}/transition/{key}  → apply transition
 *
 * Infrastructure
 *   GET    /api/v1/clinic/rooms                            → list rooms
 *   POST   /api/v1/clinic/rooms                            → create room
 *   GET    /api/v1/clinic/beds/available                   → available beds
 *   POST   /api/v1/clinic/assets                           → create asset
 *   POST   /api/v1/clinic/assets/{id}/transition/{key}     → apply transition
 *
 * Maintenance
 *   POST   /api/v1/clinic/maintenance                      → open request
 *   GET    /api/v1/clinic/maintenance                      → list requests
 *   POST   /api/v1/clinic/maintenance/{id}/transition/{key}→ apply transition
 *
 * Dashboard
 *   GET    /api/v1/clinic/dashboard/stats                  → aggregated KPIs
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/clinic")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Clinic", description = "Clinic management API — workflow-driven")
public class ClinicController {

    private final WorkflowEngine                  engine;
    private final WorkflowExecutionLogRepository  logRepo;

    private final PatientRepository              patientRepo;
    private final PatientVisitRepository         visitRepo;
    private final PatientDocumentRepository      documentRepo;
    private final FacilityRoomRepository         roomRepo;
    private final FacilityBedRepository          bedRepo;
    private final FacilityAssetRepository        assetRepo;
    private final MaintenanceRequestRepository   maintenanceRepo;

    // ══════════════════════════════════════════════════════════════════════════
    // PATIENTS
    // ══════════════════════════════════════════════════════════════════════════

    @PostMapping("/patients")
    @Operation(summary = "Create a patient (workflow state = NEW)")
    public ResponseEntity<Patient> createPatient(
        @RequestBody @Valid CreatePatientRequest req,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        Patient patient = Patient.builder()
            .tenantId(principal.getTenantId())
            .firstName(req.firstName())
            .lastName(req.lastName())
            .birthDate(req.birthDate())
            .gender(req.gender())
            .nationalId(req.nationalId())
            .phone(req.phone())
            .email(req.email())
            .workflowState("NEW")
            .build();
        return ResponseEntity.status(201).body(patientRepo.save(patient));
    }

    @GetMapping("/patients")
    public ResponseEntity<Page<Patient>> listPatients(
        @AuthenticationPrincipal WorkflowPrincipal principal,
        @RequestParam(required = false) String state,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        UUID tid = principal.getTenantId();
        PageRequest pr = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<Patient> result = q != null && !q.isBlank()
            ? patientRepo.search(tid, q, pr)
            : state != null
                ? patientRepo.findByTenantIdAndWorkflowState(tid, state, pr)
                : patientRepo.findByTenantId(tid, pr);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/patients/{id}")
    public ResponseEntity<Patient> getPatient(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return patientRepo.findByIdAndTenantId(id, principal.getTenantId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/patients/{id}/transition/{key}")
    @Operation(summary = "Apply a workflow transition to a patient")
    public ResponseEntity<TransitionResult> patientTransition(
        @PathVariable UUID id,
        @PathVariable String key,
        @RequestBody(required = false) Map<String, Object> payload,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(applyTransition("patient", id, key, payload, principal));
    }

    @GetMapping("/patients/{id}/history")
    public ResponseEntity<List<WorkflowExecutionLog>> patientHistory(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(logRepo.findHistoryForEntity(
            principal.getTenantId(), "patient", id.toString()));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VISITS
    // ══════════════════════════════════════════════════════════════════════════

    @PostMapping("/visits")
    public ResponseEntity<PatientVisit> createVisit(
        @RequestBody @Valid CreateVisitRequest req,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        Patient patient = patientRepo.findByIdAndTenantId(req.patientId(), principal.getTenantId())
            .orElseThrow(() -> new WorkflowException(WorkflowException.Code.ENTITY_NOT_FOUND, "Patient not found"));

        // Generate visit number VIS-YYYY-NNNNN
        String visitNumber = "VIS-" + java.time.Year.now().getValue() + "-"
            + String.format("%05d", visitRepo.findByTenantId(principal.getTenantId(),
                PageRequest.of(0, 1)).getTotalElements() + 1);

        PatientVisit visit = PatientVisit.builder()
            .tenantId(principal.getTenantId())
            .patient(patient)
            .visitNumber(visitNumber)
            .admissionType(req.admissionType() != null ? req.admissionType() : "STANDARD")
            .chiefComplaint(req.chiefComplaint())
            .workflowState("CREATED")
            .build();

        return ResponseEntity.status(201).body(visitRepo.save(visit));
    }

    @GetMapping("/visits/{id}")
    public ResponseEntity<PatientVisit> getVisit(
        @PathVariable UUID id,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return visitRepo.findByIdAndTenantId(id, principal.getTenantId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/visits/{id}/transition/{key}")
    public ResponseEntity<TransitionResult> visitTransition(
        @PathVariable UUID id,
        @PathVariable String key,
        @RequestBody(required = false) Map<String, Object> payload,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(applyTransition("patient_visit", id, key, payload, principal));
    }

    @GetMapping("/patients/{patientId}/visits")
    public ResponseEntity<List<PatientVisit>> listVisitsForPatient(
        @PathVariable UUID patientId,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(visitRepo.findByPatientIdAndTenantId(patientId, principal.getTenantId()));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ══════════════════════════════════════════════════════════════════════════

    @PostMapping("/documents")
    public ResponseEntity<PatientDocument> createDocument(
        @RequestBody @Valid CreateDocumentRequest req,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        Patient patient = patientRepo.findByIdAndTenantId(req.patientId(), principal.getTenantId())
            .orElseThrow(() -> new WorkflowException(WorkflowException.Code.ENTITY_NOT_FOUND, "Patient not found"));

        PatientDocument doc = PatientDocument.builder()
            .tenantId(principal.getTenantId())
            .patient(patient)
            .documentType(req.documentType())
            .fileName(req.fileName())
            .storagePath(req.storagePath())
            .mimeType(req.mimeType())
            .sizeBytes(req.sizeBytes())
            .workflowState("UPLOADED")
            .build();

        return ResponseEntity.status(201).body(documentRepo.save(doc));
    }

    @GetMapping("/patients/{patientId}/documents")
    public ResponseEntity<List<PatientDocument>> listDocuments(
        @PathVariable UUID patientId,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(documentRepo.findByPatientIdAndTenantId(patientId, principal.getTenantId()));
    }

    @PostMapping("/documents/{id}/transition/{key}")
    public ResponseEntity<TransitionResult> documentTransition(
        @PathVariable UUID id,
        @PathVariable String key,
        @RequestBody(required = false) Map<String, Object> payload,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(applyTransition("patient_document", id, key, payload, principal));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ROOMS & BEDS
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/rooms")
    public ResponseEntity<List<FacilityRoom>> listRooms(@AuthenticationPrincipal WorkflowPrincipal principal) {
        return ResponseEntity.ok(roomRepo.findByTenantId(principal.getTenantId()));
    }

    @PostMapping("/rooms")
    public ResponseEntity<FacilityRoom> createRoom(
        @RequestBody @Valid CreateRoomRequest req,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        FacilityRoom room = FacilityRoom.builder()
            .tenantId(principal.getTenantId())
            .code(req.code()).name(req.name())
            .floor(req.floor() != null ? req.floor() : 1)
            .wing(req.wing()).roomType(req.roomType() != null ? req.roomType() : "STANDARD")
            .capacity(req.capacity() != null ? req.capacity() : 1)
            .build();
        return ResponseEntity.status(201).body(roomRepo.save(room));
    }

    @GetMapping("/beds/available")
    public ResponseEntity<List<FacilityBed>> availableBeds(@AuthenticationPrincipal WorkflowPrincipal principal) {
        return ResponseEntity.ok(bedRepo.findByTenantIdAndWorkflowState(principal.getTenantId(), "AVAILABLE"));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ASSETS
    // ══════════════════════════════════════════════════════════════════════════

    @PostMapping("/assets")
    public ResponseEntity<FacilityAsset> createAsset(
        @RequestBody @Valid CreateAssetRequest req,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        FacilityAsset asset = FacilityAsset.builder()
            .tenantId(principal.getTenantId())
            .assetType(req.assetType()).name(req.name())
            .serialNumber(req.serialNumber())
            .workflowState("AVAILABLE")
            .build();
        return ResponseEntity.status(201).body(assetRepo.save(asset));
    }

    @GetMapping("/assets")
    public ResponseEntity<Page<FacilityAsset>> listAssets(
        @AuthenticationPrincipal WorkflowPrincipal principal,
        @RequestParam(required = false) String state,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pr = PageRequest.of(page, size);
        UUID tid = principal.getTenantId();
        return ResponseEntity.ok(state != null
            ? assetRepo.findByTenantIdAndWorkflowState(tid, state, pr)
            : assetRepo.findByTenantId(tid, pr));
    }

    @PostMapping("/assets/{id}/transition/{key}")
    public ResponseEntity<TransitionResult> assetTransition(
        @PathVariable UUID id,
        @PathVariable String key,
        @RequestBody(required = false) Map<String, Object> payload,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(applyTransition("facility_asset", id, key, payload, principal));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MAINTENANCE
    // ══════════════════════════════════════════════════════════════════════════

    @PostMapping("/maintenance")
    public ResponseEntity<MaintenanceRequest> createMaintenance(
        @RequestBody @Valid CreateMaintenanceRequest req,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        MaintenanceRequest maint = MaintenanceRequest.builder()
            .tenantId(principal.getTenantId())
            .requestType(req.requestType())
            .priority(req.priority() != null ? req.priority() : "NORMAL")
            .description(req.description())
            .workflowState("OPEN")
            .build();
        return ResponseEntity.status(201).body(maintenanceRepo.save(maint));
    }

    @GetMapping("/maintenance")
    public ResponseEntity<Page<MaintenanceRequest>> listMaintenance(
        @AuthenticationPrincipal WorkflowPrincipal principal,
        @RequestParam(required = false) String state,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pr = PageRequest.of(page, size, Sort.by("createdAt").descending());
        UUID tid = principal.getTenantId();
        return ResponseEntity.ok(state != null
            ? maintenanceRepo.findByTenantIdAndWorkflowState(tid, state, pr)
            : maintenanceRepo.findByTenantId(tid, pr));
    }

    @PostMapping("/maintenance/{id}/transition/{key}")
    public ResponseEntity<TransitionResult> maintenanceTransition(
        @PathVariable UUID id,
        @PathVariable String key,
        @RequestBody(required = false) Map<String, Object> payload,
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        return ResponseEntity.ok(applyTransition("maintenance_request", id, key, payload, principal));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/dashboard/stats")
    @Operation(summary = "Clinic KPI dashboard")
    public ResponseEntity<Map<String, Object>> dashboardStats(
        @AuthenticationPrincipal WorkflowPrincipal principal
    ) {
        UUID tid = principal.getTenantId();
        Map<String, Object> stats = new LinkedHashMap<>();

        // Patient counts by state
        Map<String, Long> patientByState = new LinkedHashMap<>();
        patientRepo.countByState(tid).forEach(r -> patientByState.put((String) r[0], (Long) r[1]));
        stats.put("patientsByState", patientByState);
        stats.put("patientsAdmitted",  patientByState.getOrDefault("ADMITTED", 0L));

        // Visit counts by state
        Map<String, Long> visitByState = new LinkedHashMap<>();
        visitRepo.countByState(tid).forEach(r -> visitByState.put((String) r[0], (Long) r[1]));
        stats.put("visitsByState", visitByState);
        stats.put("visitsInProgress", visitByState.getOrDefault("IN_PROGRESS", 0L));

        // Beds
        stats.put("bedsAvailable",  bedRepo.countByTenantIdAndWorkflowState(tid, "AVAILABLE"));
        stats.put("bedsInUse",      bedRepo.countByTenantIdAndWorkflowState(tid, "IN_USE"));

        // Documents pending review
        stats.put("documentsPendingReview", documentRepo.countByTenantIdAndWorkflowState(tid, "IN_REVIEW"));

        // Maintenance
        Map<String, Long> maintByState = new LinkedHashMap<>();
        maintenanceRepo.countByState(tid).forEach(r -> maintByState.put((String) r[0], (Long) r[1]));
        stats.put("maintenanceByState", maintByState);
        stats.put("maintenanceOpen",    maintByState.getOrDefault("OPEN", 0L));
        stats.put("maintenanceUrgent",  maintenanceRepo.countByTenantIdAndWorkflowState(tid, "OPEN"));

        return ResponseEntity.ok(stats);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIVATE — generic transition dispatcher
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Dispatches any transition to the workflow engine.
     * This is the ONLY place that talks to the engine in this controller.
     * Zero business logic — 100% delegation.
     */
    private TransitionResult applyTransition(
        String entityType, UUID entityId, String transitionKey,
        Map<String, Object> payload, WorkflowPrincipal principal
    ) {
        ExecutionContext ctx = ExecutionContext.builder()
            .tenantId(principal.getTenantId())
            .entityType(entityType)
            .entityId(entityId.toString())
            .transitionKey(transitionKey)
            .userId(principal.getUserId())
            .userEmail(principal.getEmail())
            .payload(payload != null ? new HashMap<>(payload) : new HashMap<>())
            .build();

        return engine.applyTransition(ctx);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REQUEST DTOs (records — immutable, self-validating)
    // ══════════════════════════════════════════════════════════════════════════

    public record CreatePatientRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        LocalDate birthDate,
        String gender,
        String nationalId,
        String phone,
        String email
    ) {}

    public record CreateVisitRequest(
        @NotNull UUID patientId,
        String admissionType,
        String chiefComplaint
    ) {}

    public record CreateDocumentRequest(
        @NotNull UUID patientId,
        UUID visitId,
        @NotBlank String documentType,
        @NotBlank String fileName,
        @NotBlank String storagePath,
        String mimeType,
        Long sizeBytes
    ) {}

    public record CreateRoomRequest(
        @NotBlank String code,
        @NotBlank String name,
        Integer floor,
        String wing,
        String roomType,
        Integer capacity
    ) {}

    public record CreateAssetRequest(
        @NotBlank String assetType,
        @NotBlank String name,
        String serialNumber
    ) {}

    public record CreateMaintenanceRequest(
        @NotBlank String requestType,
        String priority,
        @NotBlank String description,
        UUID assetId
    ) {}
}
