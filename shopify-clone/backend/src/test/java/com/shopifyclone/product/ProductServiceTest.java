package com.shopifyclone.product;

import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.product.ProductStatus;
import com.shopifyclone.exception.ResourceNotFoundException;
import com.shopifyclone.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductService productService;

    private Product sampleProduct() {
        return Product.builder()
                .id(1L)
                .title("Leather Wallet")
                .description("Handmade")
                .price(BigDecimal.valueOf(50))
                .inventory(10)
                .slug("leather-wallet")
                .status(ProductStatus.ACTIVE)
                .build();
    }

    @Test
    void getActiveProducts_shouldUseDescendingSort_byDefault() {
        Page<Product> page = new PageImpl<>(List.of(sampleProduct()));
        when(productRepository.findByStatus(eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(page);

        Page<Product> result = productService.getActiveProducts(0, 12, "createdAt,desc");

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findByStatus(eq(ProductStatus.ACTIVE), pageableCaptor.capture());
        Pageable used = pageableCaptor.getValue();

        assertThat(used.getPageNumber()).isEqualTo(0);
        assertThat(used.getPageSize()).isEqualTo(12);
        Sort.Order order = used.getSort().getOrderFor("createdAt");
        assertThat(order).isNotNull();
        assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getActiveProducts_shouldUseAscendingSort_whenRequested() {
        when(productRepository.findByStatus(eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(Page.empty());

        productService.getActiveProducts(2, 5, "price,asc");

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findByStatus(eq(ProductStatus.ACTIVE), pageableCaptor.capture());
        Pageable used = pageableCaptor.getValue();

        assertThat(used.getPageNumber()).isEqualTo(2);
        assertThat(used.getPageSize()).isEqualTo(5);
        Sort.Order order = used.getSort().getOrderFor("price");
        assertThat(order.getDirection()).isEqualTo(Sort.Direction.ASC);
    }

    @Test
    void getActiveProducts_shouldDefaultToDescending_whenSortFieldHasNoDirection() {
        when(productRepository.findByStatus(eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(Page.empty());

        productService.getActiveProducts(0, 12, "title");

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findByStatus(eq(ProductStatus.ACTIVE), pageableCaptor.capture());
        Sort.Order order = pageableCaptor.getValue().getSort().getOrderFor("title");
        assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void getBySlug_shouldReturnProduct_whenFound() {
        when(productRepository.findBySlug("leather-wallet")).thenReturn(Optional.of(sampleProduct()));

        Product result = productService.getBySlug("leather-wallet");

        assertThat(result.getTitle()).isEqualTo("Leather Wallet");
    }

    @Test
    void getBySlug_shouldThrowResourceNotFoundException_whenProductDoesNotExist() {
        when(productRepository.findBySlug("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getBySlug("missing"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("missing");
    }

    @Test
    void search_shouldDelegateToRepository() {
        Page<Product> page = new PageImpl<>(List.of(sampleProduct()));
        when(productRepository.search(eq("wallet"), any(Pageable.class))).thenReturn(page);

        Page<Product> result = productService.search("wallet", 0, 12);

        assertThat(result.getContent()).hasSize(1);
        verify(productRepository).search(eq("wallet"), eq(PageRequest.of(0, 12)));
    }

    @Test
    void create_shouldSaveAndReturnProduct() {
        Product toCreate = sampleProduct();
        when(productRepository.save(toCreate)).thenReturn(toCreate);

        Product result = productService.create(toCreate);

        assertThat(result).isEqualTo(toCreate);
        verify(productRepository).save(toCreate);
    }

    @Test
    void update_shouldModifyMutableFields_andPersist_whenProductExists() {
        Product existing = sampleProduct();
        Product updates = Product.builder()
                .title("New Title")
                .description("New description")
                .price(BigDecimal.valueOf(75))
                .compareAtPrice(BigDecimal.valueOf(100))
                .inventory(3)
                .status(ProductStatus.ARCHIVED)
                .build();

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        Product result = productService.update(1L, updates);

        assertThat(result.getTitle()).isEqualTo("New Title");
        assertThat(result.getDescription()).isEqualTo("New description");
        assertThat(result.getPrice()).isEqualByComparingTo("75");
        assertThat(result.getCompareAtPrice()).isEqualByComparingTo("100");
        assertThat(result.getInventory()).isEqualTo(3);
        assertThat(result.getStatus()).isEqualTo(ProductStatus.ARCHIVED);
        // slug/id/sku are not touched by update()
        assertThat(result.getSlug()).isEqualTo("leather-wallet");
    }

    @Test
    void update_shouldThrowResourceNotFoundException_whenProductDoesNotExist() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.update(99L, sampleProduct()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");

        verify(productRepository, never()).save(any());
    }

    @Test
    void delete_shouldDelegateToRepository() {
        productService.delete(1L);

        verify(productRepository).deleteById(1L);
    }
}
