package com.sonora.ingestion.api.dto;

import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "BatchPage", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record BatchPage(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<BatchView> items,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1") int page,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", maximum = "100") int pageSize,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long total) {}
