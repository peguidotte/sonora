package com.sonora.ingestion.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Job de importação de um arquivo público permitido. Os contadores só avançam junto com o commit
 * das observações do mesmo trecho: acceptedCount = linhas efetivamente persistidas no PostgreSQL.
 */
@Entity
@Table(name = "import_batches")
public class ImportBatch extends AssignedIdEntity {
    @Id
    private UUID id;
    @Column(name = "file_id", nullable = false, updatable = false)
    private String fileId;
    @Column(name = "source_id", nullable = false, updatable = false)
    private UUID sourceId;
    @Column(name = "file_sha256", nullable = false, updatable = false)
    private String fileSha256;
    @Column(nullable = false)
    private BatchStatus status;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "accepted_count", nullable = false)
    private int acceptedCount;
    @Column(name = "duplicate_count", nullable = false)
    private int duplicateCount;
    @Column(name = "rejected_count", nullable = false)
    private int rejectedCount;
    @Column(name = "error_count", nullable = false)
    private int errorCount;
    @Convert(converter = IssuesJson.class)
    @ColumnTransformer(write = "?::jsonb")
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<BatchIssue> errors = List.of();

    protected ImportBatch() {}

    /** Importação síncrona: o lote nasce em processing, com hash do arquivo já calculado. */
    public static ImportBatch start(String fileId, UUID sourceId, String fileSha256, Instant now) {
        if (fileSha256 == null || !fileSha256.matches("[0-9a-f]{64}")) throw new IllegalArgumentException("Invalid SHA-256.");
        var batch = new ImportBatch();
        batch.id = UUID.randomUUID();
        batch.fileId = Objects.requireNonNull(fileId);
        batch.sourceId = Objects.requireNonNull(sourceId);
        batch.fileSha256 = fileSha256;
        batch.status = BatchStatus.PROCESSING;
        batch.createdAt = now;
        batch.startedAt = now;
        return batch;
    }

    /** Registra um trecho já gravado na mesma transação. */
    public void record(int accepted, int duplicates, int rejected, int malformed, List<BatchIssue> issues) {
        requireOpen();
        if (accepted < 0 || duplicates < 0 || rejected < 0 || malformed < 0) throw new IllegalArgumentException();
        acceptedCount = Math.addExact(acceptedCount, accepted);
        duplicateCount = Math.addExact(duplicateCount, duplicates);
        rejectedCount = Math.addExact(rejectedCount, rejected);
        errorCount = Math.addExact(errorCount, malformed);
        errors = BatchIssue.merge(errors, issues);
    }

    public void complete(Instant now) {
        requireOpen();
        status = errorCount > 0 ? BatchStatus.COMPLETED_WITH_ERRORS : BatchStatus.COMPLETED;
        completedAt = now;
    }

    /** Falha não apaga o que já foi commitado: contadores continuam refletindo o banco. */
    public void fail(String code, Instant now) {
        requireOpen();
        errors = BatchIssue.merge(errors, List.of(new BatchIssue(BatchIssue.FAILURE, code, 1, -1)));
        status = BatchStatus.FAILED;
        completedAt = now;
    }

    private void requireOpen() {
        if (status.terminal()) throw new IllegalStateException("Batch already finished.");
    }

    @Override
    public UUID getId() { return id; }
    public String getFileId() { return fileId; }
    public UUID getSourceId() { return sourceId; }
    public String getFileSha256() { return fileSha256; }
    public BatchStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public int getAcceptedCount() { return acceptedCount; }
    public int getDuplicateCount() { return duplicateCount; }
    public int getRejectedCount() { return rejectedCount; }
    public int getErrorCount() { return errorCount; }
    public List<BatchIssue> getErrors() { return errors; }

    /** jsonb <-> lista de motivos; persistido como texto JSON convertido no SQL. */
    public static class IssuesJson implements AttributeConverter<List<BatchIssue>, String> {
        private static final JsonMapper JSON = JsonMapper.builder().build();

        @Override
        public String convertToDatabaseColumn(List<BatchIssue> issues) {
            return JSON.writeValueAsString(issues == null ? List.of() : issues);
        }

        @Override
        public List<BatchIssue> convertToEntityAttribute(String value) {
            return value == null ? List.of() : List.copyOf(JSON.readValue(value, new TypeReference<List<BatchIssue>>() {}));
        }
    }
}
