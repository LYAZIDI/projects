package com.shopifyclone.security;

import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String TEST_SECRET = "test-secret-key-that-is-long-enough-for-hmac-sha-256-algorithm";

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 86_400_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 604_800_000L);

        user = User.builder()
                .id(1L)
                .firstName("Jane")
                .lastName("Doe")
                .email("jane@example.com")
                .password("pw")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();
    }

    @Test
    void generateToken_shouldEmbedUsernameAsSubject() {
        String token = jwtService.generateToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo("jane@example.com");
    }

    @Test
    void generateToken_withExtraClaims_shouldStillHaveCorrectSubject() {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", "CUSTOMER");

        String token = jwtService.generateToken(extraClaims, user);

        assertThat(jwtService.extractUsername(token)).isEqualTo("jane@example.com");
        String role = jwtService.extractClaim(token, claims -> claims.get("role", String.class));
        assertThat(role).isEqualTo("CUSTOMER");
    }

    @Test
    void generateRefreshToken_shouldBeValidForSameUser() {
        String refreshToken = jwtService.generateRefreshToken(user);

        assertThat(jwtService.isTokenValid(refreshToken, user)).isTrue();
    }

    @Test
    void isTokenValid_shouldReturnTrue_forMatchingUserAndUnexpiredToken() {
        String token = jwtService.generateToken(user);

        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    @Test
    void isTokenValid_shouldReturnFalse_whenUsernameDoesNotMatch() {
        String token = jwtService.generateToken(user);

        UserDetails otherUser = User.builder()
                .id(2L)
                .firstName("Other")
                .lastName("Person")
                .email("other@example.com")
                .password("pw")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();

        assertThat(jwtService.isTokenValid(token, otherUser)).isFalse();
    }

    @Test
    void isTokenValid_shouldThrowExpiredJwtException_whenTokenIsExpired() {
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", -10_000L);
        String expiredToken = jwtService.generateToken(user);

        assertThatThrownBy(() -> jwtService.isTokenValid(expiredToken, user))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void extractUsername_shouldThrow_whenTokenIsMalformed() {
        assertThatThrownBy(() -> jwtService.extractUsername("not-a-valid-jwt"))
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }

    @Test
    void extractUsername_shouldThrow_whenSignedWithDifferentKey() {
        String token = jwtService.generateToken(user);

        JwtService otherJwtService = new JwtService();
        ReflectionTestUtils.setField(otherJwtService, "secretKey",
                "a-completely-different-secret-key-of-sufficient-length-too");

        assertThatThrownBy(() -> otherJwtService.extractUsername(token))
                .isInstanceOf(io.jsonwebtoken.security.SignatureException.class);
    }
}
