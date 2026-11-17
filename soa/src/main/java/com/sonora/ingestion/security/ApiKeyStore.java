package com.sonora.ingestion.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Verifica X-Api-Key contra SONORA_KEYS_FILE ({"keys":[{id, sha256, scopes[], deviceId?, expiresAt?, revoked?}]}).
 * Só o SHA-256 fica em disco. O arquivo é relido a cada requisição: remover/revogar/rotacionar vale na hora.
 * Qualquer configuração inválida falha fechada (401). Fixtures públicas mock-* nunca autenticam.
 */
@Component
public class ApiKeyStore {
    private static final int MAX_KEY_LENGTH = 512;
    private final Path keysFile;
    private final Clock clock;
    private final JsonMapper json = JsonMapper.builder().build();

    public ApiKeyStore(@Value("${SONORA_KEYS_FILE:}") String keysFile, Clock clock) {
        this.keysFile = keysFile.isBlank() ? null : Path.of(keysFile);
        this.clock = clock;
    }

    public Optional<Credential> authenticate(String presentedKey) {
        if (presentedKey == null || presentedKey.isBlank() || presentedKey.length() > MAX_KEY_LENGTH
                || presentedKey.startsWith("mock-") || keysFile == null) {
            return Optional.empty();
        }
        try {
            byte[] presented = MessageDigest.getInstance("SHA-256").digest(presentedKey.getBytes(StandardCharsets.UTF_8));
            for (JsonNode entry : json.readTree(Files.readString(keysFile)).path("keys")) {
                String stored = entry.path("sha256").asString("");
                if (stored.length() == 64 && MessageDigest.isEqual(HexFormat.of().parseHex(stored), presented)) {
                    return usable(entry);
                }
            }
        } catch (IOException | RuntimeException | NoSuchAlgorithmException invalidConfiguration) {
            // Falha fechada, sem registrar a chave ou o conteúdo do arquivo.
        }
        return Optional.empty();
    }

    private Optional<Credential> usable(JsonNode entry) {
        if (entry.path("revoked").asBoolean(false)) return Optional.empty();
        JsonNode expires = entry.path("expiresAt");
        if (!expires.isMissingNode() && !expires.isNull() && !Instant.parse(expires.asString()).isAfter(clock.instant())) {
            return Optional.empty();
        }
        Set<String> scopes = new HashSet<>();
        for (JsonNode scope : entry.path("scopes")) scopes.add(scope.asString(""));
        JsonNode device = entry.path("deviceId");
        Optional<UUID> deviceId = device.isMissingNode() || device.isNull()
                ? Optional.empty() : Optional.of(UUID.fromString(device.asString()));
        return Optional.of(new Credential(entry.path("id").asString("unnamed"), scopes, deviceId));
    }
}
