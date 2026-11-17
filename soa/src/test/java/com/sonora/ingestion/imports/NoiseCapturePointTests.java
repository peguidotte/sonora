package com.sonora.ingestion.imports;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.sonora.ingestion.imports.LocationMatcher.Place;
import com.sonora.ingestion.imports.NoiseCapturePoint.Accepted;
import com.sonora.ingestion.imports.NoiseCapturePoint.Malformed;
import com.sonora.ingestion.imports.NoiseCapturePoint.Rejected;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

class NoiseCapturePointTests {
    static final UUID LOCATION = UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    static final double LAT = -23.546;
    static final double LON = -46.658;
    // ~0,000449° de latitude ≈ 50 m.
    final LocationMatcher matcher = new LocationMatcher(List.of(new Place(LOCATION, LAT, LON)), 50);
    final Instant latest = Instant.parse("2026-11-16T12:05:00Z");
    final JsonMapper json = JsonMapper.builder().build();

    JsonNode point(double lat, double lon, String extraProperties) {
        return json.readTree("""
                {"type":"Feature","geometry":{"type":"Point","coordinates":[%s,%s,770]},
                 "properties":{"pk_track":207250,"time_epoch":1557671202000,"noise_level":72.84,"accuracy":3.2%s}}
                """.formatted(lon, lat, extraProperties));
    }

    NoiseCapturePoint.Decision evaluate(JsonNode feature) {
        return NoiseCapturePoint.evaluate(feature, matcher, 50, latest);
    }

    @Test
    void acceptsPointNearLocationWithTraceableIds() {
        var decision = assertInstanceOf(Accepted.class, evaluate(point(LAT + 0.0001, LON, "")));
        var c = decision.candidate();
        assertEquals(LOCATION, c.locationId());
        assertEquals(11.1, c.distanceMeters(), 0.2);
        assertEquals("nc-207250-1557671202000", c.externalId());
        assertEquals("nc-track-207250", c.sessionId());
        assertEquals(Instant.parse("2019-05-12T14:26:42Z"), c.observedAt());
        assertEquals(72.84, c.laeqDbA());
    }

    @Test
    void appliesBusinessRejectionsWithoutAlteringData() {
        assertEquals(new Rejected(NoiseCapturePoint.NO_LOCATION), evaluate(point(LAT + 0.0006, LON, "")));
        assertEquals(new Rejected(NoiseCapturePoint.NOISE_SENTINEL_ZERO),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("72.84", "0.0"))));
        assertEquals(new Rejected(NoiseCapturePoint.NOISE_OUT_OF_RANGE),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("72.84", "140.5"))));
        assertEquals(new Rejected(NoiseCapturePoint.GPS_ACCURACY_TOO_LOW),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("3.2", "50.01"))));
        assertEquals(new Rejected(NoiseCapturePoint.GPS_ACCURACY_MISSING),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("3.2", "null"))));
        assertEquals(new Rejected(NoiseCapturePoint.OBSERVED_IN_FUTURE),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("1557671202000", "1900000000000"))));
    }

    @Test
    void classifiesMalformedFeatures() {
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_FEATURE), evaluate(json.readTree("[]")));
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_GEOMETRY),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("\"Point\"", "\"LineString\""))));
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_GEOMETRY), evaluate(point(-95, LON, "")));
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_TRACK),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("207250", "\"x\""))));
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_TIME),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("1557671202000", "1.5"))));
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_NOISE_LEVEL),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("72.84", "\"loud\""))));
        assertEquals(new Malformed(NoiseCapturePoint.INVALID_ACCURACY),
                evaluate(json.readTree(point(LAT, LON, "").toString().replace("3.2", "-1"))));
    }

    @Test
    void matcherPicksNearestWithinRadiusOnly() {
        UUID other = UUID.randomUUID();
        var two = new LocationMatcher(List.of(new Place(LOCATION, LAT, LON), new Place(other, LAT + 0.0003, LON)), 50);
        assertEquals(other, two.nearest(LAT + 0.00025, LON).orElseThrow().locationId());
        assertTrue(two.nearest(LAT + 0.0009, LON).isEmpty());
        assertTrue(new LocationMatcher(List.of(), 50).nearest(LAT, LON).isEmpty());
    }
}
