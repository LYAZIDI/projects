package com.shopifyclone.branding;

import com.shopifyclone.domain.branding.CustomizedProduct;
import com.shopifyclone.domain.branding.LabelType;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.exception.ResourceNotFoundException;
import com.shopifyclone.repository.CustomizedProductRepository;
import com.shopifyclone.repository.MerchantProfileRepository;
import com.shopifyclone.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BrandingServiceTest {

    @Mock
    private CustomizedProductRepository customizedProductRepository;
    @Mock
    private MerchantProfileRepository merchantProfileRepository;
    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private BrandingService brandingService;

    private User merchantUser() {
        return User.builder()
                .id(5L)
                .firstName("Amy")
                .lastName("Lee")
                .email("amy@example.com")
                .password("pw")
                .role(Role.MERCHANT)
                .enabled(true)
                .build();
    }

    private MerchantProfile merchantProfile() {
        return MerchantProfile.builder()
                .id(50L)
                .brandName("Amy's Brand")
                .brandLogoUrl("https://logo.example.com/amy.png")
                .build();
    }

    private Product baseProductWithWholesalePrice() {
        return Product.builder()
                .id(1L)
                .title("Leather Bag")
                .description("Handcrafted bag")
                .price(BigDecimal.valueOf(100))
                .wholesalePrice(BigDecimal.valueOf(60))
                .inventory(5)
                .slug("leather-bag")
                .build();
    }

    @Test
    void customize_shouldUseBaseWholesalePrice_whenPresent() {
        Product base = baseProductWithWholesalePrice();
        when(productRepository.findById(1L)).thenReturn(Optional.of(base));
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.of(merchantProfile()));
        when(customizedProductRepository.save(any(CustomizedProduct.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CustomizeRequest request = new CustomizeRequest(
                null, null, null, null, null, null, null, null, 150.0);

        CustomizedProduct result = brandingService.customize(1L, request, merchantUser());

        assertThat(result.getWholesalePrice()).isEqualByComparingTo("60");
        assertThat(result.getRetailPrice()).isEqualByComparingTo("150.0");
        assertThat(result.getPlatformCommission()).isEqualByComparingTo("22.500");
        assertThat(result.getMerchantBrandName()).isEqualTo("Amy's Brand");
        assertThat(result.getMerchantLogoUrl()).isEqualTo("https://logo.example.com/amy.png");
        assertThat(result.getMerchantProductTitle()).isEqualTo("Leather Bag");
        assertThat(result.getMerchantDescription()).isEqualTo("Handcrafted bag");
        assertThat(result.getLabelType()).isEqualTo(LabelType.LEATHER_PATCH);
        assertThat(result.isPublished()).isFalse();
        assertThat(result.getSlug()).startsWith("amy-s-brand-leather-bag-");
    }

    @Test
    void customize_shouldFallBackTo60PercentOfPrice_whenNoWholesalePriceOnBase() {
        Product base = Product.builder()
                .id(2L)
                .title("Leather Belt")
                .description("desc")
                .price(BigDecimal.valueOf(80))
                .wholesalePrice(null)
                .inventory(5)
                .slug("leather-belt")
                .build();
        when(productRepository.findById(2L)).thenReturn(Optional.of(base));
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.of(merchantProfile()));
        when(customizedProductRepository.save(any(CustomizedProduct.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CustomizeRequest request = new CustomizeRequest(
                "Custom Belt", "Custom desc", "https://logo.example.com/custom.png",
                "METAL_PLATE", "gold", "red", "Engrave Me", "handle with care", 120.0);

        CustomizedProduct result = brandingService.customize(2L, request, merchantUser());

        // 80 * 0.6 = 48
        assertThat(result.getWholesalePrice()).isEqualByComparingTo("48.0");
        assertThat(result.getRetailPrice()).isEqualByComparingTo("120.0");
        assertThat(result.getPlatformCommission()).isEqualByComparingTo("18.000");
        assertThat(result.getMerchantProductTitle()).isEqualTo("Custom Belt");
        assertThat(result.getMerchantDescription()).isEqualTo("Custom desc");
        assertThat(result.getMerchantLogoUrl()).isEqualTo("https://logo.example.com/custom.png");
        assertThat(result.getLabelType()).isEqualTo(LabelType.METAL_PLATE);
        assertThat(result.getThreadColor()).isEqualTo("gold");
        assertThat(result.getLiningColor()).isEqualTo("red");
        assertThat(result.getEngravingText()).isEqualTo("Engrave Me");
        assertThat(result.getCustomNotes()).isEqualTo("handle with care");
    }

    @Test
    void customize_shouldThrowResourceNotFoundException_whenBaseProductMissing() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        CustomizeRequest request = new CustomizeRequest(
                null, null, null, null, null, null, null, null, 100.0);

        assertThatThrownBy(() -> brandingService.customize(99L, request, merchantUser()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void customize_shouldThrowResourceNotFoundException_whenMerchantProfileMissing() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(baseProductWithWholesalePrice()));
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.empty());

        CustomizeRequest request = new CustomizeRequest(
                null, null, null, null, null, null, null, null, 100.0);

        assertThatThrownBy(() -> brandingService.customize(1L, request, merchantUser()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Merchant profile not found");
    }

    @Test
    void publish_shouldSetPublishedTrue_whenOwnedByMerchant() {
        MerchantProfile profile = merchantProfile();
        CustomizedProduct cp = CustomizedProduct.builder().id(10L).merchant(profile).published(false).build();

        when(customizedProductRepository.findById(10L)).thenReturn(Optional.of(cp));
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.of(profile));
        when(customizedProductRepository.save(any(CustomizedProduct.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CustomizedProduct result = brandingService.publish(10L, merchantUser());

        assertThat(result.isPublished()).isTrue();
    }

    @Test
    void publish_shouldThrowIllegalArgumentException_whenNotOwnedByMerchant() {
        MerchantProfile owner = MerchantProfile.builder().id(999L).brandName("Other").build();
        MerchantProfile requester = merchantProfile();
        CustomizedProduct cp = CustomizedProduct.builder().id(10L).merchant(owner).published(false).build();

        when(customizedProductRepository.findById(10L)).thenReturn(Optional.of(cp));
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.of(requester));

        assertThatThrownBy(() -> brandingService.publish(10L, merchantUser()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Access denied");
    }

    @Test
    void publish_shouldThrowResourceNotFoundException_whenCustomizedProductMissing() {
        when(customizedProductRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> brandingService.publish(404L, merchantUser()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void unpublish_shouldSetPublishedFalse_whenOwnedByMerchant() {
        MerchantProfile profile = merchantProfile();
        CustomizedProduct cp = CustomizedProduct.builder().id(10L).merchant(profile).published(true).build();

        when(customizedProductRepository.findById(10L)).thenReturn(Optional.of(cp));
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.of(profile));
        when(customizedProductRepository.save(any(CustomizedProduct.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CustomizedProduct result = brandingService.unpublish(10L, merchantUser());

        assertThat(result.isPublished()).isFalse();
    }

    @Test
    void getMerchantProducts_shouldThrowResourceNotFoundException_whenProfileMissing() {
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> brandingService.getMerchantProducts(merchantUser(), 0, 12))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getMerchantProducts_shouldDelegateToRepository_whenProfileExists() {
        MerchantProfile profile = merchantProfile();
        when(merchantProfileRepository.findByUserId(5L)).thenReturn(Optional.of(profile));
        when(customizedProductRepository.findByMerchantId(eq(50L), any(Pageable.class)))
                .thenReturn(Page.empty());

        Page<CustomizedProduct> result = brandingService.getMerchantProducts(merchantUser(), 0, 12);

        assertThat(result).isEmpty();
    }

    @Test
    void getPublishedMerchantProducts_shouldDelegateToRepository() {
        when(customizedProductRepository.findByMerchantIdAndPublished(eq(50L), eq(true), any(Pageable.class)))
                .thenReturn(Page.empty());

        Page<CustomizedProduct> result = brandingService.getPublishedMerchantProducts(50L, 0, 12);

        assertThat(result).isEmpty();
    }
}
