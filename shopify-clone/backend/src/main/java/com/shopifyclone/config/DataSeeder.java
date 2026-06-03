package com.shopifyclone.config;

import com.shopifyclone.domain.artisan.ArtisanProfile;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.product.ProductImage;
import com.shopifyclone.domain.product.ProductStatus;
import com.shopifyclone.domain.store.Store;
import com.shopifyclone.domain.store.StoreStatus;
import com.shopifyclone.domain.user.Role;
import com.shopifyclone.domain.user.User;
import com.shopifyclone.repository.ArtisanProfileRepository;
import com.shopifyclone.repository.MerchantProfileRepository;
import com.shopifyclone.repository.ProductRepository;
import com.shopifyclone.repository.StoreRepository;
import com.shopifyclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ArtisanProfileRepository artisanProfileRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner seedData() {
        return args -> {
            if (userRepository.count() > 0) {
                log.info("Database already seeded, skipping.");
                return;
            }

            log.info("Seeding database with sample data...");

            // Create admin user
            User admin = userRepository.save(User.builder()
                    .firstName("Admin")
                    .lastName("User")
                    .email("admin@shopclone.com")
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.ADMIN)
                    .enabled(true)
                    .build());

            // Create default store
            Store store = storeRepository.save(Store.builder()
                    .name("ShopClone Store")
                    .slug("shopclone-store")
                    .description("The official ShopClone store")
                    .email("store@shopclone.com")
                    .owner(admin)
                    .status(StoreStatus.ACTIVE)
                    .build());

            // Sample products with real Unsplash images
            List<SampleProduct> samples = List.of(
                new SampleProduct("Veste Biker Classique", "veste-biker-classique",
                    "Veste biker en cuir pleine fleur tanné végétal. Coupe ajustée, doublure en soie, finitions à la main.",
                    380.00, 290.00, 520.00, "Atelier Rousseau", "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600"),
                new SampleProduct("Sac à Dos Cuir Vintage", "sac-a-dos-cuir-vintage",
                    "Sac à dos en cuir de buffle naturel. Tannage végétal traditionnel, fermetures laiton vieilli.",
                    220.00, 160.00, null, "Maroquinerie Dubois", "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"),
                new SampleProduct("Ceinture Artisanale Tressée", "ceinture-artisanale-tressee",
                    "Ceinture en cuir tressé à la main, boucle en argent massif. Disponible en plusieurs largeurs.",
                    95.00, 65.00, null, "Atelier Rousseau", "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600"),
                new SampleProduct("Portefeuille Slim Premium", "portefeuille-slim-premium",
                    "Portefeuille ultra-fin en cuir de veau grain croisé. 8 emplacements cartes, protection RFID.",
                    85.00, 55.00, null, "Cuir & Co", "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600"),
                new SampleProduct("Bottines Chelsea Artisan", "bottines-chelsea-artisan",
                    "Bottines Chelsea montées à la main sur semelle Goodyear welted. Cuir box-calf premium, doublure vachette.",
                    420.00, 310.00, null, "Cordonnerie Martin", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"),
                new SampleProduct("Porte-Documents Cuir", "porte-documents-cuir",
                    "Porte-documents en cuir selle naturel patinable. Format A4, soufflets galbés, poignée vintage.",
                    165.00, 115.00, 220.00, "Maroquinerie Dubois", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"),
                new SampleProduct("Gants Conduites Cuir Chevreau", "gants-conduite-chevreau",
                    "Gants de conduite en cuir chevreau ultra-souple. Coutures anglaises, doublure cachemire.",
                    125.00, 80.00, null, "Atelier Rousseau", "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600"),
                new SampleProduct("Sac Cabas Souple", "sac-cabas-souple",
                    "Grand cabas en cuir vachette patinable avec soufflet. Idéal pour l'usage quotidien.",
                    185.00, 130.00, null, "Cuir & Co", "https://images.unsplash.com/photo-1584917865442-de89be371f7a?w=600")
            );

            for (SampleProduct s : samples) {
                Product product = new Product();
                product.setTitle(s.title());
                product.setSlug(s.slug());
                product.setDescription(s.description());
                product.setPrice(BigDecimal.valueOf(s.price()));
                product.setWholesalePrice(BigDecimal.valueOf(s.wholesalePrice()));
                if (s.compareAtPrice() != null) {
                    product.setCompareAtPrice(BigDecimal.valueOf(s.compareAtPrice()));
                }
                product.setInventory(100);
                product.setVendor(s.vendor());
                product.setStatus(ProductStatus.ACTIVE);
                product.setStore(store);

                ProductImage image = new ProductImage();
                image.setUrl(s.imageUrl());
                image.setAltText(s.title());
                image.setPosition(0);
                image.setProduct(product);
                product.getImages().add(image);

                productRepository.save(product);
            }

            // ── Demo artisan user ─────────────────────────────────────────────
            User artisanUser = userRepository.save(User.builder()
                    .firstName("Pierre")
                    .lastName("Rousseau")
                    .email("artisan@leathera.com")
                    .password(passwordEncoder.encode("artisan123"))
                    .role(Role.ARTISAN)
                    .enabled(true)
                    .build());

            artisanProfileRepository.save(ArtisanProfile.builder()
                    .user(artisanUser)
                    .brandName("Atelier Rousseau")
                    .bio("Maroquinier depuis 20 ans dans le Jura. Spécialisé dans le cuir pleine fleur tanné végétal, " +
                         "je fabrique chaque pièce à la main dans mon atelier familial.")
                    .location("Lons-le-Saunier, France")
                    .specialties("Vestes, Sacs, Ceintures, Accessoires")
                    .leatherTypes("Pleine fleur, Cuir tanné végétal, Buffle")
                    .verified(true)
                    .rating(4.9)
                    .reviewCount(124)
                    .totalSales(850)
                    .commissionRate(0.15)
                    .build());

            // ── Demo merchant user ────────────────────────────────────────────
            User merchantUser = userRepository.save(User.builder()
                    .firstName("Sophie")
                    .lastName("Martin")
                    .email("merchant@leathera.com")
                    .password(passwordEncoder.encode("merchant123"))
                    .role(Role.MERCHANT)
                    .enabled(true)
                    .build());

            merchantProfileRepository.save(MerchantProfile.builder()
                    .user(merchantUser)
                    .brandName("MaisonCuir Paris")
                    .description("Boutique parisienne spécialisée dans la maroquinerie de luxe white-label.")
                    .build());

            log.info("Seeding complete! {} products created.", samples.size());
            log.info("Admin login: admin@shopclone.com / admin123");
            log.info("Artisan login: artisan@leathera.com / artisan123");
            log.info("Merchant login: merchant@leathera.com / merchant123");
        };
    }

    private record SampleProduct(
        String title, String slug, String description,
        double price, double wholesalePrice, Double compareAtPrice, String vendor, String imageUrl
    ) {}
}
