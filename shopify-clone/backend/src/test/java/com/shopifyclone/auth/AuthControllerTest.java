package com.shopifyclone.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopifyclone.auth.dto.AuthResponse;
import com.shopifyclone.auth.dto.LoginRequest;
import com.shopifyclone.auth.dto.RegisterRequest;
import com.shopifyclone.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    // Needed so the context can wire JwtAuthenticationFilter's dependencies,
    // even though the filter chain itself is disabled for this slice test.
    @MockBean
    private JwtService jwtService;
    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void register_shouldReturn201_withAuthResponse_onValidPayload() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "Jane", "Doe", "jane@example.com", "password123", null, null, null, null);
        AuthResponse response = new AuthResponse(
                "access-token", "refresh-token", "Bearer", 1L, "jane@example.com", "Jane", "Doe", "CUSTOMER");

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void register_shouldReturn400_whenEmailIsBlank() throws Exception {
        String invalidPayload = """
                {
                  "firstName": "Jane",
                  "lastName": "Doe",
                  "email": "",
                  "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_shouldReturn400_whenPasswordTooShort() throws Exception {
        String invalidPayload = """
                {
                  "firstName": "Jane",
                  "lastName": "Doe",
                  "email": "jane@example.com",
                  "password": "short"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_shouldReturn400_whenEmailAlreadyInUse() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "Jane", "Doe", "jane@example.com", "password123", null, null, null, null);

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("Email already in use"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email already in use"));
    }

    @Test
    void login_shouldReturn200_withAuthResponse_onValidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("jane@example.com", "password123");
        AuthResponse response = new AuthResponse(
                "access-token", "refresh-token", "Bearer", 1L, "jane@example.com", "Jane", "Doe", "CUSTOMER");

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    void login_shouldReturn400_whenEmailIsInvalid() throws Exception {
        String invalidPayload = """
                {
                  "email": "not-an-email",
                  "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }
}
