package com.sonora.ingestion.security;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Credencial autenticada. deviceId presente restringe a chave a um único dispositivo. */
public record Credential(String id, Set<String> scopes, Optional<UUID> deviceId) {
    public static final String REQUEST_ATTRIBUTE = "com.sonora.ingestion.security.Credential";

    public Credential {
        scopes = Set.copyOf(scopes);
    }

    public boolean has(String scope) { return scopes.contains(scope); }

    public boolean boundTo(UUID device) { return deviceId.map(device::equals).orElse(false); }
}
