package com.sonora.ingestion.imports;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.sonora.ingestion.api.ApiException;
import com.sonora.ingestion.domain.BatchIssue;
import com.sonora.ingestion.domain.ImportBatch;
import com.sonora.ingestion.domain.Observation;
import com.sonora.ingestion.domain.ObservationMethod;
import com.sonora.ingestion.domain.Origin;
import com.sonora.ingestion.domain.Source;
import com.sonora.ingestion.imports.ImportCatalog.AllowedFile;
import com.sonora.ingestion.imports.NoiseCapturePoint.Accepted;
import com.sonora.ingestion.imports.NoiseCapturePoint.Candidate;
import com.sonora.ingestion.imports.NoiseCapturePoint.Decision;
import com.sonora.ingestion.imports.NoiseCapturePoint.Malformed;
import com.sonora.ingestion.imports.NoiseCapturePoint.Rejected;
import com.sonora.ingestion.repository.ImportBatchRepository;
import com.sonora.ingestion.repository.LocationRepository;
import com.sonora.ingestion.repository.ObservationRepository;
import com.sonora.ingestion.repository.SourceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Importação síncrona de um arquivo permitido. O lote é criado em processing; cada trecho de pontos é
 * gravado numa transação junto com o avanço dos contadores, então acceptedCount sempre corresponde a
 * linhas commitadas, inclusive se o processamento falhar no meio. Reimportar não duplica observações.
 */
@Service
public class BatchImportService {
    static final int CHUNK_SIZE = 500;
    private static final Logger log = LoggerFactory.getLogger(BatchImportService.class);

    private final ImportCatalog catalog;
    private final SourceRepository sources;
    private final LocationRepository locations;
    private final ObservationRepository observations;
    private final ImportBatchRepository batches;
    private final TransactionTemplate transaction;
    private final Clock clock;
    private final GeoJsonFeatureReader reader = new GeoJsonFeatureReader();

    public BatchImportService(ImportCatalog catalog, SourceRepository sources, LocationRepository locations,
                              ObservationRepository observations, ImportBatchRepository batches,
                              TransactionTemplate transaction, Clock clock) {
        this.catalog = catalog;
        this.sources = sources;
        this.locations = locations;
        this.observations = observations;
        this.batches = batches;
        this.transaction = transaction;
        this.clock = clock;
    }

    public ImportBatch importFile(String fileId) {
        AllowedFile file = catalog.find(fileId).orElseThrow(() -> ApiException.notFound("Unknown fileId."));
        Source source = sources.findById(file.sourceId()).filter(s -> s.getOrigin() == Origin.PUBLIC_DATASET)
                .orElseThrow(() -> ApiException.unprocessable("source_not_importable",
                        "Configured source is missing or is not a public dataset."));
        String expectedSha;
        try {
            if (!Files.isRegularFile(file.path(), LinkOption.NOFOLLOW_LINKS)) throw new IOException("not a regular file");
            expectedSha = sha256(file.path());
        } catch (IOException unavailable) {
            throw ApiException.unprocessable("file_unavailable", "Allowed file is missing or unreadable.");
        }
        Instant startedAt = now();
        UUID batchId = transaction.execute(s -> batches.save(ImportBatch.start(fileId, source.getId(), expectedSha, startedAt))).getId();
        var matcher = LocationMatcher.of(locations.findAll(), file.maxDistanceMeters());
        Instant latestAllowed = startedAt.plus(5, ChronoUnit.MINUTES);
        var chunk = new Chunk();
        try (InputStream raw = Files.newInputStream(file.path(), LinkOption.NOFOLLOW_LINKS);
             DigestInputStream input = new DigestInputStream(new BufferedInputStream(raw), digest())) {
            try {
                reader.read(input, (feature, index) -> {
                    chunk.add(index, NoiseCapturePoint.evaluate(feature, matcher, file.maxDistanceMeters(), latestAllowed));
                    if (chunk.size() >= CHUNK_SIZE) flush(batchId, source, file, chunk);
                });
            } catch (GeoJsonFeatureReader.MalformedFileException malformed) {
                flush(batchId, source, file, chunk); // Decisões já avaliadas antes do ponto inválido.
                return finish(batchId, "malformed_file");
            }
            flush(batchId, source, file, chunk);
            input.transferTo(OutputStream.nullOutputStream());
            String readSha = HexFormat.of().formatHex(input.getMessageDigest().digest());
            return finish(batchId, readSha.equals(expectedSha) ? null : "file_changed_during_import");
        } catch (IOException readFailure) {
            return finish(batchId, "file_read_error");
        } catch (RuntimeException processingFailure) {
            log.error("Import {} failed: {}", batchId, processingFailure.getClass().getName());
            return finish(batchId, "processing_error");
        }
    }

    /** Grava o trecho e avança os contadores na MESMA transação. */
    private void flush(UUID batchId, Source source, AllowedFile file, Chunk chunk) {
        if (chunk.size() == 0) return;
        transaction.executeWithoutResult(status -> {
            ImportBatch batch = batches.findById(batchId).orElseThrow();
            int accepted = 0;
            int duplicates = 0;
            int conflicts = 0;
            Instant receivedAt = now();
            for (IndexedCandidate item : chunk.accepted) {
                Candidate c = item.candidate();
                Observation candidate = Observation.fromImport(batchId, source, c.locationId(), c.distanceMeters(),
                        c.producerId(), c.externalId(), c.sessionId(), c.observedAt(), NoiseCapturePoint.DURATION_SECONDS,
                        c.laeqDbA(), ObservationMethod.NOISECAPTURE_1S, file.calibrationStatus(), receivedAt);
                var existing = observations.findBySourceIdAndExternalId(source.getId(), candidate.getExternalId());
                if (existing.isEmpty()) {
                    observations.save(candidate);
                    accepted++;
                } else if (existing.get().sameMeasurementAs(candidate)) {
                    duplicates++;
                } else {
                    // Mesmo track + segundo com leitura diferente (ocorre no dump): o primeiro prevalece.
                    conflicts++;
                    chunk.issue(BatchIssue.REJECTED, NoiseCapturePoint.CONFLICTING_DUPLICATE, item.index());
                }
            }
            observations.flush();
            batch.record(accepted, duplicates, chunk.rejected + conflicts, chunk.malformed, chunk.issues());
        });
        chunk.clear();
    }

    private ImportBatch finish(UUID batchId, String failureCode) {
        return transaction.execute(status -> {
            ImportBatch batch = batches.findById(batchId).orElseThrow();
            if (failureCode == null) batch.complete(now());
            else batch.fail(failureCode, now());
            return batch;
        });
    }

    private Instant now() { return clock.instant().truncatedTo(ChronoUnit.MICROS); }

    private static String sha256(java.nio.file.Path path) throws IOException {
        try (var input = new DigestInputStream(Files.newInputStream(path, LinkOption.NOFOLLOW_LINKS), digest())) {
            input.transferTo(OutputStream.nullOutputStream());
            return HexFormat.of().formatHex(input.getMessageDigest().digest());
        }
    }

    private static MessageDigest digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private record IndexedCandidate(long index, Candidate candidate) {}

    /** Decisões ainda não gravadas e o resumo de motivos do trecho. */
    private static final class Chunk {
        final List<IndexedCandidate> accepted = new ArrayList<>();
        final Map<String, BatchIssue> issues = new LinkedHashMap<>();
        int rejected;
        int malformed;
        int size;

        void add(long index, Decision decision) {
            size++;
            switch (decision) {
                case Accepted a -> accepted.add(new IndexedCandidate(index, a.candidate()));
                case Rejected r -> { rejected++; issue(BatchIssue.REJECTED, r.code(), index); }
                case Malformed m -> { malformed++; issue(BatchIssue.ERROR, m.code(), index); }
            }
        }

        void issue(String kind, String code, long index) {
            issues.merge(kind + ':' + code, new BatchIssue(kind, code, 1, index),
                    (old, extra) -> new BatchIssue(kind, code, old.count() + 1, Math.min(old.firstFeatureIndex(), index)));
        }

        List<BatchIssue> issues() { return List.copyOf(issues.values()); }

        int size() { return size; }

        void clear() {
            accepted.clear();
            issues.clear();
            rejected = 0;
            malformed = 0;
            size = 0;
        }
    }
}
