package com.sonora.ingestion.admin;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SchemaValidatorsConfig;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import com.sonora.ingestion.domain.MlSummary;
import com.sonora.ingestion.repository.MlSummaryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Valida summary.json pelo schema compartilhado (contracts/schemas/ml-summary.schema.json, empacotado no
 * build) e grava em ml_summaries. Não executa notebook, pickle ou modelo; só armazena o artefato validado.
 * A fixture sintética do contrato é recusada, salvo --allow-fixture (testes/laboratório).
 */
@Service
public class MlSummaryImporter {
    static final long MAX_FILE_BYTES = 1_000_000;
    private static final String SCHEMA = "/contracts/ml-summary.schema.json";

    private final MlSummaryRepository summaries;
    private final Clock clock;
    private final ObjectMapper json = new ObjectMapper();
    private final JsonSchema schema;

    public MlSummaryImporter(MlSummaryRepository summaries, Clock clock) throws IOException {
        this.summaries = summaries;
        this.clock = clock;
        try (InputStream definition = MlSummaryImporter.class.getResourceAsStream(SCHEMA)) {
            if (definition == null) throw new IllegalStateException("ML summary schema missing from build.");
            var config = SchemaValidatorsConfig.builder().formatAssertionsEnabled(true).build();
            this.schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(definition, config);
        }
    }

    public enum Result { IMPORTED, ALREADY_IMPORTED }

    public static class RejectedSummaryException extends RuntimeException {
        public RejectedSummaryException(String message) { super(message, null, false, false); }
    }

    /** Validação sem banco: schema + recusa de fixture. Retorna as mensagens de violação (vazio = válido). */
    public List<String> validate(String document, boolean allowFixture) {
        JsonNode node;
        try {
            node = json.readTree(document);
        } catch (IOException invalidJson) {
            return List.of("Invalid JSON.");
        }
        if (node == null) return List.of("Empty document.");
        Set<ValidationMessage> violations = schema.validate(node);
        if (!violations.isEmpty()) return violations.stream().map(ValidationMessage::getMessage).sorted().toList();
        boolean fixture = node.path("modelVersion").asText().toLowerCase().contains("fixture")
                || node.path("limitations").toString().contains("SYNTHETIC FIXTURE");
        if (fixture && !allowFixture) {
            return List.of("Synthetic contract fixture is not an ML result; use --allow-fixture only in a lab.");
        }
        return List.of();
    }

    @Transactional
    public Result importFile(Path file, boolean allowFixture) throws IOException {
        if (!Files.isRegularFile(file) || Files.size(file) > MAX_FILE_BYTES) {
            throw new RejectedSummaryException("summary.json must be a regular file up to 1 MB.");
        }
        String document = Files.readString(file, StandardCharsets.UTF_8);
        List<String> violations = validate(document, allowFixture);
        if (!violations.isEmpty()) throw new RejectedSummaryException(String.join("; ", violations));
        JsonNode node = json.readTree(document);
        String modelVersion = node.path("modelVersion").asText();
        String datasetSha256 = node.path("datasetSha256").asText();
        var existing = summaries.findByModelVersionAndDatasetSha256(modelVersion, datasetSha256);
        if (existing.isPresent()) {
            if (summaries.samePayload(existing.get().getId(), document)) return Result.ALREADY_IMPORTED;
            throw new RejectedSummaryException("Same modelVersion and datasetSha256 already imported with different content.");
        }
        summaries.save(new MlSummary(modelVersion, datasetSha256, document,
                clock.instant().truncatedTo(ChronoUnit.MICROS)));
        return Result.IMPORTED;
    }
}
