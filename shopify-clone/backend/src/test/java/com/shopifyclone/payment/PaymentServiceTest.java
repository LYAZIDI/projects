package com.shopifyclone.payment;

import com.shopifyclone.domain.order.Order;
import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.order.OrderService;
import com.shopifyclone.payment.dto.CheckoutRequest;
import com.shopifyclone.payment.dto.PaymentIntentResponse;
import com.stripe.exception.ApiConnectionException;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private OrderService orderService;

    @InjectMocks
    private PaymentService paymentService;

    private User customer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "stripeSecretKey", "sk_test_fake");
        ReflectionTestUtils.setField(paymentService, "defaultCurrency", "usd");

        customer = User.builder()
                .id(1L)
                .firstName("Jane")
                .lastName("Doe")
                .email("jane@example.com")
                .password("pw")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();
    }

    private CheckoutRequest checkoutRequest(String currency, CheckoutRequest.CartItemRequest... items) {
        return new CheckoutRequest(
                "Jane", "Doe", "jane@example.com",
                "123 Main St", null, "Casablanca", "CB", "20000", "MA", null,
                List.of(items), currency);
    }

    @Test
    void createPaymentIntent_shouldCalculateAmountInCents_includingTax() throws StripeException {
        CheckoutRequest request = checkoutRequest(null,
                new CheckoutRequest.CartItemRequest(1L, null, "Wallet", null, 2, 50.0));

        PaymentIntent fakePaymentIntent = new PaymentIntent();
        fakePaymentIntent.setId("pi_123");
        fakePaymentIntent.setClientSecret("secret_abc");

        Order fakeOrder = Order.builder().orderNumber("ORD-1").build();
        when(orderService.createPendingOrder(any(), any(), anyString())).thenReturn(fakeOrder);

        try (MockedStatic<PaymentIntent> piMock = mockStatic(PaymentIntent.class)) {
            piMock.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class)))
                    .thenReturn(fakePaymentIntent);

            PaymentIntentResponse response = paymentService.createPaymentIntent(request, customer);

            // subtotal = 100, tax = 8, total = 108 -> 10800 cents
            ArgumentCaptor<PaymentIntentCreateParams> captor =
                    ArgumentCaptor.forClass(PaymentIntentCreateParams.class);
            piMock.verify(() -> PaymentIntent.create(captor.capture()));
            assertThat(captor.getValue().getAmount()).isEqualTo(10800L);
            assertThat(captor.getValue().getCurrency()).isEqualTo("usd");

            assertThat(response.clientSecret()).isEqualTo("secret_abc");
            assertThat(response.paymentIntentId()).isEqualTo("pi_123");
            assertThat(response.orderNumber()).isEqualTo("ORD-1");
            assertThat(response.total()).isEqualByComparingTo("108.00");
            assertThat(response.currency()).isEqualTo("USD");
        }
    }

    @Test
    void createPaymentIntent_shouldUseRequestCurrency_whenProvided() throws StripeException {
        CheckoutRequest request = checkoutRequest("EUR",
                new CheckoutRequest.CartItemRequest(null, null, "Belt", null, 1, 30.0));

        PaymentIntent fakePaymentIntent = new PaymentIntent();
        fakePaymentIntent.setId("pi_456");
        fakePaymentIntent.setClientSecret("secret_def");

        Order fakeOrder = Order.builder().orderNumber("ORD-2").build();
        when(orderService.createPendingOrder(any(), any(), anyString())).thenReturn(fakeOrder);

        try (MockedStatic<PaymentIntent> piMock = mockStatic(PaymentIntent.class)) {
            piMock.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class)))
                    .thenReturn(fakePaymentIntent);

            PaymentIntentResponse response = paymentService.createPaymentIntent(request, customer);

            ArgumentCaptor<PaymentIntentCreateParams> captor =
                    ArgumentCaptor.forClass(PaymentIntentCreateParams.class);
            piMock.verify(() -> PaymentIntent.create(captor.capture()));
            assertThat(captor.getValue().getCurrency()).isEqualTo("eur");
            assertThat(response.currency()).isEqualTo("EUR");
        }
    }

    @Test
    void createPaymentIntent_shouldPassCustomerMetadata() throws StripeException {
        CheckoutRequest request = checkoutRequest(null,
                new CheckoutRequest.CartItemRequest(null, null, "Belt", null, 1, 30.0));

        PaymentIntent fakePaymentIntent = new PaymentIntent();
        fakePaymentIntent.setId("pi_789");
        fakePaymentIntent.setClientSecret("secret_ghi");

        when(orderService.createPendingOrder(any(), any(), anyString()))
                .thenReturn(Order.builder().orderNumber("ORD-3").build());

        try (MockedStatic<PaymentIntent> piMock = mockStatic(PaymentIntent.class)) {
            piMock.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class)))
                    .thenReturn(fakePaymentIntent);

            paymentService.createPaymentIntent(request, customer);

            ArgumentCaptor<PaymentIntentCreateParams> captor =
                    ArgumentCaptor.forClass(PaymentIntentCreateParams.class);
            piMock.verify(() -> PaymentIntent.create(captor.capture()));
            assertThat(captor.getValue().getMetadata()).containsEntry("customerEmail", "jane@example.com");
            assertThat(captor.getValue().getMetadata()).containsEntry("customerName", "Jane Doe");
        }
    }

    @Test
    void createPaymentIntent_shouldThrowRuntimeException_whenStripeThrows() {
        CheckoutRequest request = checkoutRequest(null,
                new CheckoutRequest.CartItemRequest(null, null, "Belt", null, 1, 30.0));

        try (MockedStatic<PaymentIntent> piMock = mockStatic(PaymentIntent.class)) {
            piMock.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class)))
                    .thenThrow(new ApiConnectionException("network down"));

            assertThatThrownBy(() -> paymentService.createPaymentIntent(request, customer))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Payment initialization failed");
        }
    }
}
