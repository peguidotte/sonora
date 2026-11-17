package com.sonora.ingestion.api.dto;

import java.util.UUID;
import com.sonora.ingestion.domain.ImportBatch;
import io.swagger.v3.oas.annotations.media.Schema;

/** Estado e contadores persistidos. acceptedCount = observações commitadas; duplicatas não somam. */
@Schema(name = "Batch", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record BatchView(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid") UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 128) String fileId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid") UUID sourceId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, pattern = "^[0-9a-f]{64}$") String fileSha256,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                allowableValues = {"created", "processing", "completed", "completed_with_errors", "failed"})
        String status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") int acceptedCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") int duplicateCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") int rejectedCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "date-time", pattern = "Z$") String createdAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "date-time", nullable = true,
                types = {"string", "null"}) String completedAt) {

    public static BatchView of(ImportBatch batch) {
        return new BatchView(batch.getId(), batch.getFileId(), batch.getSourceId(), batch.getFileSha256(),
                batch.getStatus().wire(), batch.getAcceptedCount(), batch.getDuplicateCount(), batch.getRejectedCount(),
                batch.getCreatedAt().toString(), batch.getCompletedAt() == null ? null : batch.getCompletedAt().toString());
    }
}
