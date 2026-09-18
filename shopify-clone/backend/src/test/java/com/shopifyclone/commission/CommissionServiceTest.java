package com.shopifyclone.commission;

import com.shopifyclone.domain.artisan.ArtisanProfile;
import com.shopifyclone.domain.commission.Commission;
import com.shopifyclone.domain.commission.CommissionStatus;
import com.shopifyclone.domain.merchant.MerchantProfile;
import com.shopifyclone.domain.order.Order;
import com.shopifyclone.repository.ArtisanProfileRepository;
import com.shopifyclone.repository.CommissionRepository;
import com.shopifyclone.repository.MerchantProfileRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Transfer;
import com.stripe.param.TransferCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommissionServiceTest {

    @Mock
    private CommissionRepository commissionRepository;
    @Mock
    private ArtisanProfileRepository artisanProfileRepository;
    @Mock
    private MerchantProfileRepository merchantProfileRepository;

    @InjectMocks
    private CommissionService commissionService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(commissionService, "stripeSecretKey", "sk_test_fake");
    }

    private ArtisanProfile artisanWithStripeAccount(String accountId) {
        return ArtisanProfile.builder()
                .id(10L)
                .brandName("Atlas Leather")
                .commissionRate(0.15)
                .stripeAccountId(accountId)
                .rating(4.5)
                .reviewCount(3)
                .build();
    }

    @Test
    void calculateAndCreate_shouldComputePlatformAmountAndMerchantProfit() {
        Order order = Order.builder().id(1L).build();
        ArtisanProfile artisan = artisanWithStripeAccount("acct_123");
        MerchantProfile merchant = MerchantProfile.builder().id(20L).brandName("Merch Co").build();

        when(artisanProfileRepository.findByUserId(100L)).thenReturn(Optional.of(artisan));
        when(merchantProfileRepository.findByUserId(200L)).thenReturn(Optional.of(merchant));
        when(commissionRepository.save(any(Commission.class))).thenAnswer(inv -> inv.getArgument(0));

        Commission result = commissionService.calculateAndCreate(
                order, 100L, 200L, BigDecimal.valueOf(100), BigDecimal.valueOf(60));

        // platformAmount = 100 * 0.15 = 15.00
        // merchantProfit = 100 - 60 - 15 = 25.00
        assertThat(result.getPlatformAmount()).isEqualByComparingTo("15.00");
        assertThat(result.getMerchantProfit()).isEqualByComparingTo("25.00");
        assertThat(result.getCommissionRate()).isEqualTo(0.15);
        assertThat(result.getStatus()).isEqualTo(CommissionStatus.CALCULATED);
        assertThat(result.getArtisan()).isEqualTo(artisan);
        assertThat(result.getMerchant()).isEqualTo(merchant);
    }

    @Test
    void calculateAndCreate_shouldToleratesMissingArtisanOrMerchantProfiles() {
        Order order = Order.builder().id(1L).build();
        when(artisanProfileRepository.findByUserId(100L)).thenReturn(Optional.empty());
        when(merchantProfileRepository.findByUserId(200L)).thenReturn(Optional.empty());
        when(commissionRepository.save(any(Commission.class))).thenAnswer(inv -> inv.getArgument(0));

        Commission result = commissionService.calculateAndCreate(
                order, 100L, 200L, BigDecimal.valueOf(50), BigDecimal.valueOf(20));

        assertThat(result.getArtisan()).isNull();
        assertThat(result.getMerchant()).isNull();
        assertThat(result.getPlatformAmount()).isEqualByComparingTo("7.50");
    }

    @Test
    void transferToArtisan_shouldSkipTransfer_whenArtisanHasNoStripeAccount() {
        Commission commission = Commission.builder()
                .id(1L)
                .artisan(ArtisanProfile.builder().id(10L).stripeAccountId(null).build())
                .wholesaleAmount(BigDecimal.valueOf(60))
                .status(CommissionStatus.CALCULATED)
                .build();
        when(commissionRepository.findById(1L)).thenReturn(Optional.of(commission));

        Commission result = commissionService.transferToArtisan(1L);

        assertThat(result.getStatus()).isEqualTo(CommissionStatus.CALCULATED);
        verify(commissionRepository, never()).save(any());
    }

    @Test
    void transferToArtisan_shouldSkipTransfer_whenArtisanIsNull() {
        Commission commission = Commission.builder()
                .id(1L)
                .artisan(null)
                .status(CommissionStatus.CALCULATED)
                .build();
        when(commissionRepository.findById(1L)).thenReturn(Optional.of(commission));

        Commission result = commissionService.transferToArtisan(1L);

        assertThat(result.getStatus()).isEqualTo(CommissionStatus.CALCULATED);
        verify(commissionRepository, never()).save(any());
    }

    @Test
    void transferToArtisan_shouldThrowRuntimeException_whenCommissionDoesNotExist() {
        when(commissionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commissionService.transferToArtisan(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Commission not found");
    }

    @Test
    void transferToArtisan_shouldMarkTransferred_whenStripeTransferSucceeds() throws StripeException {
        Commission commission = Commission.builder()
                .id(1L)
                .artisan(artisanWithStripeAccount("acct_123"))
                .wholesaleAmount(BigDecimal.valueOf(60))
                .status(CommissionStatus.CALCULATED)
                .build();
        when(commissionRepository.findById(1L)).thenReturn(Optional.of(commission));
        when(commissionRepository.save(any(Commission.class))).thenAnswer(inv -> inv.getArgument(0));

        Transfer fakeTransfer = new Transfer();
        fakeTransfer.setId("tr_123");

        try (MockedStatic<Transfer> transferMock = mockStatic(Transfer.class)) {
            transferMock.when(() -> Transfer.create(any(TransferCreateParams.class))).thenReturn(fakeTransfer);

            Commission result = commissionService.transferToArtisan(1L);

            assertThat(result.getStatus()).isEqualTo(CommissionStatus.TRANSFERRED);
            assertThat(result.getStripeTransferId()).isEqualTo("tr_123");
            assertThat(result.getPaidAt()).isNotNull();

            ArgumentCaptor<TransferCreateParams> paramsCaptor = ArgumentCaptor.forClass(TransferCreateParams.class);
            transferMock.verify(() -> Transfer.create(paramsCaptor.capture()));
            assertThat(paramsCaptor.getValue().getAmount()).isEqualTo(6000L);
            assertThat(paramsCaptor.getValue().getDestination()).isEqualTo("acct_123");
        }
    }

    @Test
    void transferToArtisan_shouldMarkFailed_whenStripeThrowsException() throws StripeException {
        Commission commission = Commission.builder()
                .id(1L)
                .artisan(artisanWithStripeAccount("acct_123"))
                .wholesaleAmount(BigDecimal.valueOf(60))
                .status(CommissionStatus.CALCULATED)
                .build();
        when(commissionRepository.findById(1L)).thenReturn(Optional.of(commission));
        when(commissionRepository.save(any(Commission.class))).thenAnswer(inv -> inv.getArgument(0));

        try (MockedStatic<Transfer> transferMock = mockStatic(Transfer.class)) {
            transferMock.when(() -> Transfer.create(any(TransferCreateParams.class)))
                    .thenThrow(new com.stripe.exception.ApiConnectionException("network down"));

            Commission result = commissionService.transferToArtisan(1L);

            assertThat(result.getStatus()).isEqualTo(CommissionStatus.FAILED);
        }
    }

    @Test
    void getArtisanStats_shouldReturnStatsFromRepository() {
        ArtisanProfile artisan = artisanWithStripeAccount(null);
        when(artisanProfileRepository.findByUserId(100L)).thenReturn(Optional.of(artisan));
        when(commissionRepository.getTotalEarningsByArtisan(10L)).thenReturn(BigDecimal.valueOf(500));
        Page<Commission> page = new PageImpl<>(List.of(Commission.builder().build(), Commission.builder().build()));
        when(commissionRepository.findByArtisanId(eq(10L), any(Pageable.class))).thenReturn(page);

        CommissionService.RevenueStats stats = commissionService.getArtisanStats(100L);

        assertThat(stats.name()).isEqualTo("Atlas Leather");
        assertThat(stats.totalRevenue()).isEqualByComparingTo("500");
        assertThat(stats.totalOrders()).isEqualTo(2);
        assertThat(stats.rating()).isEqualTo(4.5);
        assertThat(stats.reviewCount()).isEqualTo(3);
    }

    @Test
    void getArtisanStats_shouldThrowRuntimeException_whenArtisanNotFound() {
        when(artisanProfileRepository.findByUserId(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commissionService.getArtisanStats(100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Artisan not found");
    }

    @Test
    void getMerchantStats_shouldReturnStatsFromRepository() {
        MerchantProfile merchant = MerchantProfile.builder().id(20L).brandName("Merch Co").build();
        when(merchantProfileRepository.findByUserId(200L)).thenReturn(Optional.of(merchant));
        when(commissionRepository.getTotalProfitByMerchant(20L)).thenReturn(BigDecimal.valueOf(300));
        Page<Commission> page = new PageImpl<>(List.of(Commission.builder().build()));
        when(commissionRepository.findByMerchantId(eq(20L), any(Pageable.class))).thenReturn(page);

        CommissionService.RevenueStats stats = commissionService.getMerchantStats(200L);

        assertThat(stats.name()).isEqualTo("Merch Co");
        assertThat(stats.totalRevenue()).isEqualByComparingTo("300");
        assertThat(stats.totalOrders()).isEqualTo(1);
        assertThat(stats.rating()).isEqualTo(0.0);
        assertThat(stats.reviewCount()).isEqualTo(0);
    }

    @Test
    void getMerchantStats_shouldThrowRuntimeException_whenMerchantNotFound() {
        when(merchantProfileRepository.findByUserId(200L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commissionService.getMerchantStats(200L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Merchant not found");
    }

    @Test
    void getPlatformRevenue_shouldDelegateToRepository() {
        when(commissionRepository.getTotalPlatformRevenue()).thenReturn(BigDecimal.valueOf(1000));

        BigDecimal result = commissionService.getPlatformRevenue();

        assertThat(result).isEqualByComparingTo("1000");
    }

    @Test
    void getArtisanCommissions_shouldThrowRuntimeException_whenArtisanNotFound() {
        when(artisanProfileRepository.findByUserId(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commissionService.getArtisanCommissions(100L, 0, 10))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Artisan not found");
    }

    @Test
    void getMerchantCommissions_shouldThrowRuntimeException_whenMerchantNotFound() {
        when(merchantProfileRepository.findByUserId(200L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commissionService.getMerchantCommissions(200L, 0, 10))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Merchant not found");
    }
}
