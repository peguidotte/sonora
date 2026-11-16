package com.sonora.ingestion.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * Observação acústica persistida: um nível LAeq dB(A) durante um intervalo, em um local.
 * Imutável (o runtime não tem UPDATE no banco). Identidade de negócio: fonte + externalId.
 */
@Entity
@Immutable
@Table(name = "observations")
public class Observation extends AssignedIdEntity {
    public static final double MIN_DB_A = 0;
    public static final double MAX_DB_A = 140;
    public static final double MAX_DURATION_SECONDS = 3600;

    @Id
    private UUID id;
    @Column(name = "source_id", nullable = false)
    private UUID sourceId;
    @Column(nullable = false)
    private Origin origin;
    @Column(name = "location_id", nullable = false)
    private UUID locationId;
    @Column(name = "device_id")
    private UUID deviceId;
    @Column(name = "batch_id")
    private UUID batchId;
    @Column(name = "producer_id", nullable = false)
    private String producerId;
    @Column(name = "session_id", nullable = false)
    private String sessionId;
    @Column(name = "external_id", nullable = false)
    private String externalId;
    @Column(name = "observed_at", nullable = false)
    private Instant observedAt;
    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
    @Column(name = "duration_seconds", nullable = false)
    private double durationSeconds;
    @Column(name = "laeq_db_a", nullable = false)
    private double laeqDbA;
    @Column(nullable = false)
    private ObservationMethod method;
    @Column(name = "calibration_status", nullable = false)
    private CalibrationStatus calibrationStatus;
    @Column(name = "match_distance_meters")
    private Double matchDistanceMeters;

    protected Observation() {}

    private Observation(UUID sourceId, Origin origin, UUID locationId, UUID deviceId, UUID batchId, String producerId,
                        String sessionId, String externalId, Instant observedAt, Instant receivedAt,
                        double durationSeconds, double laeqDbA, ObservationMethod method,
                        CalibrationStatus calibrationStatus, Double matchDistanceMeters) {
        if (!validLevel(laeqDbA)) throw new IllegalArgumentException("laeqDbA outside 0-140 dB(A).");
        if (!validDuration(durationSeconds)) throw new IllegalArgumentException("durationSeconds outside (0, 3600].");
        this.id = UUID.randomUUID();
        this.sourceId = Objects.requireNonNull(sourceId);
        this.origin = Objects.requireNonNull(origin);
        this.locationId = Objects.requireNonNull(locationId);
        this.deviceId = deviceId;
        this.batchId = batchId;
        this.producerId = Objects.requireNonNull(producerId);
        this.sessionId = Objects.requireNonNull(sessionId);
        this.externalId = Objects.requireNonNull(externalId);
        this.observedAt = Objects.requireNonNull(observedAt);
        this.receivedAt = Objects.requireNonNull(receivedAt);
        this.durationSeconds = durationSeconds;
        this.laeqDbA = laeqDbA;
        this.method = Objects.requireNonNull(method);
        this.calibrationStatus = Objects.requireNonNull(calibrationStatus);
        this.matchDistanceMeters = matchDistanceMeters;
    }

    /** Leitura de dispositivo: origem, local, método e calibração vêm do cadastro, nunca da requisição. */
    public static Observation fromDevice(Device device, String externalId, String sessionId, Instant observedAt,
                                         double durationSeconds, double laeqDbA, Instant receivedAt) {
        return new Observation(device.getSource().getId(), device.getSource().getOrigin(), device.getLocation().getId(),
                device.getId(), null, device.getId().toString(), sessionId, externalId, observedAt, receivedAt,
                durationSeconds, laeqDbA, device.getMethod(), device.getCalibrationStatus(), null);
    }

    /** Ponto de arquivo público associado a um local a até a distância máxima configurada. */
    public static Observation fromImport(UUID batchId, Source source, UUID locationId, double distanceMeters,
                                         String producerId, String externalId, String sessionId, Instant observedAt,
                                         double durationSeconds, double laeqDbA, ObservationMethod method,
                                         CalibrationStatus calibration, Instant receivedAt) {
        return new Observation(source.getId(), source.getOrigin(), locationId, null, Objects.requireNonNull(batchId),
                producerId, sessionId, externalId, observedAt, receivedAt, durationSeconds, laeqDbA, method,
                calibration, distanceMeters);
    }

    public static boolean validLevel(double value) {
        return Double.isFinite(value) && value >= MIN_DB_A && value <= MAX_DB_A;
    }

    public static boolean validDuration(double value) {
        return Double.isFinite(value) && value > 0 && value <= MAX_DURATION_SECONDS;
    }

    /**
     * Mesma medição reenviada (retry idêntico): mesmo produtor, local, sessão, instante, duração e nível.
     * Qualquer diferença com a mesma fonte + externalId é conflito.
     */
    public boolean sameMeasurementAs(Observation other) {
        return sourceId.equals(other.sourceId) && externalId.equals(other.externalId)
                && Objects.equals(deviceId, other.deviceId) && locationId.equals(other.locationId)
                && producerId.equals(other.producerId) && sessionId.equals(other.sessionId)
                && observedAt.equals(other.observedAt)
                && Double.compare(durationSeconds, other.durationSeconds) == 0
                && Double.compare(laeqDbA, other.laeqDbA) == 0;
    }

    @Override
    public UUID getId() { return id; }
    public UUID getSourceId() { return sourceId; }
    public Origin getOrigin() { return origin; }
    public UUID getLocationId() { return locationId; }
    public UUID getDeviceId() { return deviceId; }
    public UUID getBatchId() { return batchId; }
    public String getProducerId() { return producerId; }
    public String getSessionId() { return sessionId; }
    public String getExternalId() { return externalId; }
    public Instant getObservedAt() { return observedAt; }
    public Instant getReceivedAt() { return receivedAt; }
    public double getDurationSeconds() { return durationSeconds; }
    public double getLaeqDbA() { return laeqDbA; }
    public ObservationMethod getMethod() { return method; }
    public CalibrationStatus getCalibrationStatus() { return calibrationStatus; }
    public Double getMatchDistanceMeters() { return matchDistanceMeters; }
}
