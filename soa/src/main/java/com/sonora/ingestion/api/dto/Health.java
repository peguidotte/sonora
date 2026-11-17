package com.sonora.ingestion.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "Health", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record Health(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"ok", "unavailable"}) String status) {}
