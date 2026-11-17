package com.sonora.ingestion.repository;

import java.util.UUID;
import com.sonora.ingestion.domain.ImportBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportBatchRepository extends JpaRepository<ImportBatch, UUID> {
    Page<ImportBatch> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);
}
