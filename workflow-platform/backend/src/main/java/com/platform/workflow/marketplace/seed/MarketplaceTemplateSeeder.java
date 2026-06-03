package com.platform.workflow.marketplace.seed;

import com.platform.workflow.marketplace.domain.WorkflowTemplate;
import com.platform.workflow.marketplace.domain.WorkflowTemplateVersion;
import com.platform.workflow.marketplace.dto.WorkflowDefinitionSnapshot;
import com.platform.workflow.marketplace.dto.WorkflowDefinitionSnapshot.*;
import com.platform.workflow.marketplace.repository.WorkflowTemplateRepository;
import com.platform.workflow.marketplace.repository.WorkflowTemplateVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * MarketplaceTemplateSeeder — bootstraps the marketplace with curated demo templates.
 *
 * <p>Seeds 4 production-quality templates:
 * <ol>
 *   <li>CRM Lead Lifecycle (open → won | lost | cancelled)</li>
 *   <li>Quote Approval (draft → sent → accepted | rejected | expired)</li>
 *   <li>HR Leave Request (submitted → manager_review → approved | rejected)</li>
 *   <li>IT Support Ticket (open → in_progress → resolved → closed)</li>
 * </ol>
 *
 * <p>These templates demonstrate the domain-agnostic capability of the engine:
 * the same state machine infrastructure handles CRM, HR, Finance, and IT workflows.
 *
 * <p>In production, templates would be published via the API by verified publishers.
 * This seeder is for development/demo environments only.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MarketplaceTemplateSeeder {

    private final WorkflowTemplateRepository        templateRepository;
    private final WorkflowTemplateVersionRepository versionRepository;

    /** Platform publisher tenant id — represents "Workflow Platform Inc." */
    private static final UUID PLATFORM_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Transactional
    public void seedAll() {
        seedTemplate(buildLeadLifecycle());
        seedTemplate(buildQuoteApproval());
        seedTemplate(buildHrLeaveRequest());
        seedTemplate(buildItSupportTicket());
        log.info("[Marketplace] Seeded {} demo templates", 4);
    }

    // ── Seed helper ───────────────────────────────────────────────────────────

    private void seedTemplate(TemplateSpec spec) {
        if (templateRepository.findBySlug(spec.slug).isPresent()) {
            log.debug("[Marketplace] Template '{}' already exists — skipping", spec.slug);
            return;
        }

        WorkflowTemplate template = WorkflowTemplate.builder()
            .slug(spec.slug)
            .name(spec.name)
            .shortDesc(spec.shortDesc)
            .description(spec.description)
            .category(spec.category)
            .tags(spec.tags)
            .entityTypeHint(spec.entityTypeHint)
            .publisherTenantId(PLATFORM_TENANT)
            .publisherName("Workflow Platform")
            .visibleScope(WorkflowTemplate.VisibleScope.PUBLIC)
            .featured(spec.featured)
            .active(true)
            .build();

        template = templateRepository.save(template);

        WorkflowTemplateVersion version = WorkflowTemplateVersion.fromSemver("1.0.0")
            .template(template)
            .definition(spec.snapshot)
            .changelog("Initial release")
            .latest(true)
            .publishedBy("system")
            .build();

        versionRepository.save(version);
        log.info("[Marketplace] Seeded template: {}", spec.slug);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Template definitions
    // ────────────────────────────────────────────────────────────────────────

    // ── 1. CRM Lead Lifecycle ─────────────────────────────────────────────────

    private TemplateSpec buildLeadLifecycle() {
        WorkflowDefinitionSnapshot snapshot = WorkflowDefinitionSnapshot.builder()
            .entityType("lead")
            .version(1)
            .label("CRM Lead Lifecycle")
            .description("Standard sales lead state machine from initial contact to close")
            .states(List.of(
                state("open",      "Open",      "#3B82F6", "circle",      true,  false, 0),
                state("won",       "Won",       "#22C55E", "trophy",      false, true,  1),
                state("lost",      "Lost",      "#EF4444", "x-circle",    false, true,  2),
                state("cancelled", "Cancelled", "#6B7280", "archive",     false, true,  3)
            ))
            .transitions(List.of(
                transition("win",    "Mark as Won",  "open", "won",       "PERM_CRM_WRITE",  "success",
                    List.of(cond("field_not_empty", Map.of("field", "contactId"))),
                    List.of(act("copy_payload_field", Map.of("from","contactId","to","contactId")),
                            act("set_field",          Map.of("field","wonAt","value","__NOW__")),
                            act("emit_event",         Map.of("eventType","lead.won")))),
                transition("lose",   "Mark as Lost", "open", "lost",      "PERM_CRM_WRITE",  "danger",
                    List.of(cond("payload_field_not_empty", Map.of("field", "lostReason"))),
                    List.of(act("copy_payload_field", Map.of("from","lostReason","to","lostReason")),
                            act("emit_event",         Map.of("eventType","lead.lost")))),
                transition("cancel", "Cancel",       "open", "cancelled", "PERM_CRM_DELETE", "warning",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","lead.cancelled"))))
            ))
            .build();

        return new TemplateSpec(
            "crm-lead-lifecycle", "CRM Lead Lifecycle",
            "Open → Won / Lost / Cancelled with contact and reason conditions",
            """
            A battle-tested CRM lead state machine used by thousands of sales teams.

            **States**: Open, Won, Lost, Cancelled
            **Conditions**: Win requires a contactId; Loss requires a lostReason in payload
            **Actions**: Sets timestamps, copies payload fields, emits domain events
            **Permissions**: Write for win/lose, Delete for cancel
            """,
            "crm", List.of("crm", "sales", "lead"), "lead", true, snapshot
        );
    }

    // ── 2. Quote Approval ─────────────────────────────────────────────────────

    private TemplateSpec buildQuoteApproval() {
        WorkflowDefinitionSnapshot snapshot = WorkflowDefinitionSnapshot.builder()
            .entityType("quote")
            .version(1)
            .label("Quote Approval")
            .description("Draft → Sent → Accepted | Rejected | Expired")
            .states(List.of(
                state("draft",    "Draft",    "#94A3B8", "file-edit",    true,  false, 0),
                state("sent",     "Sent",     "#3B82F6", "send",         false, false, 1),
                state("accepted", "Accepted", "#22C55E", "check-circle", false, true,  2),
                state("rejected", "Rejected", "#EF4444", "x-circle",     false, true,  3),
                state("expired",  "Expired",  "#6B7280", "clock",        false, true,  4)
            ))
            .transitions(List.of(
                transition("send",   "Send to Client", "draft", "sent",     "PERM_CRM_WRITE",    "primary",
                    List.of(cond("field_not_empty", Map.of("field","contactId"))),
                    List.of(act("set_field",  Map.of("field","sentAt","value","__NOW__")),
                            act("emit_event", Map.of("eventType","quote.sent")))),
                transition("accept", "Accept",         "sent",  "accepted", "PERM_QUOTE_APPROVE", "success",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","quote.accepted")))),
                transition("reject", "Reject",         "sent",  "rejected", "PERM_CRM_WRITE",    "danger",
                    List.of(cond("payload_field_not_empty", Map.of("field","rejectionReason"))),
                    List.of(act("copy_payload_field", Map.of("from","rejectionReason","to","rejectionReason")),
                            act("emit_event",         Map.of("eventType","quote.rejected")))),
                transition("expire", "Mark Expired",   "sent",  "expired",  "PERM_CRM_WRITE",    "warning",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","quote.expired"))))
            ))
            .build();

        return new TemplateSpec(
            "quote-approval", "Quote Approval",
            "Full quote lifecycle with client approval and rejection tracking",
            """
            Standard B2B quote approval workflow. Tracks sent/accepted/rejected/expired states.

            **Use case**: Any document requiring client sign-off before conversion
            **Conditions**: Send requires a contactId; Reject requires a rejectionReason
            **Events**: Emits quote.sent, quote.accepted, quote.rejected, quote.expired
            **Required permission**: PERM_QUOTE_APPROVE for acceptance (role separation)
            """,
            "crm", List.of("crm", "quote", "approval", "finance"), "quote", true, snapshot
        );
    }

    // ── 3. HR Leave Request ───────────────────────────────────────────────────

    private TemplateSpec buildHrLeaveRequest() {
        WorkflowDefinitionSnapshot snapshot = WorkflowDefinitionSnapshot.builder()
            .entityType("leave_request")
            .version(1)
            .label("HR Leave Request")
            .description("Employee leave requests with manager approval chain")
            .states(List.of(
                state("submitted",       "Submitted",        "#3B82F6", "send",         true,  false, 0),
                state("manager_review",  "Manager Review",   "#F59E0B", "eye",          false, false, 1),
                state("hr_review",       "HR Review",        "#8B5CF6", "users",        false, false, 2),
                state("approved",        "Approved",         "#22C55E", "check-circle", false, true,  3),
                state("rejected",        "Rejected",         "#EF4444", "x-circle",     false, true,  4),
                state("cancelled",       "Cancelled",        "#6B7280", "archive",      false, true,  5)
            ))
            .transitions(List.of(
                transition("send_to_manager", "Send to Manager", "submitted",      "manager_review", "PERM_HR_WRITE",    "primary",
                    List.of(cond("field_not_empty", Map.of("field","managerId"))),
                    List.of(act("set_field",  Map.of("field","submittedAt","value","__NOW__")),
                            act("emit_event", Map.of("eventType","leave.submitted")))),
                transition("escalate_hr",    "Escalate to HR",  "manager_review", "hr_review",      "PERM_HR_APPROVE",  "warning",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","leave.escalated")))),
                transition("approve_mgr",    "Approve",         "manager_review", "approved",        "PERM_HR_APPROVE",  "success",
                    List.of(),
                    List.of(act("set_field",  Map.of("field","approvedAt","value","__NOW__")),
                            act("set_field",  Map.of("field","approvedBy","value","__USER_ID__")),
                            act("emit_event", Map.of("eventType","leave.approved")))),
                transition("approve_hr",     "Approve (HR)",    "hr_review",      "approved",        "PERM_HR_ADMIN",    "success",
                    List.of(),
                    List.of(act("set_field",  Map.of("field","approvedAt","value","__NOW__")),
                            act("emit_event", Map.of("eventType","leave.approved")))),
                transition("reject",         "Reject",          "manager_review", "rejected",        "PERM_HR_APPROVE",  "danger",
                    List.of(cond("payload_field_not_empty", Map.of("field","rejectionReason"))),
                    List.of(act("copy_payload_field", Map.of("from","rejectionReason","to","rejectionReason")),
                            act("emit_event",         Map.of("eventType","leave.rejected")))),
                transition("reject_hr",      "Reject (HR)",     "hr_review",      "rejected",        "PERM_HR_ADMIN",    "danger",
                    List.of(cond("payload_field_not_empty", Map.of("field","rejectionReason"))),
                    List.of(act("copy_payload_field", Map.of("from","rejectionReason","to","rejectionReason")),
                            act("emit_event",         Map.of("eventType","leave.rejected")))),
                transition("cancel",         "Cancel Request",  "submitted",      "cancelled",       "PERM_HR_WRITE",    "warning",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","leave.cancelled"))))
            ))
            .build();

        return new TemplateSpec(
            "hr-leave-request", "HR Leave Request",
            "Two-tier approval flow: manager then HR, with escalation path",
            """
            Enterprise-grade leave request workflow with dual approval chain.

            **Flow**: Employee submits → Manager approves/escalates → HR approves/rejects
            **Conditions**: Manager must be assigned before submission
            **Events**: leave.submitted, leave.approved, leave.rejected, leave.cancelled
            **Permissions**: Separate PERM_HR_APPROVE (manager) and PERM_HR_ADMIN (HR) roles
            """,
            "hr", List.of("hr", "leave", "approval", "human-resources"), "leave_request", true, snapshot
        );
    }

    // ── 4. IT Support Ticket ──────────────────────────────────────────────────

    private TemplateSpec buildItSupportTicket() {
        WorkflowDefinitionSnapshot snapshot = WorkflowDefinitionSnapshot.builder()
            .entityType("support_ticket")
            .version(1)
            .label("IT Support Ticket")
            .description("ITSM-inspired support ticket lifecycle with SLA tracking")
            .states(List.of(
                state("open",        "Open",        "#3B82F6", "circle",         true,  false, 0),
                state("assigned",    "Assigned",    "#F59E0B", "user-check",     false, false, 1),
                state("in_progress", "In Progress", "#8B5CF6", "wrench",         false, false, 2),
                state("pending",     "Pending",     "#EC4899", "clock",          false, false, 3),
                state("resolved",    "Resolved",    "#22C55E", "check-circle",   false, false, 4),
                state("closed",      "Closed",      "#6B7280", "archive",        false, true,  5),
                state("reopened",    "Reopened",    "#EF4444", "refresh",        false, false, 6)
            ))
            .transitions(List.of(
                transition("assign",        "Assign",             "open",        "assigned",    "PERM_SUPPORT_WRITE",  "primary",
                    List.of(cond("payload_field_not_empty", Map.of("field","assigneeId"))),
                    List.of(act("copy_payload_field", Map.of("from","assigneeId","to","assigneeId")),
                            act("set_field",          Map.of("field","assignedAt","value","__NOW__")),
                            act("emit_event",         Map.of("eventType","ticket.assigned")))),
                transition("start",         "Start Work",         "assigned",    "in_progress", "PERM_SUPPORT_WRITE",  "primary",
                    List.of(),
                    List.of(act("set_field",  Map.of("field","startedAt","value","__NOW__")),
                            act("emit_event", Map.of("eventType","ticket.started")))),
                transition("pend",          "Mark Pending",       "in_progress", "pending",     "PERM_SUPPORT_WRITE",  "warning",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","ticket.pending")))),
                transition("resume",        "Resume",             "pending",     "in_progress", "PERM_SUPPORT_WRITE",  "primary",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","ticket.resumed")))),
                transition("resolve",       "Resolve",            "in_progress", "resolved",    "PERM_SUPPORT_WRITE",  "success",
                    List.of(cond("payload_field_not_empty", Map.of("field","resolution"))),
                    List.of(act("copy_payload_field", Map.of("from","resolution","to","resolution")),
                            act("set_field",          Map.of("field","resolvedAt","value","__NOW__")),
                            act("emit_event",         Map.of("eventType","ticket.resolved")))),
                transition("close",         "Close",              "resolved",    "closed",      "PERM_SUPPORT_WRITE",  "default",
                    List.of(),
                    List.of(act("set_field",  Map.of("field","closedAt","value","__NOW__")),
                            act("emit_event", Map.of("eventType","ticket.closed")))),
                transition("reopen",        "Reopen",             "resolved",    "reopened",    "PERM_SUPPORT_WRITE",  "danger",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","ticket.reopened")))),
                transition("reopen_closed", "Reopen from Closed", "closed",      "reopened",    "PERM_SUPPORT_ADMIN",  "danger",
                    List.of(),
                    List.of(act("emit_event", Map.of("eventType","ticket.reopened")))),
                transition("start_reopened","Resume Reopened",    "reopened",    "in_progress", "PERM_SUPPORT_WRITE",  "primary",
                    List.of(),
                    List.of())
            ))
            .build();

        return new TemplateSpec(
            "it-support-ticket", "IT Support Ticket",
            "ITSM lifecycle: open → assigned → in-progress → resolved → closed with reopen path",
            """
            Full ITSM-inspired support ticket workflow including reopen paths.

            **Flow**: Open → Assigned → In Progress → Pending ↔ In Progress → Resolved → Closed
            **Reopen**: Both Resolved and Closed states have reopen paths
            **Conditions**: Assign requires assigneeId; Resolve requires resolution in payload
            **Events**: ticket.assigned, ticket.started, ticket.resolved, ticket.closed, ticket.reopened
            """,
            "support", List.of("itsm", "support", "ticket", "it"), "support_ticket", false, snapshot
        );
    }

    // ── DSL helpers ───────────────────────────────────────────────────────────

    private StateSnapshot state(String key, String label, String color, String icon,
                                boolean initial, boolean terminal, int order) {
        return StateSnapshot.builder()
            .key(key).label(label).color(color).icon(icon)
            .isInitial(initial).isFinal(terminal).sortOrder(order)
            .build();
    }

    private TransitionSnapshot transition(String key, String label, String from, String to,
                                          String perm, String variant,
                                          List<ConfigSnapshot> conditions,
                                          List<ConfigSnapshot> actions) {
        return TransitionSnapshot.builder()
            .key(key).label(label).fromStateKey(from).toStateKey(to)
            .requiredPermission(perm).uiVariant(variant)
            .conditions(conditions).actions(actions)
            .build();
    }

    private ConfigSnapshot cond(String type, Map<String, Object> config) {
        return ConfigSnapshot.builder().type(type).config(config).build();
    }

    private ConfigSnapshot act(String type, Map<String, Object> config) {
        return ConfigSnapshot.builder().type(type).config(config).build();
    }

    // ── Template spec record ──────────────────────────────────────────────────

    private record TemplateSpec(
        String slug, String name, String shortDesc, String description,
        String category, List<String> tags, String entityTypeHint,
        boolean featured, WorkflowDefinitionSnapshot snapshot
    ) {}
}
