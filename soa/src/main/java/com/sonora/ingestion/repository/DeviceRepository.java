package com.sonora.ingestion.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import com.sonora.ingestion.domain.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeviceRepository extends JpaRepository<Device, UUID> {
    @Query("select d from Device d join fetch d.location join fetch d.source where d.id = :id")
    Optional<Device> findWithLocationAndSource(@Param("id") UUID id);

    /** Último recebimento IoT, monotônico: retries atrasados não fazem o estado "voltar no tempo". */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Device d set d.lastReceivedAt = :receivedAt "
            + "where d.id = :id and (d.lastReceivedAt is null or d.lastReceivedAt < :receivedAt)")
    int touchLastReceived(@Param("id") UUID id, @Param("receivedAt") Instant receivedAt);
}
