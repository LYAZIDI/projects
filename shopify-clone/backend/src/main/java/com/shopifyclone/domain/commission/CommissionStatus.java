package com.shopifyclone.domain.commission;

public enum CommissionStatus {
    PENDING,    // Order placed, payment not yet confirmed
    CALCULATED, // Payment confirmed, amounts calculated
    TRANSFERRED, // Money sent to artisan via Stripe
    FAILED
}
