package com.shopifyclone.order;

import com.shopifyclone.domain.order.Order;
import com.shopifyclone.domain.order.OrderStatus;
import com.shopifyclone.domain.order.PaymentStatus;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.exception.ResourceNotFoundException;
import com.shopifyclone.payment.dto.CheckoutRequest;
import com.shopifyclone.repository.OrderRepository;
import com.shopifyclone.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private OrderService orderService;

    private User customer() {
        return User.builder()
                .id(7L)
                .firstName("Jane")
                .lastName("Doe")
                .email("jane@example.com")
                .password("pw")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();
    }

    private CheckoutRequest checkoutRequestWithItems(CheckoutRequest.CartItemRequest... items) {
        return new CheckoutRequest(
                "Jane", "Doe", "jane@example.com",
                "123 Main St", null, "Casablanca", "CB", "20000", "MA", null,
                List.of(items), null);
    }

    @Test
    void createPendingOrder_shouldComputeSubtotalTaxAndTotal() {
        CheckoutRequest request = checkoutRequestWithItems(
                new CheckoutRequest.CartItemRequest(1L, null, "Wallet", null, 2, 50.0),
                new CheckoutRequest.CartItemRequest(null, null, "Belt", "Brown", 1, 30.0)
        );
        when(productRepository.findById(1L)).thenReturn(Optional.of(new Product()));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        User cust = customer();
        Order result = orderService.createPendingOrder(request, cust, "pi_123");

        // subtotal = 2*50 + 1*30 = 130 ; tax = 130*0.08 = 10.4 ; total = 140.4
        assertThat(result.getSubtotal()).isEqualByComparingTo("130");
        assertThat(result.getTaxTotal()).isEqualByComparingTo("10.40");
        assertThat(result.getTotal()).isEqualByComparingTo("140.40");
        assertThat(result.getDiscountTotal()).isEqualByComparingTo("0");
        assertThat(result.getShippingTotal()).isEqualByComparingTo("0");
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(result.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(result.getStripePaymentIntentId()).isEqualTo("pi_123");
        assertThat(result.getCustomer()).isSameAs(cust);
        assertThat(result.getCurrency()).isEqualTo("USD");
        assertThat(result.getItems()).hasSize(2);
        assertThat(result.getItems().get(0).getProduct()).isNotNull();
        assertThat(result.getItems().get(1).getProduct()).isNull();
        assertThat(result.getOrderNumber()).startsWith("ORD-");
    }

    @Test
    void createPendingOrder_shouldUppercaseProvidedCurrency() {
        CheckoutRequest request = new CheckoutRequest(
                "Jane", "Doe", "jane@example.com",
                "123 Main St", null, "Casablanca", "CB", "20000", "MA", null,
                List.of(new CheckoutRequest.CartItemRequest(null, null, "Belt", null, 1, 30.0)),
                "eur");
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.createPendingOrder(request, customer(), "pi_123");

        assertThat(result.getCurrency()).isEqualTo("EUR");
    }

    @Test
    void createPendingOrder_shouldNotLookupProduct_whenProductIdIsNull() {
        CheckoutRequest request = checkoutRequestWithItems(
                new CheckoutRequest.CartItemRequest(null, null, "Belt", null, 1, 30.0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.createPendingOrder(request, customer(), "pi_123");

        verify(productRepository, org.mockito.Mockito.never()).findById(any());
    }

    @Test
    void confirmPayment_shouldSetConfirmedAndPaid_whenOrderExists() {
        Order order = Order.builder()
                .id(1L)
                .orderNumber("ORD-1")
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                .stripePaymentIntentId("pi_123")
                .subtotal(BigDecimal.TEN)
                .total(BigDecimal.TEN)
                .build();
        when(orderRepository.findByStripePaymentIntentId("pi_123")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.confirmPayment("pi_123");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(result.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    void confirmPayment_shouldThrowResourceNotFoundException_whenOrderDoesNotExist() {
        when(orderRepository.findByStripePaymentIntentId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.confirmPayment("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void failPayment_shouldSetCancelledAndFailed_whenOrderExists() {
        Order order = Order.builder()
                .id(1L)
                .orderNumber("ORD-1")
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                .stripePaymentIntentId("pi_123")
                .subtotal(BigDecimal.TEN)
                .total(BigDecimal.TEN)
                .build();
        when(orderRepository.findByStripePaymentIntentId("pi_123")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.failPayment("pi_123");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(result.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
    }

    @Test
    void failPayment_shouldThrowResourceNotFoundException_whenOrderDoesNotExist() {
        when(orderRepository.findByStripePaymentIntentId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.failPayment("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getCustomerOrders_shouldDelegateToRepository() {
        Page<Order> page = new PageImpl<>(List.of());
        when(orderRepository.findByCustomerId(any(), any(Pageable.class))).thenReturn(page);

        Page<Order> result = orderService.getCustomerOrders(7L, 0, 10);

        assertThat(result).isEqualTo(page);
        verify(orderRepository).findByCustomerId(eq(7L), any(Pageable.class));
    }

    @Test
    void getByOrderNumber_shouldReturnOrder_whenFound() {
        Order order = Order.builder().orderNumber("ORD-1").build();
        when(orderRepository.findByOrderNumber("ORD-1")).thenReturn(Optional.of(order));

        Order result = orderService.getByOrderNumber("ORD-1");

        assertThat(result).isEqualTo(order);
    }

    @Test
    void getByOrderNumber_shouldThrowResourceNotFoundException_whenMissing() {
        when(orderRepository.findByOrderNumber("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.getByOrderNumber("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateStatus_shouldUpdateAndPersistOrder() {
        Order order = Order.builder().orderNumber("ORD-1").status(OrderStatus.PENDING).build();
        when(orderRepository.findByOrderNumber("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.updateStatus("ORD-1", OrderStatus.SHIPPED);

        assertThat(result.getStatus()).isEqualTo(OrderStatus.SHIPPED);
        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(OrderStatus.SHIPPED);
    }

    @Test
    void updateStatus_shouldThrowResourceNotFoundException_whenOrderMissing() {
        when(orderRepository.findByOrderNumber("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.updateStatus("missing", OrderStatus.SHIPPED))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAllOrders_shouldDelegateToRepository() {
        Page<Order> page = new PageImpl<>(List.of());
        when(orderRepository.findAll(any(Pageable.class))).thenReturn(page);

        Page<Order> result = orderService.getAllOrders(0, 20);

        assertThat(result).isEqualTo(page);
    }
}
