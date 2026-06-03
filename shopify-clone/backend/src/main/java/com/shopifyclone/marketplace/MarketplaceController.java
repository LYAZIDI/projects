package com.shopifyclone.marketplace;

import com.shopifyclone.domain.artisan.ArtisanProfile;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.product.ProductStatus;
import com.shopifyclone.repository.ArtisanProfileRepository;
import com.shopifyclone.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final ProductRepository productRepository;
    private final ArtisanProfileRepository artisanProfileRepository;

    // Browse all active products from artisans
    @GetMapping("/products")
    public ResponseEntity<Page<Product>> browseProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        String[] s = sort.split(",");
        Sort.Direction dir = s.length > 1 && s[1].equals("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        return ResponseEntity.ok(
            productRepository.findByStatus(ProductStatus.ACTIVE, PageRequest.of(page, size, Sort.by(dir, s[0])))
        );
    }

    // Browse artisans
    @GetMapping("/artisans")
    public ResponseEntity<Page<ArtisanProfile>> browseArtisans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(
            artisanProfileRepository.findAll(PageRequest.of(page, size))
        );
    }

    // Search products
    @GetMapping("/search")
    public ResponseEntity<Page<Product>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(
            productRepository.search(q, PageRequest.of(page, size))
        );
    }

    // Get artisan profile + their products
    @GetMapping("/artisans/{id}")
    public ResponseEntity<ArtisanProfile> getArtisan(@PathVariable Long id) {
        return artisanProfileRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/artisans/{id}/products")
    public ResponseEntity<Page<Product>> getArtisanProducts(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(
            productRepository.findByStoreIdAndStatus(id, ProductStatus.ACTIVE, PageRequest.of(page, size))
        );
    }
}
