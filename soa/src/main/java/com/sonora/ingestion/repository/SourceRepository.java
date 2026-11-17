package com.sonora.ingestion.repository;

import java.util.UUID;
import com.sonora.ingestion.domain.Source;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SourceRepository extends JpaRepository<Source, UUID> {}
