package com.shopifyclone.order;

import com.shopifyclone.domain.order.Order;
import com.shopifyclone.domain.order.OrderItem;
import com.shopifyclone.domain.order.OrderStatus;
import com.shopifyclone.domain.order.PaymentStatus;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.product.ProductVariant;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.exception.ResourceNotFoundException;
import com.shopifyclone.payment.dto.CheckoutRequest;
import com.shopifyclone.repository.OrderRepository;
import com.shopifyclone.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Transactional
    public Order createPendingOrder(CheckoutRequest request, User customer, String paymentIntentId) {
        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setStripePaymentIntentId(paymentIntentId);
        order.setCurrency(request.currency() != null ? request.currency().toUpperCase() : "USD");

        // Shipping address
        order.setShippingFirstName(request.firstName());
        order.setShippingLastName(request.lastName());
        order.setShippingAddress1(request.address1());
        order.setShippingAddress2(request.address2());
        order.setShippingCity(request.city());
        order.setShippingState(request.state());
        order.setShippingZip(request.zip());
        order.setShippingCountry(request.country());

        // Build order items
        List<OrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CheckoutRequest.CartItemRequest cartItem : request.items()) {
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProductTitle(cartItem.title());
            item.setVariantTitle(cartItem.variantTitle());
            item.setQuantity(cartItem.quantity());
            item.setPrice(BigDecimal.valueOf(cartItem.price()));
            item.setTotal(BigDecimal.valueOf(cartItem.price() * cartItem.quantity()));

            if (cartItem.productId() != null) {
                productRepository.findById(cartItem.productId())
                        .ifPresent(item::setProduct);
            }

            items.add(item);
            subtotal = subtotal.add(item.getTotal());
        }

        order.setItems(items);
        order.setSubtotal(subtotal);
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setShippingTotal(BigDecimal.ZERO);
        order.setTaxTotal(subtotal.multiply(BigDecimal.valueOf(0.08)));
        order.setTotal(subtotal.add(order.getTaxTotal()));

        return orderRepository.save(order);
    }

    @Transactional
    public Order confirmPayment(String paymentIntentId) {
        Order order = orderRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for paymentIntent: " + paymentIntentId));
        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentStatus(PaymentStatus.PAID);
        return orderRepository.save(order);
    }

    @Transactional
    public Order failPayment(String paymentIntentId) {
        Order order = orderRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for paymentIntent: " + paymentIntentId));
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.FAILED);
        return orderRepository.save(order);
    }

    public Page<Order> getCustomerOrders(Long customerId, int page, int size) {
        return orderRepository.findByCustomerId(customerId, PageRequest.of(page, size));
    }

    public Order getByOrderNumber(String orderNumber) {
        return orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));
    }

    @Transactional
    public Order updateStatus(String orderNumber, OrderStatus status) {
        Order order = getByOrderNumber(orderNumber);
        order.setStatus(status);
        return orderRepository.save(order);
    }

    public Page<Order> getAllOrders(int page, int size) {
        return orderRepository.findAll(PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("createdAt").descending()));
    }

    private String generateOrderNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmm"));
        int random = new Random().nextInt(9000) + 1000;
        return "ORD-" + timestamp + "-" + random;
    }
}
