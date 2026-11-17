package com.sonora.ingestion.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import com.sonora.ingestion.api.ApiException;
import com.sonora.ingestion.api.dto.ObservationIngest;
import com.sonora.ingestion.domain.Device;
import com.sonora.ingestion.domain.Observation;
import com.sonora.ingestion.repository.DeviceRepository;
import com.sonora.ingestion.repository.ObservationRepository;
import com.sonora.ingestion.security.Credential;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Recebe leituras de dispositivo IoT. Ordem: vínculo da credencial -> regras de valor/tempo -> cadastro
 * do dispositivo -> deduplicação por fonte + externalId -> commit. Origem é sempre a da fonte cadastrada.
 */
@Service
public class ObservationIngestionService {
    static final Duration MAX_CLOCK_SKEW = Duration.ofMinutes(5);

    private final DeviceRepository devices;
    private final ObservationRepository observations;
    private final TransactionTemplate transaction;
    private final Clock clock;

    public ObservationIngestionService(DeviceRepository devices, ObservationRepository observations,
                                       TransactionTemplate transaction, Clock clock) {
        this.devices = devices;
        this.observations = observations;
        this.transaction = transaction;
        this.clock = clock;
    }

    public record Outcome(Observation observation, boolean duplicate) {}

    public Outcome ingest(Credential credential, ObservationIngest request) {
        if (!credential.boundTo(request.deviceId())) {
            throw ApiException.forbidden("forbidden", "Credential is not bound to this deviceId.");
        }
        if (!Observation.validLevel(request.laeqDbA()) || !Observation.validDuration(request.durationSeconds())) {
            throw ApiException.badRequest("laeqDbA must be 0-140 and durationSeconds in (0, 3600].");
        }
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        Instant observedAt;
        try {
            observedAt = Instant.parse(request.observedAt());
        } catch (java.time.format.DateTimeParseException invalidDate) {
            throw ApiException.badRequest("observedAt is not a valid UTC date-time.");
        }
        if (observedAt.isAfter(now.plus(MAX_CLOCK_SKEW))) {
            throw ApiException.unprocessable("observed_at_in_future", "observedAt is more than 5 minutes in the future.");
        }
        try {
            return transaction.execute(status -> store(request, observedAt, now));
        } catch (DataIntegrityViolationException concurrentRetry) {
            // Outra requisição gravou a mesma fonte + externalId entre a consulta e o INSERT.
            return transaction.execute(status -> store(request, observedAt, now));
        }
    }

    private Outcome store(ObservationIngest request, Instant observedAt, Instant now) {
        Device device = devices.findWithLocationAndSource(request.deviceId())
                .orElseThrow(() -> ApiException.forbidden("forbidden", "Device is not registered."));
        if (!device.isEnabled()) throw ApiException.forbidden("device_disabled", "Device is disabled.");
        Observation candidate = Observation.fromDevice(device, request.externalId(), request.sessionId(), observedAt,
                request.durationSeconds(), request.laeqDbA(), now);
        var existing = observations.findBySourceIdAndExternalId(candidate.getSourceId(), candidate.getExternalId());
        if (existing.isPresent()) {
            if (!existing.get().sameMeasurementAs(candidate)) {
                throw ApiException.conflict("externalId already stored with different content.");
            }
            devices.touchLastReceived(device.getId(), now);
            return new Outcome(existing.get(), true);
        }
        observations.saveAndFlush(candidate);
        devices.touchLastReceived(device.getId(), now);
        return new Outcome(candidate, false);
    }
}
