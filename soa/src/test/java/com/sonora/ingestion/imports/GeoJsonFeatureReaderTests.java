package com.sonora.ingestion.imports;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GeoJsonFeatureReaderTests {
    private final GeoJsonFeatureReader reader = new GeoJsonFeatureReader();

    private List<Long> read(String json) {
        List<Long> indexes = new ArrayList<>();
        reader.read(new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)), (feature, index) -> {
            assertTrue(feature.isObject());
            indexes.add(index);
        });
        return indexes;
    }

    @Test
    void streamsFeaturesInOrderIgnoringOtherMembers() {
        String json = """
                {"type":"FeatureCollection","name":{"nested":[1,2]},"features":[
                {"type":"Feature","geometry":{"type":"Point","coordinates":[-46.6,-23.5,770]},"properties":{"pk_track":1}},
                {"type":"Feature","geometry":null,"properties":{}}
                ],"crs":"x"}
                """;
        assertEquals(List.of(0L, 1L), read(json));
    }

    @Test
    void rejectsStructurallyInvalidFiles() {
        assertThrows(GeoJsonFeatureReader.MalformedFileException.class, () -> read("[]"));
        assertThrows(GeoJsonFeatureReader.MalformedFileException.class, () -> read("{\"type\":\"FeatureCollection\"}"));
        assertThrows(GeoJsonFeatureReader.MalformedFileException.class, () -> read("{\"features\":{}}"));
        assertThrows(GeoJsonFeatureReader.MalformedFileException.class, () -> read("{\"features\":[{\"a\":1},"));
    }

    @Test
    void consumerFailureIsNotReportedAsMalformedFile() {
        var failure = new IllegalStateException("database down");
        var thrown = assertThrows(IllegalStateException.class, () -> reader.read(
                new ByteArrayInputStream("{\"features\":[{}]}".getBytes(StandardCharsets.UTF_8)),
                (feature, index) -> { throw failure; }));
        assertSame(failure, thrown);
    }
}
