package com.sonora.ingestion.domain;

/** Origem determinada pela ingestão a partir da fonte; nunca declarada pelo dispositivo. */
public enum Origin implements WireValue {
    SIMULATED("simulated"),
    PUBLIC_DATASET("public_dataset");

    private final String wire;

    Origin(String wire) { this.wire = wire; }

    @Override
    public String wire() { return wire; }

    @jakarta.persistence.Converter(autoApply = true)
    public static class JpaConverter extends WireValue.Converter<Origin> {
        public JpaConverter() { super(Origin.class); }
    }
}
