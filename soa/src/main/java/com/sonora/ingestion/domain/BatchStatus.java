package com.sonora.ingestion.domain;

/** Estados da importação. completed_with_errors indica itens malformados; rejeições por regra não são erro. */
public enum BatchStatus implements WireValue {
    CREATED("created"),
    PROCESSING("processing"),
    COMPLETED("completed"),
    COMPLETED_WITH_ERRORS("completed_with_errors"),
    FAILED("failed");

    private final String wire;

    BatchStatus(String wire) { this.wire = wire; }

    @Override
    public String wire() { return wire; }

    public boolean terminal() { return this == COMPLETED || this == COMPLETED_WITH_ERRORS || this == FAILED; }

    @jakarta.persistence.Converter(autoApply = true)
    public static class JpaConverter extends WireValue.Converter<BatchStatus> {
        public JpaConverter() { super(BatchStatus.class); }
    }
}
