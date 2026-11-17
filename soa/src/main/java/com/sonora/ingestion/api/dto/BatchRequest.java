package com.sonora.ingestion.api.dto;

import com.sonora.ingestion.api.validation.UnicodeText;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Somente um identificador permitido no servidor; nunca URL ou caminho de arquivo. */
@Schema(name = "BatchRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record BatchRequest(
        @NotNull @UnicodeText(max = 128)
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 128,
                description = "Allowed server-side file id (SONORA_IMPORTS_FILE).", example = "noisecapture-sp-2026-11-08")
        String fileId) {}
