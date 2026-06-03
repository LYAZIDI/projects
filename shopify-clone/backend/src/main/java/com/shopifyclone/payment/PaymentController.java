package com.shopifyclone.payment;

import com.shopifyclone.domain.user.User;
import com.shopifyclone.order.OrderService;
import com.shopifyclone.payment.dto.CheckoutRequest;
import com.shopifyclone.payment.dto.PaymentIntentResponse;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final OrderService orderService;

    @Value("${app.stripe.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/api/v1/payments/create-intent")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(
            @Valid @RequestBody CheckoutRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentService.createPaymentIntent(request, currentUser));
    }

    @PostMapping("/api/v1/webhooks/stripe")
    public ResponseEntity<String> stripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

            switch (event.getType()) {
                case "payment_intent.succeeded" -> {
                    PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    orderService.confirmPayment(pi.getId());
                    log.info("Payment confirmed for intent: {}", pi.getId());
                }
                case "payment_intent.payment_failed" -> {
                    PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    orderService.failPayment(pi.getId());
                    log.warn("Payment failed for intent: {}", pi.getId());
                }
                default -> log.debug("Unhandled Stripe event: {}", event.getType());
            }

            return ResponseEntity.ok("ok");

        } catch (SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature");
            return ResponseEntity.badRequest().body("Invalid signature");
        } catch (Exception e) {
            log.error("Webhook error: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Webhook error");
        }
    }
}
