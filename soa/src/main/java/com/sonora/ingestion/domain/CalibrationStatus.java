package com.sonora.ingestion.domain;

/** Situação de calibração informada pela fonte. Wokwi é sempre simulated; não se inventa calibração física. */
public enum CalibrationStatus implements WireValue {
    UNKNOWN("unknown"),
    SIMULATED("simulated"),
    DOCUMENTED("documented");

    private final String wire;

    CalibrationStatus(String wire) { this.wire = wire; }

    @Override
    public String wire() { return wire; }

    @jakarta.persistence.Converter(autoApply = true)
    public static class JpaConverter extends WireValue.Converter<CalibrationStatus> {
        public JpaConverter() { super(CalibrationStatus.class); }
    }
}
