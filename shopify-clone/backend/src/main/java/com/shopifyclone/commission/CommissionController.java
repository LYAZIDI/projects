package com.shopifyclone.commission;

import com.shopifyclone.domain.commission.Commission;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/commissions")
@RequiredArgsConstructor
public class CommissionController {

    private final CommissionService commissionService;
    private final UserRepository userRepository;

    @GetMapping("/artisan/stats")
    public ResponseEntity<CommissionService.RevenueStats> getArtisanStats() {
        return ResponseEntity.ok(commissionService.getArtisanStats(currentUserId()));
    }

    @GetMapping("/merchant/stats")
    public ResponseEntity<CommissionService.RevenueStats> getMerchantStats() {
        return ResponseEntity.ok(commissionService.getMerchantStats(currentUserId()));
    }

    @GetMapping("/platform/revenue")
    public ResponseEntity<BigDecimal> getPlatformRevenue() {
        return ResponseEntity.ok(commissionService.getPlatformRevenue());
    }

    @GetMapping("/artisan")
    public ResponseEntity<Page<Commission>> getArtisanCommissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(commissionService.getArtisanCommissions(currentUserId(), page, size));
    }

    @GetMapping("/merchant")
    public ResponseEntity<Page<Commission>> getMerchantCommissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(commissionService.getMerchantCommissions(currentUserId(), page, size));
    }

    @PostMapping("/{commissionId}/transfer")
    public ResponseEntity<Commission> transferToArtisan(@PathVariable Long commissionId) {
        return ResponseEntity.ok(commissionService.transferToArtisan(commissionId));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
