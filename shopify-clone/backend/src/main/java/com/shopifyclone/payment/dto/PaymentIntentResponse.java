package com.shopifyclone.payment.dto;

import java.math.BigDecimal;

public record PaymentIntentResponse(
    String clientSecret,
    String paymentIntentId,
    String orderNumber,
    BigDecimal total,
    String currency
) {}
