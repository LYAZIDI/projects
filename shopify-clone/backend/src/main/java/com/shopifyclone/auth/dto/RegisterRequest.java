package com.shopifyclone.auth.dto;

import com.shopifyclone.domain.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @Email @NotBlank String email,
    @NotBlank @Size(min = 8) String password,
    Role role,           // CUSTOMER, ARTISAN, MERCHANT
    String brandName,    // required for ARTISAN and MERCHANT
    String bio,
    String location
) {}
