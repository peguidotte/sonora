package com.sonora.ingestion.api.dto;

import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "IngestResult", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record IngestResult(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid") UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "true when an identical retry was already stored")
        boolean duplicate,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = "simulated") String origin) {}
