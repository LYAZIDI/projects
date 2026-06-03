package com.shopifyclone.auth.dto;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    Long userId,
    String email,
    String firstName,
    String lastName,
    String role
) {
    public static AuthResponse of(String accessToken, String refreshToken,
                                   Long userId, String email,
                                   String firstName, String lastName, String role) {
        return new AuthResponse(accessToken, refreshToken, "Bearer",
                userId, email, firstName, lastName, role);
    }
}
