package com.sonora.ingestion.imports;

import java.io.InputStream;
import java.util.function.ObjLongConsumer;
import tools.jackson.core.JsonParser;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lê "features" de uma FeatureCollection em streaming: o arquivo da cidade (~280 mil pontos) nunca
 * é carregado inteiro na memória. Estrutura inválida interrompe a leitura com MalformedFileException.
 */
public final class GeoJsonFeatureReader {
    // O chamador fecha o stream (precisa terminar o hash do arquivo depois do parse).
    // Leitura de uma feature por vez: o restante do array não é "token sobrando" (padrão do Jackson 3).
    private final JsonMapper json = JsonMapper.builder().disable(StreamReadFeature.AUTO_CLOSE_SOURCE)
            .disable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    public static class MalformedFileException extends RuntimeException {
        public MalformedFileException(String message) { super(message, null, false, false); }
        public MalformedFileException(String message, Throwable cause) { super(message, cause); }
    }

    private static class ConsumerFailure extends RuntimeException {
        ConsumerFailure(RuntimeException cause) { super(cause); }
    }

    /** Entrega cada feature com seu índice (base 0) no arquivo. Retorna a quantidade lida. */
    public long read(InputStream input, ObjLongConsumer<JsonNode> consumer) {
        long index = 0;
        boolean sawFeatures = false;
        boolean featureCollection = false;
        try (JsonParser parser = json.createParser(input)) {
            if (parser.nextToken() != JsonToken.START_OBJECT) throw new MalformedFileException("GeoJSON root must be an object.");
            while (parser.nextToken() == JsonToken.PROPERTY_NAME) {
                String name = parser.currentName();
                JsonToken value = parser.nextToken();
                if ("type".equals(name)) {
                    featureCollection = value == JsonToken.VALUE_STRING && "FeatureCollection".equals(parser.getString());
                    if (!featureCollection) throw new MalformedFileException("GeoJSON root type must be FeatureCollection.");
                    continue;
                }
                if (!"features".equals(name)) {
                    parser.skipChildren();
                    continue;
                }
                if (value != JsonToken.START_ARRAY) throw new MalformedFileException("features must be an array.");
                sawFeatures = true;
                while (parser.nextToken() != JsonToken.END_ARRAY) {
                    JsonNode feature = json.readTree(parser);
                    try {
                        consumer.accept(feature, index++);
                    } catch (RuntimeException consumerFailure) {
                        throw new ConsumerFailure(consumerFailure);
                    }
                }
            }
            if (parser.currentToken() != JsonToken.END_OBJECT) throw new MalformedFileException("Truncated GeoJSON.");
            // Nada além de espaços depois do documento: conteúdo extra indica arquivo corrompido/concatenado.
            if (parser.nextToken() != null) throw new MalformedFileException("Unexpected content after GeoJSON document.");
        } catch (MalformedFileException malformed) {
            throw malformed;
        } catch (ConsumerFailure failure) {
            // Falha de quem processa (ex.: banco) não é arquivo malformado: propaga a causa original.
            throw (RuntimeException) failure.getCause();
        } catch (RuntimeException invalidJson) {
            throw new MalformedFileException("Invalid JSON at feature " + index + ".", invalidJson);
        }
        if (!featureCollection) throw new MalformedFileException("GeoJSON root type must be FeatureCollection.");
        if (!sawFeatures) throw new MalformedFileException("FeatureCollection without features.");
        return index;
    }
}
