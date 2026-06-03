package com.platform.workflow.crm.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * CRM Lead domain entity.
 *
 * <p>The {@code status} field is the field managed by the workflow engine.
 * It must stay in sync with the {@link com.platform.workflow.kernel.workflow.model.WorkflowInstance}
 * via the {@link LeadEntityAdapter}.
 */
@Entity
@Table(
    name = "crm_leads",
    uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "reference"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String reference;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String status;   // open | won | lost | cancelled  — kept in sync by adapter

    private String contactId;
    private String contactName;
    private String contactEmail;

    @Column(columnDefinition = "TEXT")
    private String lostReason;

    private Instant wonAt;
    private Instant lostAt;
    private Instant cancelledAt;

    @CreatedDate   @Column(updatable = false) private Instant createdAt;
    @LastModifiedDate                          private Instant updatedAt;
    @CreatedBy     @Column(updatable = false) private String createdBy;
    @LastModifiedBy                            private String updatedBy;
}
