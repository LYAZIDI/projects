package com.shopifyclone.branding;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CustomizeRequest(
    String customTitle,
    String customDescription,
    String merchantLogoUrl,
    String labelType,        // LEATHER_PATCH, WOVEN_LABEL, EMBROIDERY, METAL_PLATE, NONE
    String threadColor,
    String liningColor,
    String engravingText,
    String customNotes,
    @NotNull @Min(1) Double retailPrice
) {}
