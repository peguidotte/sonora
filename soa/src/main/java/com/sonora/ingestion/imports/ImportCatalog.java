package com.sonora.ingestion.imports;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import com.sonora.ingestion.domain.CalibrationStatus;
import com.sonora.ingestion.domain.WireValue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Arquivos que o servidor aceita importar (SONORA_IMPORTS_FILE). A API recebe só o fileId; caminho,
 * fonte, formato e distância máxima ficam aqui, fora do alcance do cliente. Relido a cada importação.
 * Caminhos relativos são resolvidos a partir da pasta do próprio arquivo de configuração.
 */
@Component
public class ImportCatalog {
    public static final double MAX_MATCH_DISTANCE_METERS = 50;
    public static final String NOISECAPTURE_POINTS = "noisecapture_points_geojson";
    private static final String FILE_ID = "^[A-Za-z0-9._-]{1,128}$";

    private final Path configFile;
    private final JsonMapper json = JsonMapper.builder().build();

    public ImportCatalog(@Value("${SONORA_IMPORTS_FILE:}") String configFile) {
        this.configFile = configFile.isBlank() ? null : Path.of(configFile);
    }

    public record AllowedFile(String fileId, UUID sourceId, Path path, String format, double maxDistanceMeters,
                              CalibrationStatus calibrationStatus) {}

    public Optional<AllowedFile> find(String fileId) {
        if (configFile == null || fileId == null || !fileId.matches(FILE_ID)) return Optional.empty();
        JsonNode root;
        try {
            root = json.readTree(Files.readString(configFile));
        } catch (IOException | RuntimeException unreadable) {
            throw new IllegalStateException("Import catalog is unreadable or invalid.");
        }
        for (JsonNode entry : root.path("files")) {
            if (fileId.equals(entry.path("fileId").asString(""))) return Optional.of(parse(entry));
        }
        return Optional.empty();
    }

    private AllowedFile parse(JsonNode entry) {
        String format = entry.path("format").asString("");
        if (!NOISECAPTURE_POINTS.equals(format)) throw new IllegalStateException("Unsupported import format.");
        double distance = entry.path("maxDistanceMeters").asDouble(MAX_MATCH_DISTANCE_METERS);
        if (!(distance > 0 && distance <= MAX_MATCH_DISTANCE_METERS)) {
            throw new IllegalStateException("maxDistanceMeters must be in (0, 50].");
        }
        Path path = Path.of(entry.path("path").asString(""));
        if (!path.isAbsolute()) path = configFile.toAbsolutePath().getParent().resolve(path).normalize();
        CalibrationStatus calibration = WireValue.parse(CalibrationStatus.class,
                entry.path("calibrationStatus").asString(CalibrationStatus.UNKNOWN.wire()));
        return new AllowedFile(entry.path("fileId").asString(), UUID.fromString(entry.path("sourceId").asString()),
                path, format, distance, calibration);
    }
}
