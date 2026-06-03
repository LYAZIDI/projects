package com.shopifyclone.domain.branding;

import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.product.ProductImage;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customized_products")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CustomizedProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The base artisan product
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "store", "variants", "tags"})
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "base_product_id", nullable = false)
    private Product baseProduct;

    // The merchant who customized it
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = false)
    private MerchantProfile merchant;

    // Merchant's branding applied to the product
    private String merchantBrandName;
    private String merchantLogoUrl;
    private String merchantProductTitle;   // Merchant can rename the product

    @Column(columnDefinition = "TEXT")
    private String merchantDescription;

    // Branding customization
    @Enumerated(EnumType.STRING)
    private LabelType labelType;

    private String threadColor;      // e.g. "#C9A84C" gold thread
    private String liningColor;      // lining color choice
    private String engravingText;    // text to engrave
    private String customNotes;      // special instructions for artisan

    // Pricing
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal wholesalePrice;   // Artisan's price

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal retailPrice;      // Merchant's selling price

    @Column(precision = 10, scale = 2)
    private BigDecimal platformCommission; // Platform cut

    private String slug;
    private boolean published = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── Computed fields for frontend ───────────────────────────────────────

    @JsonGetter("title")
    public String getTitle() {
        return merchantProductTitle != null ? merchantProductTitle
                : (baseProduct != null ? baseProduct.getTitle() : null);
    }

    @JsonGetter("artisanBrand")
    public String getArtisanBrand() {
        return baseProduct != null ? baseProduct.getVendor() : null;
    }

    @JsonGetter("merchantBrand")
    public String getMerchantBrand() {
        return merchantBrandName;
    }

    @JsonGetter("images")
    public java.util.List<ProductImage> getImages() {
        return baseProduct != null ? baseProduct.getImages() : java.util.Collections.emptyList();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
