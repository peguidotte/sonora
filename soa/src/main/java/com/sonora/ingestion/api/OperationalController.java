package com.sonora.ingestion.api;

import java.sql.SQLException;
import javax.sql.DataSource;
import com.sonora.ingestion.api.dto.ApiError;
import com.sonora.ingestion.api.dto.Health;
import com.sonora.ingestion.security.RequiredScope;
import com.sonora.ingestion.security.Scopes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = ApiPaths.PREFIX + "/health", produces = "application/json")
@Tag(name = "Operations")
public class OperationalController {
    private final DataSource database;

    public OperationalController(DataSource database) { this.database = database; }

    @GetMapping("/live")
    @RequiredScope({})
    @Operation(operationId = "soaLive", summary = "Check process liveness")
    @ApiResponse(responseCode = "200", description = "Successful response.")
    public Health live() { return new Health("ok"); }

    @GetMapping("/ready")
    @RequiredScope(Scopes.OPERATIONS_READ)
    @Operation(operationId = "soaReady", summary = "Check dependency readiness")
    @ApiResponse(responseCode = "200", description = "Database reachable.", content = @Content(schema = @Schema(implementation = Health.class)))
    @ApiResponse(responseCode = "503", description = "Database unavailable.", content = @Content(schema = @Schema(implementation = Health.class)))
    @ApiResponse(responseCode = "401", description = "Missing, invalid, revoked or expired API key.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Authenticated credential lacks the required scope.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ResponseEntity<Health> ready() {
        try (var connection = database.getConnection()) {
            if (connection.isValid(3)) return ResponseEntity.ok(new Health("ok"));
        } catch (SQLException unavailable) { /* Não expor detalhes da conexão. */ }
        return ResponseEntity.status(503).body(new Health("unavailable"));
    }
}
