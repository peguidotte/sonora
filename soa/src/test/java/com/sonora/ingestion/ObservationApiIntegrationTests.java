package com.sonora.ingestion;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

/** Regras de aceite da ficha SOA verificadas via HTTP real e conferidas no PostgreSQL. */
@EnabledIfEnvironmentVariable(named = "SONORA_DB_PASSWORD", matches = ".+")
class ObservationApiIntegrationTests extends IntegrationTestBase {
    private static final String EMOJI = "🔊";

    private String body(String externalId, String observedAt, String duration, String level, String extra) {
        return """
                {"externalId":%s,"deviceId":"%s","sessionId":"it-boot-1","observedAt":"%s",
                 "durationSeconds":%s,"laeqDbA":%s%s}""".formatted(
                json.writeValueAsString(externalId), DEVICE, observedAt, duration, level, extra);
    }

    private String valid(String externalId) { return body(externalId, now(), "5", "62.5", ""); }

    private static String now() { return Instant.now().truncatedTo(ChronoUnit.SECONDS).toString(); }

    private Response ingest(String key, String body) throws Exception {
        return request("POST", "/sonora/observations", key, body);
    }

    @Test
    void authenticationAndAuthorizationHappenBeforePayload() throws Exception {
        assertEquals(200, request("GET", "/health/live", null, null).status());
        assertEquals(401, request("GET", "/health/ready", null, null).status());
        assertEquals(401, request("GET", "/health/ready", "mock-soa-operator-key", null).status());
        assertEquals(200, request("GET", "/health/ready", READER_KEY, null).status());
        assertEquals(401, ingest(null, "not even json").status(), "sem chave: 401 antes de ler o corpo");
        assertEquals(401, ingest("mock-device-key", valid("x")).status());
        assertEquals(403, ingest(OPERATOR_KEY, valid("x")).status(), "imports:manage não grava observação");
        assertEquals(403, request("GET", "/health/ready", DEVICE_KEY, null).status());
        assertEquals(403, request("GET", "/sonora/batches", DEVICE_KEY, null).status());
        assertEquals(404, request("GET", "/nothing-here", OPERATOR_KEY, null).status());
    }

    @Test
    void createdThenIdenticalRetryThenConflictAndPersistedServerFields() throws Exception {
        String externalId = "it-" + UUID.randomUUID();
        String payload = valid(externalId);
        var created = ingest(DEVICE_KEY, payload);
        assertEquals(201, created.status());
        assertFalse(created.body().get("duplicate").asBoolean());
        assertEquals("simulated", created.body().get("origin").asString());
        String id = created.body().get("id").asString();

        var retry = ingest(DEVICE_KEY, payload);
        assertEquals(200, retry.status());
        assertTrue(retry.body().get("duplicate").asBoolean());
        assertEquals(id, retry.body().get("id").asString(), "retry devolve a mesma observação");

        assertEquals(409, ingest(DEVICE_KEY, payload.replace("62.5", "70")).status());

        Map<String, Object> row = jdbc.queryForMap("select * from sonora.observations where source_id = ? and external_id = ?",
                SIMULATED_SOURCE, externalId);
        assertEquals(UUID.fromString(id), row.get("id"));
        assertEquals("simulated", row.get("origin"));
        assertEquals(LOCATION, row.get("location_id"));
        assertEquals(DEVICE, row.get("device_id"));
        assertEquals("wokwi_linear_demo", row.get("method"));
        assertEquals("simulated", row.get("calibration_status"));
        assertEquals(62.5, row.get("laeq_db_a"));
        assertNull(row.get("batch_id"));
        assertEquals(1, jdbc.queryForObject("select count(*) from sonora.observations where source_id = ? and external_id = ?",
                Integer.class, SIMULATED_SOURCE, externalId));
        assertNotNull(jdbc.queryForObject("select last_received_at from sonora.devices where id = ?", Object.class, DEVICE));
        // A view publicada ao C# expõe a mesma linha.
        assertEquals(1, jdbc.queryForObject("select count(*) from sonora_read.observations where id = ?", Integer.class,
                UUID.fromString(id)));
    }

    @Test
    void numericLimitsAtAndBeyondBoundary() throws Exception {
        assertEquals(201, ingest(DEVICE_KEY, body("lim-" + UUID.randomUUID(), now(), "5", "0", "")).status());
        assertEquals(201, ingest(DEVICE_KEY, body("lim-" + UUID.randomUUID(), now(), "5", "140", "")).status());
        assertEquals(201, ingest(DEVICE_KEY, body("lim-" + UUID.randomUUID(), now(), "3600", "60", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, body("lim-a", now(), "5", "140.0001", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, body("lim-b", now(), "5", "-0.001", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, body("lim-c", now(), "0", "60", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, body("lim-d", now(), "3600.0001", "60", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, body("lim-e", now(), "5", "1e400", "")).status(), "infinito");
    }

    @Test
    void strictTypesAndUnknownFields() throws Exception {
        assertEquals(400, ingest(DEVICE_KEY, body("t-1", now(), "5", "\"62.5\"", "")).status(), "número como texto");
        assertEquals(400, ingest(DEVICE_KEY, valid("t-2").replace("\"t-2\"", "123")).status(), "texto como número");
        assertEquals(400, ingest(DEVICE_KEY, body("t-3", now(), "5", "62.5", ",\"origin\":\"public_dataset\"")).status(),
                "dispositivo não declara origem");
        assertEquals(400, ingest(DEVICE_KEY, body("t-4", now(), "5", "null", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, "{\"externalId\":\"t-5\"}").status());
        assertEquals(400, ingest(DEVICE_KEY, valid("t-6").replace("{", "{\"laeqDbA\":1,")).status(), "chave duplicada");
        assertEquals(400, ingest(DEVICE_KEY, "{").status());
        assertEquals(400, ingest(DEVICE_KEY, valid("t-7").replace(DEVICE.toString(), "not-a-uuid")).status());
    }

    @Test
    void timestampsMustBeUtcWithinFiveMinutes() throws Exception {
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        assertEquals(201, ingest(DEVICE_KEY, body("ts-" + UUID.randomUUID(), now.plusSeconds(240).toString(), "5", "60", "")).status());
        var future = ingest(DEVICE_KEY, body("ts-f", now.plusSeconds(360).toString(), "5", "60", ""));
        assertEquals(422, future.status());
        assertEquals("observed_at_in_future", future.body().get("code").asString());
        assertEquals(400, ingest(DEVICE_KEY, body("ts-1", "2026-11-08T15:00:00-03:00", "5", "60", "")).status());
        assertEquals(400, ingest(DEVICE_KEY, body("ts-2", "2026-11-08T15:00:00.1234567Z", "5", "60", "")).status(),
                "sem truncamento silencioso abaixo de microssegundos");
        assertEquals(400, ingest(DEVICE_KEY, body("ts-3", "2026-13-40T15:00:00Z", "5", "60", "")).status());
        String micros = "ts-" + UUID.randomUUID();
        assertEquals(201, ingest(DEVICE_KEY, body(micros, "2026-11-08T15:00:00.123456Z", "5", "60", "")).status());
        assertEquals(Instant.parse("2026-11-08T15:00:00.123456Z"), jdbc.queryForObject(
                "select observed_at from sonora.observations where external_id = ?", java.sql.Timestamp.class, micros).toInstant());
    }

    @Test
    void unicodeTextIsStoredExactlyAtLimit() throws Exception {
        String atLimit = EMOJI.repeat(127) + UUID.randomUUID().toString().substring(0, 1);
        assertEquals(201, ingest(DEVICE_KEY, valid(atLimit)).status());
        assertEquals(atLimit, jdbc.queryForObject("select external_id from sonora.observations where external_id = ?",
                String.class, atLimit), "nenhum truncamento");
        assertEquals(400, ingest(DEVICE_KEY, valid(EMOJI.repeat(129))).status());
        assertEquals(400, ingest(DEVICE_KEY, valid("")).status());
        assertEquals(400, ingest(DEVICE_KEY, valid("a\u0000b")).status());
    }

    @Test
    void deviceBindingAndRegistry() throws Exception {
        assertEquals(403, ingest(DEVICE_KEY, valid("d-1").replace(DEVICE.toString(), DISABLED_DEVICE.toString())).status(),
                "chave de outro dispositivo");
        var disabled = ingest(DISABLED_DEVICE_KEY, valid("d-2").replace(DEVICE.toString(), DISABLED_DEVICE.toString()));
        assertEquals(403, disabled.status());
        assertEquals("device_disabled", disabled.body().get("code").asString());
        assertEquals(403, ingest(UNREGISTERED_DEVICE_KEY,
                valid("d-3").replace(DEVICE.toString(), UNREGISTERED_DEVICE.toString())).status());
    }
}
