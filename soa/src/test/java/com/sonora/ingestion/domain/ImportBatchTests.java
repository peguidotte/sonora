package com.sonora.ingestion.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ImportBatchTests {
    static final String SHA = "a".repeat(64);
    final Instant now = Instant.parse("2026-11-16T12:00:00Z");

    @Test
    void countersAccumulateAndStatusReflectsMalformedItems() {
        var batch = ImportBatch.start("file-1", UUID.randomUUID(), SHA, now);
        assertEquals(BatchStatus.PROCESSING, batch.getStatus());
        batch.record(3, 1, 2, 0, List.of(new BatchIssue(BatchIssue.REJECTED, "no_location_within_distance", 2, 4)));
        batch.record(1, 0, 1, 0, List.of(new BatchIssue(BatchIssue.REJECTED, "no_location_within_distance", 1, 1)));
        batch.complete(now);
        assertEquals(BatchStatus.COMPLETED, batch.getStatus(), "rejeição por regra não é erro");
        assertEquals(4, batch.getAcceptedCount());
        assertEquals(1, batch.getDuplicateCount());
        assertEquals(3, batch.getRejectedCount());
        assertEquals(List.of(new BatchIssue(BatchIssue.REJECTED, "no_location_within_distance", 3, 1)), batch.getErrors());

        var withErrors = ImportBatch.start("file-1", UUID.randomUUID(), SHA, now);
        withErrors.record(0, 0, 0, 1, List.of(new BatchIssue(BatchIssue.ERROR, "invalid_geometry", 1, 0)));
        withErrors.complete(now);
        assertEquals(BatchStatus.COMPLETED_WITH_ERRORS, withErrors.getStatus());
    }

    @Test
    void failurePreservesCommittedCountersAndClosesBatch() {
        var batch = ImportBatch.start("file-1", UUID.randomUUID(), SHA, now);
        batch.record(5, 0, 0, 0, List.of());
        batch.fail("malformed_file", now);
        assertEquals(BatchStatus.FAILED, batch.getStatus());
        assertEquals(5, batch.getAcceptedCount());
        assertEquals(now, batch.getCompletedAt());
        assertThrows(IllegalStateException.class, () -> batch.complete(now));
        assertThrows(IllegalStateException.class, () -> batch.record(1, 0, 0, 0, List.of()));
        assertThrows(IllegalArgumentException.class, () -> ImportBatch.start("f", UUID.randomUUID(), "XYZ", now));
    }

    @Test
    void observationRangesMatchDatabaseChecks() {
        assertTrue(Observation.validLevel(0));
        assertTrue(Observation.validLevel(140));
        assertFalse(Observation.validLevel(140.0001));
        assertFalse(Observation.validLevel(Double.NaN));
        assertFalse(Observation.validDuration(0));
        assertTrue(Observation.validDuration(3600));
        assertFalse(Observation.validDuration(Double.POSITIVE_INFINITY));
    }
}
