package com.platform.workflow.crm.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * CRM Quote domain entity.
 *
 * <p>Statuses managed by the workflow engine:
 * draft → sent → accepted | rejected | expired
 */
@Entity
@Table(name = "crm_quotes")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String reference;

    @Column(nullable = false)
    private String status;  // draft | sent | accepted | rejected | expired

    private String leadId;
    private String contactId;
    private String contactName;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalAmountExcl;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalTax;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalAmountIncl;

    private LocalDate expiryDate;

    private Instant sentAt;
    private Instant acceptedAt;
    private Instant rejectedAt;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @CreatedDate   @Column(updatable = false) private Instant createdAt;
    @LastModifiedDate                          private Instant updatedAt;
    @CreatedBy     @Column(updatable = false) private String createdBy;
    @LastModifiedBy                            private String updatedBy;
}
