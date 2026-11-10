package com.sonora.ingestion;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HexFormat;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OperationalTests {
    @TempDir Path temporary;

    @Test
    void readinessReflectsDatabaseAndLivenessDoesNotConnect() throws Exception {
        var database = mock(DataSource.class);
        var controller = new OperationalController(database);
        assertEquals("ok", controller.live().status());
        verifyNoInteractions(database);
        when(database.getConnection()).thenThrow(new SQLException("private connection details"));
        assertEquals(503, controller.ready().getStatusCode().value());
        assertEquals("unavailable", controller.ready().getBody().status());
        var connection = mock(Connection.class);
        doReturn(connection).when(database).getConnection();
        when(connection.isValid(3)).thenReturn(true);
        assertEquals(200, controller.ready().getStatusCode().value());
        verify(connection).close();
    }

    @Test
    void operationalAccessRejectsMissingMockWrongScopeAndRevokedKeys() throws Exception {
        Path file = temporary.resolve("keys.json");
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest("test-only-key".getBytes(StandardCharsets.UTF_8)));
        var access = new OperationalAccess(file.toString());
        Files.writeString(file, "{\"keys\":[{\"sha256\":\"" + hash + "\",\"scopes\":[\"operations:read\"]}]}");
        assertEquals(401, invoke(access, null, "health/ready"));
        assertEquals(401, invoke(access, "mock-soa-operator-key", "health/ready"));
        assertEquals(200, invoke(access, "test-only-key", "openapi.json"));
        assertEquals(404, invoke(access, "test-only-key", "future-route"));
        assertEquals(200, invoke(access, null, "health/live"));
        Files.writeString(file, "{\"keys\":[{\"sha256\":\"" + hash + "\",\"scopes\":[\"imports:manage\"]}]}");
        assertEquals(403, invoke(access, "test-only-key", "health/ready"));
        Files.writeString(file, "{\"keys\":[]}");
        assertEquals(401, invoke(access, "test-only-key", "health/ready"));
        Files.writeString(file, "invalid-json");
        assertEquals(401, invoke(access, "test-only-key", "health/ready"));
    }

    private int invoke(OperationalAccess access, String key, String route) throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/ingestion/v1/" + route);
        var response = new MockHttpServletResponse();
        if (key != null) request.addHeader("X-Api-Key", key);
        access.doFilter(request, response, (req, res) -> {});
        return response.getStatus();
    }
}
