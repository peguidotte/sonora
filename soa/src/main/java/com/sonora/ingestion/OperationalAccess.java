package com.sonora.ingestion;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

@Component
public class OperationalAccess extends OncePerRequestFilter {
    private static final String PREFIX = "/api/ingestion/v1";
    private static final Set<String> OPERATIONS = Set.of(PREFIX + "/health/ready", PREFIX + "/openapi.json");
    private final Path keysFile;
    private final JsonMapper json = JsonMapper.builder().build();

    public OperationalAccess(@Value("${SONORA_KEYS_FILE:}") String keysFile) {
        this.keysFile = keysFile.isBlank() ? null : Path.of(keysFile);
    }

    // Felipe deve incluir a autorização específica das futuras rotas; nenhuma é liberada por padrão.
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (request.getMethod().equals("GET") && path.equals(PREFIX + "/health/live")) {
            chain.doFilter(request, response);
            return;
        }
        if (!request.getMethod().equals("GET") || !OPERATIONS.contains(path)) {
            response.setStatus(404);
            return;
        }
        int status = authorize(request.getHeader("X-Api-Key"));
        if (status == 200) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(status);
            response.setContentType("application/json");
            response.getWriter().write(status == 401
                    ? "{\"code\":\"unauthorized\",\"message\":\"A valid API key is required.\"}"
                    : "{\"code\":\"forbidden\",\"message\":\"Insufficient scope.\"}");
        }
    }

    private int authorize(String key) {
        if (key == null || key.isBlank() || key.length() > 512 || key.startsWith("mock-") || keysFile == null) return 401;
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            var keys = json.readTree(Files.readString(keysFile)).path("keys");
            for (var candidate : keys) {
                String stored = candidate.path("sha256").asString("");
                if (stored.length() == 64 && MessageDigest.isEqual(HexFormat.of().parseHex(stored), hash)) {
                    for (var scope : candidate.path("scopes"))
                        if (scope.asString("").equals("operations:read")) return 200;
                    return 403;
                }
            }
        } catch (IOException | RuntimeException | NoSuchAlgorithmException invalidConfiguration) { /* Falha fechada. */ }
        return 401;
    }
}
