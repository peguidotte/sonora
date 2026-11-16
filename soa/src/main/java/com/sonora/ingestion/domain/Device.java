package com.sonora.ingestion.domain;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Dispositivo IoT (ESP32/Wokwi) instalado num local e vinculado a uma fonte simulada.
 * A credencial resolve o dispositivo; dele vêm local, fonte, origem, método e calibração.
 */
@Entity
@Table(name = "devices")
public class Device {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false, insertable = false, updatable = false)
    private Location location;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_id", nullable = false, insertable = false, updatable = false)
    private Source source;
    @Column(nullable = false, insertable = false, updatable = false)
    private String name;
    @Column(nullable = false, insertable = false, updatable = false)
    private boolean enabled;
    @Column(nullable = false, insertable = false, updatable = false)
    private ObservationMethod method;
    @Column(name = "calibration_status", nullable = false, insertable = false, updatable = false)
    private CalibrationStatus calibrationStatus;
    /** Atualizado por consulta dedicada (único UPDATE permitido ao runtime no banco). */
    @Column(name = "last_received_at", insertable = false, updatable = false)
    private Instant lastReceivedAt;

    protected Device() {}

    public UUID getId() { return id; }
    public Location getLocation() { return location; }
    public Source getSource() { return source; }
    public String getName() { return name; }
    public boolean isEnabled() { return enabled; }
    public ObservationMethod getMethod() { return method; }
    public CalibrationStatus getCalibrationStatus() { return calibrationStatus; }
    public Instant getLastReceivedAt() { return lastReceivedAt; }
}
