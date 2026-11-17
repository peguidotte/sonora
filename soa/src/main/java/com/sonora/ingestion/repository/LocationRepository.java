package com.sonora.ingestion.repository;

import java.util.UUID;
import com.sonora.ingestion.domain.Location;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, UUID> {}
