package com.sonora.ingestion;

import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ingestion/v1/health")
public class OperationalController {
    private final DataSource database;

    public OperationalController(DataSource database) { this.database = database; }

    public record Health(String status) {}

    @GetMapping("/live")
    public Health live() { return new Health("ok"); }

    @GetMapping("/ready")
    public ResponseEntity<Health> ready() {
        try (var connection = database.getConnection()) {
            if (connection.isValid(3)) return ResponseEntity.ok(new Health("ok"));
        } catch (SQLException unavailable) { /* Não expor detalhes da conexão. */ }
        return ResponseEntity.status(503).body(new Health("unavailable"));
    }
}
