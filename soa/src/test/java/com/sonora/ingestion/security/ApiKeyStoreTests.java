package com.sonora.ingestion.security;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

class ApiKeyStoreTests {
    @TempDir Path temporary;
    final Clock clock = Clock.fixed(Instant.parse("2026-11-16T12:00:00Z"), ZoneOffset.UTC);

    static String sha(String key) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8)));
    }

    ApiKeyStore store(String entries) throws Exception {
        Path file = temporary.resolve("keys.json");
        Files.writeString(file, "{\"keys\":[" + entries + "]}");
        return new ApiKeyStore(file.toString(), clock);
    }

    @Test
    void authenticatesByHashWithScopesAndDeviceBinding() throws Exception {
        String device = "11111111-1111-4111-8111-111111111111";
        var credential = store("{\"id\":\"d\",\"sha256\":\"" + sha("device-secret") + "\",\"scopes\":[\"observations:write\"],"
                + "\"deviceId\":\"" + device + "\"}").authenticate("device-secret").orElseThrow();
        assertTrue(credential.has(Scopes.OBSERVATIONS_WRITE));
        assertFalse(credential.has(Scopes.IMPORTS_MANAGE));
        assertTrue(credential.boundTo(UUID.fromString(device)));
        assertFalse(credential.boundTo(UUID.randomUUID()));
    }

    @Test
    void failsClosed() throws Exception {
        var keys = store("{\"sha256\":\"" + sha("valid") + "\",\"scopes\":[\"imports:manage\"]},"
                + "{\"sha256\":\"" + sha("revoked") + "\",\"scopes\":[\"imports:manage\"],\"revoked\":true},"
                + "{\"sha256\":\"" + sha("expired") + "\",\"scopes\":[\"imports:manage\"],\"expiresAt\":\"2026-11-16T12:00:00Z\"},"
                + "{\"sha256\":\"" + sha("future") + "\",\"scopes\":[\"imports:manage\"],\"expiresAt\":\"2026-11-16T12:00:01Z\"},"
                + "{\"sha256\":\"" + sha("mock-soa-operator-key") + "\",\"scopes\":[\"imports:manage\"]}");
        assertTrue(keys.authenticate("valid").isPresent());
        assertTrue(keys.authenticate("future").isPresent());
        assertTrue(keys.authenticate("revoked").isEmpty());
        assertTrue(keys.authenticate("expired").isEmpty());
        assertTrue(keys.authenticate("mock-soa-operator-key").isEmpty(), "fixtures públicas nunca autenticam");
        assertTrue(keys.authenticate(null).isEmpty());
        assertTrue(keys.authenticate("").isEmpty());
        assertTrue(keys.authenticate("x".repeat(513)).isEmpty());
        assertTrue(keys.authenticate("unknown").isEmpty());
        assertTrue(new ApiKeyStore("", clock).authenticate("valid").isEmpty(), "sem arquivo configurado");
    }

    @Test
    void revocationAndInvalidFileApplyOnNextRequest() throws Exception {
        Path file = temporary.resolve("keys.json");
        var keys = new ApiKeyStore(file.toString(), clock);
        Files.writeString(file, "{\"keys\":[{\"sha256\":\"" + sha("k") + "\",\"scopes\":[]}]}");
        assertTrue(keys.authenticate("k").isPresent());
        Files.writeString(file, "{\"keys\":[]}");
        assertTrue(keys.authenticate("k").isEmpty());
        Files.writeString(file, "not-json");
        assertTrue(keys.authenticate("k").isEmpty());
    }
}
