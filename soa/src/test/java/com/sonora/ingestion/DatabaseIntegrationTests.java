package com.sonora.ingestion;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import com.sonora.ingestion.admin.MlSummaryImporter;
import com.sonora.ingestion.repository.MlSummaryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** Permissões reais do runtime, invariantes do schema e importação administrativa do ML. */
@EnabledIfEnvironmentVariable(named = "SONORA_DB_PASSWORD", matches = ".+")
class DatabaseIntegrationTests extends IntegrationTestBase {
    static final Path ML_FIXTURE = Path.of("..", "contracts", "fixtures", "ml-summary.mock.json");

    @Autowired MlSummaryImporter importer;
    @Autowired MlSummaryRepository summaries;
    @Autowired TransactionTemplate transaction;

    @Test
    void runtimeAccountHasLeastPrivilege() {
        assertEquals("sonora_ingest", jdbc.queryForObject("select current_user", String.class));
        assertThrows(DataAccessException.class, () -> jdbc.update("update sonora.observations set laeq_db_a = 1 where false"));
        assertThrows(DataAccessException.class, () -> jdbc.update("delete from sonora.observations where false"));
        assertThrows(DataAccessException.class, () -> jdbc.update("update sonora.devices set name = 'x' where false"));
        assertThrows(DataAccessException.class, () -> jdbc.execute("create table sonora.should_fail (id int)"));
        assertThrows(DataAccessException.class, () -> jdbc.execute("create view sonora_read.should_fail as select 1"));
        assertDoesNotThrow(() -> jdbc.update("update sonora.devices set last_received_at = last_received_at where false"));
        assertDoesNotThrow(() -> jdbc.queryForList("select * from sonora_read.observations limit 1"));
    }

    @Test
    void schemaRejectsInconsistentOriginAndRanges() {
        UUID location = UUID.randomUUID();
        jdbc.update("insert into sonora.locations (id, name, city, latitude, longitude) values (?, 'TEST checks', 'Test', 0, 0)", location);
        // Observação dizendo public_dataset numa fonte simulada: barrada pela FK composta (source_id, origin).
        assertThrows(DataAccessException.class, () -> jdbc.update("insert into sonora.observations (id, source_id, origin, "
                + "location_id, device_id, producer_id, session_id, external_id, observed_at, duration_seconds, laeq_db_a, "
                + "method, calibration_status) values (?, ?, 'public_dataset', ?, ?, 'p', 's', ?, now(), 1, 50, "
                + "'wokwi_linear_demo', 'simulated')", UUID.randomUUID(), SIMULATED_SOURCE, location, DEVICE, "chk-" + UUID.randomUUID()));
        assertThrows(DataAccessException.class, () -> jdbc.update("insert into sonora.observations (id, source_id, origin, "
                + "location_id, device_id, producer_id, session_id, external_id, observed_at, duration_seconds, laeq_db_a, "
                + "method, calibration_status) values (?, ?, 'simulated', ?, ?, 'p', 's', ?, now(), 1, 'NaN', "
                + "'wokwi_linear_demo', 'simulated')", UUID.randomUUID(), SIMULATED_SOURCE, location, DEVICE, "chk-" + UUID.randomUUID()));
        // Dispositivo só pode pertencer a fonte simulada.
        assertThrows(DataAccessException.class, () -> jdbc.update("insert into sonora.devices (id, location_id, source_id, "
                + "name, method, calibration_status) values (?, ?, ?, 'x', 'wokwi_linear_demo', 'simulated')",
                UUID.randomUUID(), location, PUBLIC_SOURCE));
    }

    @Test
    void mlSummaryIsValidatedAndImportedIdempotently() throws Exception {
        String fixture = Files.readString(ML_FIXTURE);
        assertFalse(importer.validate(fixture, false).isEmpty(), "fixture sintética não é resultado de ML");
        assertTrue(importer.validate(fixture, true).isEmpty());
        assertFalse(importer.validate(fixture.replace("\"sampleCount\": 2", "\"sampleCount\": 0"), true).isEmpty());
        assertFalse(importer.validate(fixture.replace("\"schemaVersion\": 1,", ""), true).isEmpty());
        assertFalse(importer.validate("{", true).isEmpty());

        String unique = fixture.replace("fixture-NOT-TRAINED", "fixture-it-" + UUID.randomUUID());
        Path file = WORK.resolve("summary.json");
        Files.writeString(file, unique);
        // Transação desfeita no fim: o resumo de teste nunca fica visível ao C#.
        transaction.executeWithoutResult(status -> {
            try {
                assertEquals(MlSummaryImporter.Result.IMPORTED, importer.importFile(file, true));
                assertEquals(MlSummaryImporter.Result.ALREADY_IMPORTED, importer.importFile(file, true));
                Files.writeString(file, unique.replace("\"count\": 1,", "\"count\": 0,"));
                assertThrows(MlSummaryImporter.RejectedSummaryException.class, () -> importer.importFile(file, true));
                assertEquals(1, jdbc.queryForObject("select count(*) from sonora_read.ml_summaries", Integer.class));
            } catch (Exception e) {
                throw new AssertionError(e);
            } finally {
                status.setRollbackOnly();
            }
        });
    }
}
