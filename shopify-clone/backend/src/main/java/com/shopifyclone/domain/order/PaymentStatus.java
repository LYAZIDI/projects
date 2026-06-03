package com.shopifyclone.domain.order;

public enum PaymentStatus {
    PENDING,
    AUTHORIZED,
    PAID,
    PARTIALLY_REFUNDED,
    REFUNDED,
    VOIDED,
    FAILED
}
