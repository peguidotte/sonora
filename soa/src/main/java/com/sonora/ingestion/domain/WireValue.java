package com.sonora.ingestion.domain;

import java.util.Arrays;
import jakarta.persistence.AttributeConverter;

/** Valor textual usado igualmente no PostgreSQL (CHECK) e no JSON dos contratos. */
public interface WireValue {
    String wire();

    static <E extends Enum<E> & WireValue> E parse(Class<E> type, String value) {
        return Arrays.stream(type.getEnumConstants())
                .filter(candidate -> candidate.wire().equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown " + type.getSimpleName() + " value."));
    }

    /** Conversor JPA genérico: grava o valor contratado, não o nome Java do enum. */
    abstract class Converter<E extends Enum<E> & WireValue> implements AttributeConverter<E, String> {
        private final Class<E> type;

        protected Converter(Class<E> type) { this.type = type; }

        @Override
        public String convertToDatabaseColumn(E value) { return value == null ? null : value.wire(); }

        @Override
        public E convertToEntityAttribute(String value) { return value == null ? null : parse(type, value); }
    }
}
