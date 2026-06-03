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
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ArtisanProfileRepository artisanProfileRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use");
        }

        Role role = request.role() != null ? request.role() : Role.CUSTOMER;

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(role)
                .enabled(true)
                .build();

        userRepository.save(user);

        // Create associated profile based on role
        if (role == Role.ARTISAN) {
            ArtisanProfile profile = ArtisanProfile.builder()
                    .user(user)
                    .brandName(request.brandName() != null ? request.brandName() : user.getFirstName() + "'s Workshop")
                    .bio(request.bio())
                    .location(request.location())
                    .commissionRate(0.15)
                    .build();
            artisanProfileRepository.save(profile);
        } else if (role == Role.MERCHANT) {
            MerchantProfile profile = MerchantProfile.builder()
                    .user(user)
                    .brandName(request.brandName() != null ? request.brandName() : user.getFirstName() + "'s Brand")
                    .description(request.bio())
                    .build();
            merchantProfileRepository.save(profile);
        }

        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.of(accessToken, refreshToken,
                user.getId(), user.getEmail(),
                user.getFirstName(), user.getLastName(),
                user.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.of(accessToken, refreshToken,
                user.getId(), user.getEmail(),
                user.getFirstName(), user.getLastName(),
                user.getRole().name());
    }
}
