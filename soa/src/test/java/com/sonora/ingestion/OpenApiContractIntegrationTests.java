package com.sonora.ingestion;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Documentação automática x contrato: o OpenAPI gerado pelo código precisa cobrir exatamente as rotas,
 * escopos, códigos de resposta e campos de request de contracts/openapi/soa.openapi.json.
 */
@EnabledIfEnvironmentVariable(named = "SONORA_DB_PASSWORD", matches = ".+")
class OpenApiContractIntegrationTests extends IntegrationTestBase {
    static final Path CONTRACT = Path.of("..", "contracts", "openapi", "soa.openapi.json");

    @Test
    void generatedDocumentRequiresOperationsScope() throws Exception {
        assertEquals(401, request("GET", "/openapi.json", null, null).status());
        assertEquals(403, request("GET", "/openapi.json", DEVICE_KEY, null).status());
        assertEquals(200, request("GET", "/openapi.json", READER_KEY, null).status());
    }

    @Test
    void generatedDocumentMatchesPublishedContract() throws Exception {
        JsonNode contract = json.readTree(Files.readString(CONTRACT));
        JsonNode generated = request("GET", "/openapi.json", READER_KEY, null).body();
        assertEquals(contract.at("/info/version").asString(), generated.at("/info/version").asString());
        assertEquals("X-Api-Key", generated.at("/components/securitySchemes/ApiKeyAuth/name").asString());

        assertEquals(operations(contract), operations(generated), "rotas e métodos");
        for (var path : contract.get("paths").properties()) {
            for (var op : path.getValue().properties()) {
                JsonNode mine = generated.get("paths").get(path.getKey()).get(op.getKey());
                String where = op.getKey().toUpperCase() + " " + path.getKey();
                assertEquals(op.getValue().get("operationId").asString(), mine.get("operationId").asString(), where);
                assertEquals(strings(op.getValue().get("x-required-scopes")), strings(mine.get("x-required-scopes")), where);
                Set<String> responses = new HashSet<>();
                mine.get("responses").propertyNames().forEach(responses::add);
                for (String code : op.getValue().get("responses").propertyNames()) {
                    assertTrue(responses.contains(code), where + " documenta " + code);
                }
                if (op.getValue().path("security").isArray() && op.getValue().get("security").isEmpty()) {
                    assertTrue(mine.get("security").isEmpty(), where + " anônimo");
                }
            }
        }
        for (String schema : new String[] {"ObservationIngest", "BatchRequest", "Batch", "IngestResult"}) {
            JsonNode expected = contract.at("/components/schemas/" + schema);
            JsonNode actual = generated.at("/components/schemas/" + schema);
            assertFalse(actual.isMissingNode(), schema);
            assertEquals(strings(expected.get("required")), strings(actual.get("required")), schema + ".required");
            assertEquals(new TreeSet<>(expected.get("properties").propertyNames()),
                    new TreeSet<>(actual.get("properties").propertyNames()), schema + ".properties");
            for (String property : expected.get("properties").propertyNames()) {
                JsonNode limit = expected.at("/properties/" + property + "/maxLength");
                if (!limit.isMissingNode()) {
                    assertEquals(limit.asInt(), actual.at("/properties/" + property + "/maxLength").asInt(), schema + "." + property);
                }
            }
        }
    }

    private static Set<String> operations(JsonNode document) {
        Set<String> result = new TreeSet<>();
        for (var path : document.get("paths").properties()) {
            for (String method : path.getValue().propertyNames()) result.add(method.toUpperCase() + " " + path.getKey());
        }
        return result;
    }

    private static Set<String> strings(JsonNode array) {
        Set<String> result = new TreeSet<>();
        if (array != null) array.forEach(item -> result.add(item.asString()));
        return result;
    }
}
