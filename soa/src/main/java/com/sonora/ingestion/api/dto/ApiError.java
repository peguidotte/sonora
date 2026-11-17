package com.sonora.ingestion.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Erro sanitizado em inglês: sem stack trace, SQL, valores recebidos ou detalhes de conexão. */
@Schema(name = "Error", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record ApiError(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "invalid_request") String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Invalid request.") String message) {}
