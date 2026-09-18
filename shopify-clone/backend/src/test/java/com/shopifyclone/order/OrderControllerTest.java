package com.shopifyclone.order;

import com.shopifyclone.domain.order.Order;
import com.shopifyclone.domain.order.OrderStatus;
import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Filters are intentionally left enabled (unlike the other controller slice tests) because
// Spring Security's SecurityContextHolderFilter must run for the .with(user(...)) test fixture
// to populate the SecurityContext that @AuthenticationPrincipal reads from.
@WebMvcTest(controllers = OrderController.class)
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @MockBean
    private JwtService jwtService;
    @MockBean
    private UserDetailsService userDetailsService;

    private User customer(long id) {
        return User.builder()
                .id(id)
                .firstName("Jane")
                .lastName("Doe")
                .email("jane" + id + "@example.com")
                .password("pw")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();
    }

    private User admin() {
        return User.builder()
                .id(999L)
                .firstName("Ada")
                .lastName("Min")
                .email("admin@example.com")
                .password("pw")
                .role(Role.ADMIN)
                .enabled(true)
                .build();
    }

    private Order sampleOrder(User owner) {
        return Order.builder()
                .id(1L)
                .orderNumber("ORD-1")
                .customer(owner)
                .status(OrderStatus.PENDING)
                .build();
    }

    @Test
    void getMyOrders_shouldReturn200_forAuthenticatedCustomer() throws Exception {
        User me = customer(1L);
        when(orderService.getCustomerOrders(eq(1L), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(sampleOrder(me))));

        mockMvc.perform(get("/api/v1/orders").with(user(me)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].orderNumber").value("ORD-1"));
    }

    @Test
    void getOrder_shouldReturn200_whenOrderBelongsToCurrentUser() throws Exception {
        User me = customer(1L);
        when(orderService.getByOrderNumber("ORD-1")).thenReturn(sampleOrder(me));

        mockMvc.perform(get("/api/v1/orders/ORD-1").with(user(me)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value("ORD-1"));
    }

    @Test
    void getOrder_shouldReturn403_whenOrderBelongsToAnotherCustomer() throws Exception {
        User owner = customer(1L);
        User requester = customer(2L);
        when(orderService.getByOrderNumber("ORD-1")).thenReturn(sampleOrder(owner));

        mockMvc.perform(get("/api/v1/orders/ORD-1").with(user(requester)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getOrder_shouldReturn200_whenAdminViewsAnyoneElsesOrder() throws Exception {
        User owner = customer(1L);
        when(orderService.getByOrderNumber("ORD-1")).thenReturn(sampleOrder(owner));

        mockMvc.perform(get("/api/v1/orders/ORD-1").with(user(admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value("ORD-1"));
    }

    @Test
    void updateStatus_shouldReturn200_andReflectNewStatus() throws Exception {
        Order updated = sampleOrder(customer(1L));
        updated.setStatus(OrderStatus.SHIPPED);
        when(orderService.updateStatus(eq("ORD-1"), eq(OrderStatus.SHIPPED))).thenReturn(updated);

        mockMvc.perform(patch("/api/v1/admin/orders/ORD-1/status")
                        .param("status", "SHIPPED")
                        .with(user(admin()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));
    }

    @Test
    void updateStatus_shouldReturn500_whenStatusParamIsInvalid() throws Exception {
        // MethodArgumentTypeMismatchException has no dedicated handler in GlobalExceptionHandler,
        // so it falls through to the catch-all Exception handler, which responds with 500.
        mockMvc.perform(patch("/api/v1/admin/orders/ORD-1/status")
                        .param("status", "NOT_A_STATUS")
                        .with(user(admin()))
                        .with(csrf()))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void getAllOrders_shouldReturn200_withPageOfOrders() throws Exception {
        when(orderService.getAllOrders(anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(sampleOrder(customer(1L)))));

        mockMvc.perform(get("/api/v1/admin/orders").with(user(admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", org.hamcrest.Matchers.hasSize(1)));
    }
}
