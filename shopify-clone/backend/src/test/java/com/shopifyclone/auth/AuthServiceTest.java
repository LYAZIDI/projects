package com.shopifyclone.auth;

import com.shopifyclone.auth.dto.AuthResponse;
import com.shopifyclone.auth.dto.LoginRequest;
import com.shopifyclone.auth.dto.RegisterRequest;
import com.shopifyclone.domain.artisan.ArtisanProfile;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.repository.ArtisanProfileRepository;
import com.shopifyclone.repository.MerchantProfileRepository;
import com.shopifyclone.repository.UserRepository;
import com.shopifyclone.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private ArtisanProfileRepository artisanProfileRepository;
    @Mock
    private MerchantProfileRepository merchantProfileRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest baseCustomerRequest;

    @BeforeEach
    void setUp() {
        baseCustomerRequest = new RegisterRequest(
                "Jane", "Doe", "jane@example.com", "password123",
                null, null, null, null);
        // Mimics Hibernate's IDENTITY generation (which sets the id on the same
        // instance during a real save) so AuthService.register()'s reassigned
        // `user` ends up with an id, the way it would against a real database.
        lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setId(99L);
            return savedUser;
        });
    }

    @Test
    void register_shouldThrowIllegalArgumentException_whenEmailAlreadyInUse() {
        when(userRepository.existsByEmail("jane@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(baseCustomerRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email already in use");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_shouldDefaultToCustomerRole_andNotCreateAnyProfile_whenRoleIsNull() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-pw");
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UserDetails.class))).thenReturn("refresh-token");

        AuthResponse response = authService.register(baseCustomerRequest);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(savedUser.getPassword()).isEqualTo("encoded-pw");
        assertThat(savedUser.isEnabled()).isTrue();

        verify(artisanProfileRepository, never()).save(any());
        verify(merchantProfileRepository, never()).save(any());

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.email()).isEqualTo("jane@example.com");
        assertThat(response.role()).isEqualTo("CUSTOMER");
        // Regression check: register() must use the saved (id-populated) user
        // when building the response, not the pre-save instance.
        assertThat(response.userId()).isEqualTo(99L);
    }

    @Test
    void register_shouldCreateArtisanProfile_withDefaultBrandName_whenBrandNameNotProvided() {
        RegisterRequest request = new RegisterRequest(
                "John", "Smith", "john@example.com", "password123",
                Role.ARTISAN, null, "bio text", "Marrakech");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-pw");
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UserDetails.class))).thenReturn("refresh-token");

        authService.register(request);

        ArgumentCaptor<ArtisanProfile> captor = ArgumentCaptor.forClass(ArtisanProfile.class);
        verify(artisanProfileRepository).save(captor.capture());
        ArtisanProfile profile = captor.getValue();

        assertThat(profile.getBrandName()).isEqualTo("John's Workshop");
        assertThat(profile.getBio()).isEqualTo("bio text");
        assertThat(profile.getLocation()).isEqualTo("Marrakech");
        assertThat(profile.getCommissionRate()).isEqualTo(0.15);
        verify(merchantProfileRepository, never()).save(any());
    }

    @Test
    void register_shouldCreateArtisanProfile_withProvidedBrandName() {
        RegisterRequest request = new RegisterRequest(
                "John", "Smith", "john@example.com", "password123",
                Role.ARTISAN, "Atlas Leather Co", "bio text", "Marrakech");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-pw");
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UserDetails.class))).thenReturn("refresh-token");

        authService.register(request);

        ArgumentCaptor<ArtisanProfile> captor = ArgumentCaptor.forClass(ArtisanProfile.class);
        verify(artisanProfileRepository).save(captor.capture());
        assertThat(captor.getValue().getBrandName()).isEqualTo("Atlas Leather Co");
    }

    @Test
    void register_shouldCreateMerchantProfile_whenRoleIsMerchant() {
        RegisterRequest request = new RegisterRequest(
                "Amy", "Lee", "amy@example.com", "password123",
                Role.MERCHANT, null, "desc text", null);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-pw");
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UserDetails.class))).thenReturn("refresh-token");

        authService.register(request);

        ArgumentCaptor<MerchantProfile> captor = ArgumentCaptor.forClass(MerchantProfile.class);
        verify(merchantProfileRepository).save(captor.capture());
        MerchantProfile profile = captor.getValue();

        assertThat(profile.getBrandName()).isEqualTo("Amy's Brand");
        assertThat(profile.getDescription()).isEqualTo("desc text");
        verify(artisanProfileRepository, never()).save(any());
    }

    @Test
    void register_shouldCreateMerchantProfile_withProvidedBrandName() {
        RegisterRequest request = new RegisterRequest(
                "Amy", "Lee", "amy@example.com", "password123",
                Role.MERCHANT, "Lee Goods", "desc text", null);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-pw");
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UserDetails.class))).thenReturn("refresh-token");

        authService.register(request);

        ArgumentCaptor<MerchantProfile> captor = ArgumentCaptor.forClass(MerchantProfile.class);
        verify(merchantProfileRepository).save(captor.capture());
        assertThat(captor.getValue().getBrandName()).isEqualTo("Lee Goods");
    }

    @Test
    void login_shouldAuthenticateAndReturnTokens_whenCredentialsValid() {
        LoginRequest request = new LoginRequest("jane@example.com", "password123");
        User user = User.builder()
                .id(42L)
                .firstName("Jane")
                .lastName("Doe")
                .email("jane@example.com")
                .password("encoded-pw")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();

        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UserDetails.class))).thenReturn("refresh-token");

        AuthResponse response = authService.login(request);

        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("jane@example.com", "password123"));
        assertThat(response.userId()).isEqualTo(42L);
        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.role()).isEqualTo("CUSTOMER");
    }

    @Test
    void login_shouldPropagateException_whenCredentialsInvalid() {
        LoginRequest request = new LoginRequest("jane@example.com", "wrong-password");
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);

        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void login_shouldThrowIllegalArgumentException_whenUserNotFoundAfterAuthentication() {
        LoginRequest request = new LoginRequest("ghost@example.com", "password123");
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User not found");
    }
}
