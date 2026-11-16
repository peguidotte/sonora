package com.sonora.ingestion;

import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

/** Importação de arquivo no formato NoiseCapture (sintético, gerado no teste) contra PostgreSQL real. */
@EnabledIfEnvironmentVariable(named = "SONORA_DB_PASSWORD", matches = ".+")
class BatchApiIntegrationTests extends IntegrationTestBase {
    static final String RUN = UUID.randomUUID().toString().substring(0, 8);
    static final String VALID = "it-valid-" + RUN;
    static final String MISSING = "it-missing-" + RUN;
    static final String TRUNCATED = "it-truncated-" + RUN;
    static final String TRAILING = "it-trailing-" + RUN;
    static final String WRONG_TYPE = "it-wrongtype-" + RUN;
    static final long TRACK = Math.abs(UUID.randomUUID().getMostSignificantBits() % 1_000_000_000L);

    /** 1 grau de latitude ≈ 111 km; 0,0001 ≈ 11 m. */
    static String feature(long track, long epoch, double lat, double lon, String noise, String accuracy) {
        return """
                {"type":"Feature","geometry":{"type":"Point","coordinates":[%s,%s,770]},"properties":{"pk_track":%d,
                "time_ISO8601":"synthetic","time_epoch":%d,"noise_level":%s,"speed":0.0,"orientation":null,"accuracy":%s}}"""
                .formatted(num(lon), num(lat), track, epoch, noise, accuracy);
    }

    @BeforeAll
    static void writeFilesAndCatalog() throws Exception {
        List<String> features = new ArrayList<>();
        long epoch = 1_557_671_202_000L;
        features.add(feature(TRACK, epoch, LAT + 0.0001, LON, "60.0", "3.0"));          // aceito (~11 m)
        features.add(feature(TRACK, epoch + 1000, LAT, LON + 0.0001, "70.0", "4.0"));   // aceito
        features.add(feature(TRACK, epoch + 1000, LAT, LON + 0.0001, "70.0", "4.0"));   // duplicata idêntica no arquivo
        features.add(feature(TRACK, epoch + 1000, LAT, LON + 0.0001, "75.0", "4.0"));   // mesmo segundo, leitura diferente
        features.add(feature(TRACK, epoch + 2000, LAT + 0.01, LON, "60.0", "3.0"));     // ~1,1 km: sem local
        features.add(feature(TRACK, epoch + 3000, LAT, LON, "0.0", "3.0"));             // sentinela 0
        features.add(feature(TRACK, epoch + 4000, LAT, LON, "60.0", "80.0"));           // GPS impreciso
        features.add("{\"type\":\"Feature\",\"geometry\":null,\"properties\":{}}");     // malformado
        String collection = "{\"type\":\"FeatureCollection\",\"features\":[\n" + String.join(",\n", features) + "\n]}";
        Files.writeString(WORK.resolve("valid.points.geojson"), collection);
        Files.writeString(WORK.resolve("truncated.points.geojson"), "{\"type\":\"FeatureCollection\",\"features\":[\n"
                + feature(TRACK + 1, epoch, LAT, LON, "55.0", "3.0") + ",\n{\"type\":");
        Files.writeString(WORK.resolve("trailing.points.geojson"), "{\"type\":\"FeatureCollection\",\"features\":[]} garbage");
        Files.writeString(WORK.resolve("wrongtype.points.geojson"), "{\"type\":\"NotAFeatureCollection\",\"features\":[]}");
        Files.writeString(WORK.resolve("imports.json"), """
                {"files":[
                 {"fileId":"%s","sourceId":"%s","path":"valid.points.geojson","format":"noisecapture_points_geojson","maxDistanceMeters":50},
                 {"fileId":"%s","sourceId":"%s","path":"absent.points.geojson","format":"noisecapture_points_geojson"},
                 {"fileId":"%s","sourceId":"%s","path":"truncated.points.geojson","format":"noisecapture_points_geojson"},
                 {"fileId":"%s","sourceId":"%s","path":"trailing.points.geojson","format":"noisecapture_points_geojson"},
                 {"fileId":"%s","sourceId":"%s","path":"wrongtype.points.geojson","format":"noisecapture_points_geojson"}]}
                """.formatted(VALID, PUBLIC_SOURCE, MISSING, PUBLIC_SOURCE, TRUNCATED, PUBLIC_SOURCE,
                TRAILING, PUBLIC_SOURCE, WRONG_TYPE, PUBLIC_SOURCE));
    }

    private Response create(String fileId) throws Exception {
        return request("POST", "/sonora/batches", OPERATOR_KEY, "{\"fileId\":\"" + fileId + "\"}");
    }

    private int committed(String batchId) {
        return jdbc.queryForObject("select count(*) from sonora.observations where batch_id = ?", Integer.class,
                UUID.fromString(batchId));
    }

    @Test
    void importCountsCommittedRowsAndReimportIsIdempotent() throws Exception {
        var first = create(VALID);
        assertEquals(201, first.status());
        var batch = first.body();
        assertEquals("completed_with_errors", batch.get("status").asString(), "1 feature malformada");
        assertEquals(2, batch.get("acceptedCount").asInt());
        assertEquals(1, batch.get("duplicateCount").asInt());
        assertEquals(4, batch.get("rejectedCount").asInt(), "conflito + sem local + sentinela + GPS");
        assertEquals(PUBLIC_SOURCE.toString(), batch.get("sourceId").asString());
        assertTrue(batch.get("fileSha256").asString().matches("[0-9a-f]{64}"));
        assertTrue(batch.get("createdAt").asString().endsWith("Z"));
        assertFalse(batch.get("completedAt").isNull());
        assertEquals(2, committed(batch.get("id").asString()), "acceptedCount == linhas commitadas");

        Map<String, Object> row = jdbc.queryForMap("select * from sonora.observations where source_id = ? and external_id = ?",
                PUBLIC_SOURCE, "nc-" + TRACK + "-1557671202000");
        assertEquals("public_dataset", row.get("origin"));
        assertEquals("noisecapture_1s", row.get("method"));
        assertEquals("unknown", row.get("calibration_status"));
        assertEquals(LOCATION, row.get("location_id"));
        assertEquals(1.0, row.get("duration_seconds"));
        assertEquals(11.1, (Double) row.get("match_distance_meters"), 0.3);
        assertNull(row.get("device_id"));

        String issues = jdbc.queryForObject("select errors::text from sonora.import_batches where id = ?", String.class,
                UUID.fromString(batch.get("id").asString()));
        for (String code : List.of("conflicting_duplicate", "no_location_within_distance", "noise_level_sentinel_zero",
                "gps_accuracy_exceeds_distance", "invalid_geometry")) {
            assertTrue(issues.contains(code), code);
        }

        var second = create(VALID).body();
        assertEquals(0, second.get("acceptedCount").asInt());
        assertEquals(3, second.get("duplicateCount").asInt());
        assertEquals(0, committed(second.get("id").asString()));

        var fetched = request("GET", "/sonora/batches/" + batch.get("id").asString(), OPERATOR_KEY, null);
        assertEquals(200, fetched.status());
        assertEquals(batch, fetched.body());
    }

    @Test
    void failuresAreVisibleNeverSilentSuccess() throws Exception {
        var unknown = create("not-allowed-" + RUN);
        assertEquals(404, unknown.status());
        int before = jdbc.queryForObject("select count(*) from sonora.import_batches", Integer.class);
        var missing = create(MISSING);
        assertEquals(422, missing.status());
        assertEquals("file_unavailable", missing.body().get("code").asString());
        assertEquals(before, jdbc.queryForObject("select count(*) from sonora.import_batches", Integer.class));

        var truncated = create(TRUNCATED).body();
        assertEquals("failed", truncated.get("status").asString());
        assertEquals(committed(truncated.get("id").asString()), truncated.get("acceptedCount").asInt(),
                "o que foi commitado antes da falha continua contado");
        assertEquals("failed", create(TRAILING).body().get("status").asString(), "conteúdo após o JSON");
        assertEquals("failed", create(WRONG_TYPE).body().get("status").asString(), "raiz não é FeatureCollection");

        assertEquals(400, request("POST", "/sonora/batches", OPERATOR_KEY, "{\"fileId\":\"x\",\"path\":\"/etc/passwd\"}").status(),
                "caminho arbitrário não é aceito");
        assertEquals(400, request("POST", "/sonora/batches", OPERATOR_KEY, "{\"fileId\":\"\"}").status());
        assertEquals(403, request("POST", "/sonora/batches", READER_KEY, "{\"fileId\":\"" + VALID + "\"}").status());
    }

    @Test
    void listingAndLookupValidation() throws Exception {
        create(VALID);
        var page = request("GET", "/sonora/batches?page=1&pageSize=1", OPERATOR_KEY, null);
        assertEquals(200, page.status());
        assertEquals(1, page.body().get("items").size());
        assertEquals(1, page.body().get("pageSize").asInt());
        assertTrue(page.body().get("total").asLong() >= 1);
        assertEquals(400, request("GET", "/sonora/batches?pageSize=101", OPERATOR_KEY, null).status());
        assertEquals(400, request("GET", "/sonora/batches?page=0", OPERATOR_KEY, null).status());
        assertEquals(400, request("GET", "/sonora/batches/not-a-uuid", OPERATOR_KEY, null).status());
        assertEquals(404, request("GET", "/sonora/batches/" + UUID.randomUUID(), OPERATOR_KEY, null).status());
    }
}
