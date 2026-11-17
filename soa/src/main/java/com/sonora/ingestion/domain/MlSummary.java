package com.sonora.ingestion.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Immutable;

/** Artefato summary.json do ML, já validado pelo schema compartilhado. O Java não executa modelos. */
@Entity
@Immutable
@Table(name = "ml_summaries")
public class MlSummary extends AssignedIdEntity {
    @Id
    private UUID id;
    @Column(name = "model_version", nullable = false)
    private String modelVersion;
    @Column(name = "dataset_sha256", nullable = false)
    private String datasetSha256;
    @ColumnTransformer(write = "?::jsonb")
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MlSummary() {}

    public MlSummary(String modelVersion, String datasetSha256, String payloadJson, Instant createdAt) {
        this.id = UUID.randomUUID();
        this.modelVersion = Objects.requireNonNull(modelVersion);
        this.datasetSha256 = Objects.requireNonNull(datasetSha256);
        this.payload = Objects.requireNonNull(payloadJson);
        this.createdAt = Objects.requireNonNull(createdAt);
    }

    @Override
    public UUID getId() { return id; }
    public String getModelVersion() { return modelVersion; }
    public String getDatasetSha256() { return datasetSha256; }
    public String getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
}
