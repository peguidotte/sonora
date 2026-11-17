package com.sonora.ingestion.repository;

import java.util.Optional;
import java.util.UUID;
import com.sonora.ingestion.domain.MlSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MlSummaryRepository extends JpaRepository<MlSummary, UUID> {
    Optional<MlSummary> findByModelVersionAndDatasetSha256(String modelVersion, String datasetSha256);

    /** Igualdade semântica de JSON (jsonb), independente de espaços/ordem das chaves. */
    @Query(value = "select (payload = cast(:candidate as jsonb)) from sonora.ml_summaries where id = :id",
            nativeQuery = true)
    boolean samePayload(@Param("id") UUID id, @Param("candidate") String candidate);
}
