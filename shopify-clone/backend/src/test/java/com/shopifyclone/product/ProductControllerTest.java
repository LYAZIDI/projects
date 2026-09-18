package com.shopifyclone.product;

import com.shopifyclone.domain.product.Product;
import com.shopifyclone.domain.product.ProductStatus;
import com.shopifyclone.exception.ResourceNotFoundException;
import com.shopifyclone.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProductController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private JwtService jwtService;
    @MockBean
    private UserDetailsService userDetailsService;

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
    void getProducts_shouldReturn200_withPageOfProducts() throws Exception {
        Page<Product> page = new PageImpl<>(List.of(sampleProduct()));
        when(productService.getActiveProducts(anyInt(), anyInt(), anyString())).thenReturn(page);

        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Leather Wallet"))
                .andExpect(jsonPath("$.content[0].slug").value("leather-wallet"));
    }

    @Test
    void getProducts_shouldUseDefaultPagingParams_whenNoneProvided() throws Exception {
        when(productService.getActiveProducts(0, 12, "createdAt,desc")).thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk());
    }

    @Test
    void getProducts_shouldForwardCustomPagingParams() throws Exception {
        when(productService.getActiveProducts(2, 5, "price,asc")).thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/products").param("page", "2").param("size", "5").param("sort", "price,asc"))
                .andExpect(status().isOk());
    }

    @Test
    void search_shouldReturn200_withMatchingProducts() throws Exception {
        Page<Product> page = new PageImpl<>(List.of(sampleProduct()));
        when(productService.search(eq("wallet"), anyInt(), anyInt())).thenReturn(page);

        mockMvc.perform(get("/api/v1/products/search").param("q", "wallet"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Leather Wallet"));
    }

    @Test
    void search_shouldReturn400_whenQueryParamMissing() throws Exception {
        // GlobalExceptionHandler now has a dedicated MissingServletRequestParameterException
        // handler, so a missing required param responds with 400, not 500.
        mockMvc.perform(get("/api/v1/products/search"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getBySlug_shouldReturn200_whenProductExists() throws Exception {
        when(productService.getBySlug("leather-wallet")).thenReturn(sampleProduct());

        mockMvc.perform(get("/api/v1/products/leather-wallet"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Leather Wallet"));
    }

    @Test
    void getBySlug_shouldReturn404_whenProductDoesNotExist() throws Exception {
        when(productService.getBySlug("missing")).thenThrow(new ResourceNotFoundException("Product not found: missing"));

        mockMvc.perform(get("/api/v1/products/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found: missing"));
    }
}
