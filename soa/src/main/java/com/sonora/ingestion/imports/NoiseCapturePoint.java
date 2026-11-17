package com.sonora.ingestion.imports;

import java.time.Instant;
import java.util.UUID;
import com.sonora.ingestion.domain.GeoDistance;
import com.sonora.ingestion.domain.Observation;
import tools.jackson.databind.JsonNode;

/**
 * Regras de um ponto do arquivo "points.geojson" do NoiseCapture (1 ponto = LAeq de 1 s de um smartphone).
 * Resultado: aceito (com local associado), rejeitado por regra ou malformado. Nada é corrigido em silêncio.
 * Campos usados: geometry.coordinates [lon, lat], pk_track, time_epoch (ms), noise_level, accuracy (m).
 */
public final class NoiseCapturePoint {
    public static final double DURATION_SECONDS = 1;

    // Rejeições por regra (dado bem formado que não entra no produto).
    public static final String NOISE_SENTINEL_ZERO = "noise_level_sentinel_zero";
    public static final String NOISE_OUT_OF_RANGE = "noise_level_out_of_range";
    public static final String GPS_ACCURACY_MISSING = "gps_accuracy_missing";
    public static final String GPS_ACCURACY_TOO_LOW = "gps_accuracy_exceeds_distance";
    public static final String OBSERVED_IN_FUTURE = "observed_in_future";
    public static final String NO_LOCATION = "no_location_within_distance";
    public static final String CONFLICTING_DUPLICATE = "conflicting_duplicate";
    // Itens malformados (contam como erro do lote).
    public static final String INVALID_FEATURE = "invalid_feature";
    public static final String INVALID_GEOMETRY = "invalid_geometry";
    public static final String INVALID_TRACK = "invalid_track";
    public static final String INVALID_TIME = "invalid_time";
    public static final String INVALID_NOISE_LEVEL = "invalid_noise_level";
    public static final String INVALID_ACCURACY = "invalid_accuracy";

    private NoiseCapturePoint() {}

    public sealed interface Decision permits Accepted, Rejected, Malformed {}

    public record Accepted(Candidate candidate) implements Decision {}

    public record Rejected(String code) implements Decision {}

    public record Malformed(String code) implements Decision {}

    /** Ponto aceito. Identificadores derivam da trilha pública (sem dado pessoal). */
    public record Candidate(long track, long epochMillis, UUID locationId, double distanceMeters, double laeqDbA) {
        public Instant observedAt() { return Instant.ofEpochMilli(epochMillis); }
        public String externalId() { return "nc-" + track + "-" + epochMillis; }
        public String sessionId() { return "nc-track-" + track; }
        public String producerId() { return "noisecapture:track:" + track; }
    }

    public static Decision evaluate(JsonNode feature, LocationMatcher matcher, double maxDistanceMeters,
                                    Instant latestAllowed) {
        if (feature == null || !feature.isObject() || !feature.path("properties").isObject()) {
            return new Malformed(INVALID_FEATURE);
        }
        JsonNode geometry = feature.path("geometry");
        JsonNode coordinates = geometry.path("coordinates");
        if (!"Point".equals(geometry.path("type").asString("")) || !coordinates.isArray() || coordinates.size() < 2
                || !coordinates.get(0).isNumber() || !coordinates.get(1).isNumber()) {
            return new Malformed(INVALID_GEOMETRY);
        }
        double longitude = coordinates.get(0).doubleValue();
        double latitude = coordinates.get(1).doubleValue();
        if (!GeoDistance.validCoordinate(latitude, longitude)) return new Malformed(INVALID_GEOMETRY);

        JsonNode properties = feature.path("properties");
        JsonNode track = properties.path("pk_track");
        if (!(track.isInt() || track.isLong()) || track.longValue() < 0) return new Malformed(INVALID_TRACK);
        JsonNode epoch = properties.path("time_epoch");
        if (!(epoch.isInt() || epoch.isLong())) return new Malformed(INVALID_TIME);
        JsonNode noise = properties.path("noise_level");
        if (!noise.isNumber() || !Double.isFinite(noise.doubleValue())) return new Malformed(INVALID_NOISE_LEVEL);
        JsonNode accuracy = properties.path("accuracy");
        if (!accuracy.isMissingNode() && !accuracy.isNull()
                && (!accuracy.isNumber() || !Double.isFinite(accuracy.doubleValue()) || accuracy.doubleValue() < 0)) {
            return new Malformed(INVALID_ACCURACY);
        }

        double level = noise.doubleValue();
        // O dump tem níveis exatamente 0: tratados como sentinela de ausência, nunca como silêncio.
        if (level == 0) return new Rejected(NOISE_SENTINEL_ZERO);
        if (!Observation.validLevel(level)) return new Rejected(NOISE_OUT_OF_RANGE);
        if (accuracy.isMissingNode() || accuracy.isNull()) return new Rejected(GPS_ACCURACY_MISSING);
        // GPS mais impreciso que o raio de associação não sustenta afirmar que o ponto está no local.
        if (accuracy.doubleValue() > maxDistanceMeters) return new Rejected(GPS_ACCURACY_TOO_LOW);
        if (Instant.ofEpochMilli(epoch.longValue()).isAfter(latestAllowed)) return new Rejected(OBSERVED_IN_FUTURE);
        var match = matcher.nearest(latitude, longitude);
        if (match.isEmpty()) return new Rejected(NO_LOCATION);
        return new Accepted(new Candidate(track.longValue(), epoch.longValue(), match.get().locationId(),
                match.get().distanceMeters(), level));
    }
}
