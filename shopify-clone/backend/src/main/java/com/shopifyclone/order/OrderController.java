package com.shopifyclone.order;

import com.shopifyclone.domain.order.Order;
import com.shopifyclone.domain.order.OrderStatus;
import com.shopifyclone.domain.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // Customer: get my orders
    @GetMapping("/orders")
    public ResponseEntity<Page<Order>> getMyOrders(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(orderService.getCustomerOrders(currentUser.getId(), page, size));
    }

    // Customer: get one order by number
    @GetMapping("/orders/{orderNumber}")
    public ResponseEntity<Order> getOrder(
            @PathVariable String orderNumber,
            @AuthenticationPrincipal User currentUser) {
        Order order = orderService.getByOrderNumber(orderNumber);
        // Ensure customer can only see their own orders (admin can see all)
        boolean isAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !order.getCustomer().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(order);
    }

    // Admin: update order status
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/orders/{orderNumber}/status")
    public ResponseEntity<Order> updateStatus(
            @PathVariable String orderNumber,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(orderService.updateStatus(orderNumber, status));
    }

    // Admin: get all orders
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/orders")
    public ResponseEntity<Page<Order>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(orderService.getAllOrders(page, size));
    }
}
