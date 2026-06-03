package com.shopifyclone.branding;

import com.shopifyclone.domain.branding.CustomizedProduct;
import com.shopifyclone.domain.branding.LabelType;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.exception.ResourceNotFoundException;
import com.shopifyclone.repository.CustomizedProductRepository;
import com.shopifyclone.repository.MerchantProfileRepository;
import com.shopifyclone.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class BrandingService {

    private final CustomizedProductRepository customizedProductRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final ProductRepository productRepository;

    @Transactional
    public CustomizedProduct customize(Long baseProductId, CustomizeRequest request, User merchantUser) {
        Product base = productRepository.findById(baseProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", baseProductId));

        MerchantProfile merchant = merchantProfileRepository.findByUserId(merchantUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Merchant profile not found"));

        // Calculate commission (15% of retail price)
        BigDecimal retail = BigDecimal.valueOf(request.retailPrice());
        BigDecimal wholesale = base.getWholesalePrice() != null ? base.getWholesalePrice() : base.getPrice().multiply(BigDecimal.valueOf(0.6));
        BigDecimal commission = retail.multiply(BigDecimal.valueOf(0.15));

        CustomizedProduct cp = CustomizedProduct.builder()
                .baseProduct(base)
                .merchant(merchant)
                .merchantBrandName(merchant.getBrandName())
                .merchantLogoUrl(request.merchantLogoUrl() != null ? request.merchantLogoUrl() : merchant.getBrandLogoUrl())
                .merchantProductTitle(request.customTitle() != null ? request.customTitle() : base.getTitle())
                .merchantDescription(request.customDescription() != null ? request.customDescription() : base.getDescription())
                .labelType(request.labelType() != null ? LabelType.valueOf(request.labelType()) : LabelType.LEATHER_PATCH)
                .threadColor(request.threadColor())
                .liningColor(request.liningColor())
                .engravingText(request.engravingText())
                .customNotes(request.customNotes())
                .wholesalePrice(wholesale)
                .retailPrice(retail)
                .platformCommission(commission)
                .slug(slugify(merchant.getBrandName() + "-" + base.getTitle() + "-" + System.currentTimeMillis()))
                .published(false)
                .build();

        return customizedProductRepository.save(cp);
    }

    @Transactional
    public CustomizedProduct publish(Long customizedProductId, User merchantUser) {
        CustomizedProduct cp = getForMerchant(customizedProductId, merchantUser);
        cp.setPublished(true);
        return customizedProductRepository.save(cp);
    }

    @Transactional
    public CustomizedProduct unpublish(Long customizedProductId, User merchantUser) {
        CustomizedProduct cp = getForMerchant(customizedProductId, merchantUser);
        cp.setPublished(false);
        return customizedProductRepository.save(cp);
    }

    public Page<CustomizedProduct> getMerchantProducts(User merchantUser, int page, int size) {
        MerchantProfile merchant = merchantProfileRepository.findByUserId(merchantUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Merchant profile not found"));
        return customizedProductRepository.findByMerchantId(merchant.getId(), PageRequest.of(page, size));
    }

    public Page<CustomizedProduct> getPublishedMerchantProducts(Long merchantId, int page, int size) {
        return customizedProductRepository.findByMerchantIdAndPublished(merchantId, true, PageRequest.of(page, size));
    }

    private CustomizedProduct getForMerchant(Long id, User user) {
        CustomizedProduct cp = customizedProductRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customized product", id));
        MerchantProfile merchant = merchantProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Merchant profile not found"));
        if (!cp.getMerchant().getId().equals(merchant.getId())) {
            throw new IllegalArgumentException("Access denied");
        }
        return cp;
    }

    private String slugify(String input) {
        return Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }
}
