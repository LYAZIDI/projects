package com.shopifyclone.payment;

import com.shopifyclone.domain.order.Order;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.order.OrderService;
import com.shopifyclone.payment.dto.CheckoutRequest;
import com.shopifyclone.payment.dto.PaymentIntentResponse;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    @Value("${app.stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${app.stripe.currency:usd}")
    private String defaultCurrency;

    private final OrderService orderService;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public PaymentIntentResponse createPaymentIntent(CheckoutRequest request, User customer) {
        String currency = request.currency() != null ? request.currency().toLowerCase() : defaultCurrency;

        // Calculate total from cart items (server-side, don't trust client prices in prod)
        BigDecimal subtotal = request.items().stream()
                .map(i -> BigDecimal.valueOf(i.price() * i.quantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(0.08));
        BigDecimal total = subtotal.add(tax);

        // Stripe uses smallest currency unit (cents)
        long amountInCents = total.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();

        try {
            Map<String, String> metadata = new HashMap<>();
            metadata.put("customerEmail", request.email());
            metadata.put("customerName", request.firstName() + " " + request.lastName());

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency(currency)
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .putAllMetadata(metadata)
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            // Create pending order in DB
            Order order = orderService.createPendingOrder(request, customer, paymentIntent.getId());

            log.info("PaymentIntent created: {} for order: {}", paymentIntent.getId(), order.getOrderNumber());

            return new PaymentIntentResponse(
                    paymentIntent.getClientSecret(),
                    paymentIntent.getId(),
                    order.getOrderNumber(),
                    total,
                    currency.toUpperCase()
            );

        } catch (StripeException e) {
            log.error("Stripe error: {}", e.getMessage());
            throw new RuntimeException("Payment initialization failed: " + e.getMessage());
        }
    }
}
