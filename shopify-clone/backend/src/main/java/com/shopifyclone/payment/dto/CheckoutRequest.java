package com.shopifyclone.payment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CheckoutRequest(
    // Shipping
    @NotBlank String firstName,
    @NotBlank String lastName,
    @Email @NotBlank String email,
    @NotBlank String address1,
    String address2,
    @NotBlank String city,
    @NotBlank String state,
    @NotBlank String zip,
    @NotBlank String country,
    String phone,

    // Cart items
    @NotEmpty List<CartItemRequest> items,

    String currency
) {
    public record CartItemRequest(
        Long productId,
        Long variantId,
        String title,
        String variantTitle,
        int quantity,
        double price
    ) {}
}
