package com.sonora.ingestion.repository;

import java.util.Optional;
import java.util.UUID;
import com.sonora.ingestion.domain.Observation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObservationRepository extends JpaRepository<Observation, UUID> {
    /** Chave de deduplicação contratada: source_id + external_id (UNIQUE no banco). */
    Optional<Observation> findBySourceIdAndExternalId(UUID sourceId, String externalId);

    long countByBatchId(UUID batchId);
}
