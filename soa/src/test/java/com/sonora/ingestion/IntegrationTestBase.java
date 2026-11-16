package com.sonora.ingestion;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Integração real: servidor HTTP + PostgreSQL já migrado por database/ (mesmo fluxo da CI).
 * Usa a conta de runtime sonora_ingest; cadastros de teste têm IDs e coordenadas aleatórios por execução.
 * Exige banco DESCARTÁVEL: o runtime não pode apagar o que grava (observações são imutáveis).
 */
@EnabledIfEnvironmentVariable(named = "SONORA_DB_PASSWORD", matches = ".+",
        disabledReason = "Requer PostgreSQL migrado; ver soa/README.md")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class IntegrationTestBase {
    protected static final Path WORK;
    protected static final String OPERATOR_KEY = "test-operator-" + UUID.randomUUID();
    protected static final String READER_KEY = "test-reader-" + UUID.randomUUID();
    protected static final String DEVICE_KEY = "test-device-" + UUID.randomUUID();
    protected static final String DISABLED_DEVICE_KEY = "test-disabled-" + UUID.randomUUID();
    protected static final String UNREGISTERED_DEVICE_KEY = "test-unregistered-" + UUID.randomUUID();
    protected static final UUID SIMULATED_SOURCE = UUID.randomUUID();
    protected static final UUID PUBLIC_SOURCE = UUID.randomUUID();
    protected static final UUID LOCATION = UUID.randomUUID();
    protected static final UUID DEVICE = UUID.randomUUID();
    protected static final UUID DISABLED_DEVICE = UUID.randomUUID();
    protected static final UUID UNREGISTERED_DEVICE = UUID.randomUUID();
    /** Ponto aleatório no interior do Brasil, longe do seed e de outras execuções. */
    protected static final double LAT = ThreadLocalRandom.current().nextDouble(-20, -5);
    protected static final double LON = ThreadLocalRandom.current().nextDouble(-60, -45);
    private static boolean seeded;

    static {
        try {
            WORK = Files.createTempDirectory("sonora-soa-it");
            Files.writeString(WORK.resolve("keys.json"), """
                    {"keys":[
                     {"id":"op","sha256":"%s","scopes":["imports:manage","operations:read"]},
                     {"id":"reader","sha256":"%s","scopes":["operations:read"]},
                     {"id":"device","sha256":"%s","scopes":["observations:write"],"deviceId":"%s"},
                     {"id":"disabled","sha256":"%s","scopes":["observations:write"],"deviceId":"%s"},
                     {"id":"unregistered","sha256":"%s","scopes":["observations:write"],"deviceId":"%s"}]}
                    """.formatted(sha(OPERATOR_KEY), sha(READER_KEY), sha(DEVICE_KEY), DEVICE,
                    sha(DISABLED_DEVICE_KEY), DISABLED_DEVICE, sha(UNREGISTERED_DEVICE_KEY), UNREGISTERED_DEVICE));
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    @DynamicPropertySource
    static void configuration(DynamicPropertyRegistry registry) {
        registry.add("SONORA_KEYS_FILE", () -> WORK.resolve("keys.json").toString());
        registry.add("SONORA_IMPORTS_FILE", () -> WORK.resolve("imports.json").toString());
    }

    @Value("${local.server.port}") protected int port;
    @Autowired protected JdbcTemplate jdbc;
    protected final JsonMapper json = JsonMapper.builder().build();
    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void seedOnce() {
        synchronized (IntegrationTestBase.class) {
            if (seeded) return;
            jdbc.update("insert into sonora.sources (id, name, source_url, snapshot_date, license, origin) values "
                    + "(?, 'TEST simulated', 'https://example.invalid/test', date '2026-11-16', 'Test only', 'simulated'), "
                    + "(?, 'TEST public', 'https://example.invalid/test-public', date '2026-11-16', 'Test only', 'public_dataset')",
                    SIMULATED_SOURCE, PUBLIC_SOURCE);
            jdbc.update("insert into sonora.locations (id, name, city, latitude, longitude, is_demo) "
                    + "values (?, 'TEST location', 'Test', ?, ?, true)", LOCATION, LAT, LON);
            jdbc.update("insert into sonora.devices (id, location_id, source_id, name, enabled, method, calibration_status) values "
                    + "(?, ?, ?, 'TEST device', true, 'wokwi_linear_demo', 'simulated'), "
                    + "(?, ?, ?, 'TEST disabled', false, 'wokwi_linear_demo', 'simulated')",
                    DEVICE, LOCATION, SIMULATED_SOURCE, DISABLED_DEVICE, LOCATION, SIMULATED_SOURCE);
            seeded = true;
        }
    }

    protected record Response(int status, JsonNode body) {}

    protected Response request(String method, String path, String key, String body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/ingestion/v1" + path));
        if (key != null) builder.header("X-Api-Key", key);
        if (body != null) builder.header("Content-Type", "application/json");
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        String text = response.body();
        return new Response(response.statusCode(), text == null || text.isBlank() ? null : json.readTree(text));
    }

    /** Formata double com ponto decimal, independente do locale da máquina. */
    protected static String num(double value) { return String.format(Locale.ROOT, "%.9f", value); }

    protected static String sha(String key) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
