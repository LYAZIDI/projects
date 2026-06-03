package com.shopifyclone.branding;

import com.shopifyclone.domain.branding.CustomizedProduct;
import com.shopifyclone.domain.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/branding")
@RequiredArgsConstructor
public class BrandingController {

    private final BrandingService brandingService;

    // Merchant: customize a base product
    @PostMapping("/customize/{baseProductId}")
    @PreAuthorize("hasRole('MERCHANT')")
    public ResponseEntity<CustomizedProduct> customize(
            @PathVariable Long baseProductId,
            @Valid @RequestBody CustomizeRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(brandingService.customize(baseProductId, request, currentUser));
    }

    // Merchant: get my customized products
    @GetMapping("/my-products")
    @PreAuthorize("hasRole('MERCHANT')")
    public ResponseEntity<Page<CustomizedProduct>> getMyProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(brandingService.getMerchantProducts(currentUser, page, size));
    }

    // Merchant: publish a customized product
    @PatchMapping("/my-products/{id}/publish")
    @PreAuthorize("hasRole('MERCHANT')")
    public ResponseEntity<CustomizedProduct> publish(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(brandingService.publish(id, currentUser));
    }

    // Merchant: unpublish
    @PatchMapping("/my-products/{id}/unpublish")
    @PreAuthorize("hasRole('MERCHANT')")
    public ResponseEntity<CustomizedProduct> unpublish(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(brandingService.unpublish(id, currentUser));
    }

    // Public: get published products from a merchant's store
    @GetMapping("/store/{merchantId}")
    public ResponseEntity<Page<CustomizedProduct>> getMerchantStore(
            @PathVariable Long merchantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(brandingService.getPublishedMerchantProducts(merchantId, page, size));
    }
}
