package com.sonora.ingestion.api.dto;

import java.util.UUID;
import com.sonora.ingestion.api.validation.UnicodeText;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Leitura enviada pelo ESP32/Wokwi. Não há campo origin/location/method: tudo isso é resolvido pela
 * credencial e pelo cadastro do dispositivo. Propriedades desconhecidas são rejeitadas (400).
 */
@Schema(name = "ObservationIngest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
        description = "Simulated device observation. Origin is resolved server-side and cannot be declared.")
public record ObservationIngest(
        @NotNull @UnicodeText(max = 128)
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 128,
                description = "Device-side id; unique per source. Identical retry -> 200 duplicate, different content -> 409.",
                example = "device-request-1")
        String externalId,
        @NotNull
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid",
                description = "Must match the device bound to the API key.", example = "11111111-1111-4111-8111-111111111111")
        UUID deviceId,
        @NotNull @UnicodeText(max = 128)
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 128,
                description = "Collection/boot session; kept across retries.", example = "demo-a-boot-001")
        String sessionId,
        @NotNull @Pattern(regexp = OBSERVED_AT_PATTERN, message = "must be UTC ISO 8601 ending in Z with at most microseconds")
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "date-time", pattern = "Z$",
                description = "UTC instant; at most 5 minutes in the future.", example = "2026-11-08T15:00:00Z")
        String observedAt,
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("3600")
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, exclusiveMinimumValue = 0, maximum = "3600", example = "5")
        Double durationSeconds,
        @NotNull @DecimalMin("0") @DecimalMax("140")
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", maximum = "140",
                description = "Technical validation range in dB(A), not a legal limit.", example = "62.5")
        Double laeqDbA) {

    /** Precisão de microssegundos (timestamptz): mais casas seriam truncadas, então são recusadas. */
    public static final String OBSERVED_AT_PATTERN = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,6})?Z$";
}
