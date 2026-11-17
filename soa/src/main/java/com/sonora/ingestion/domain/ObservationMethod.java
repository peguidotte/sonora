package com.sonora.ingestion.domain;

/** Método de obtenção do nível. Métodos diferentes não são agregados juntos pelo consumidor. */
public enum ObservationMethod implements WireValue {
    /** ESP32/Wokwi: potenciômetro convertido linearmente em dB(A) simulado. */
    WOKWI_LINEAR_DEMO("wokwi_linear_demo"),
    /** NoiseCapture: LAeq de 1 segundo medido por smartphone, por ponto da trilha. */
    NOISECAPTURE_1S("noisecapture_1s");

    private final String wire;

    ObservationMethod(String wire) { this.wire = wire; }

    @Override
    public String wire() { return wire; }

    @jakarta.persistence.Converter(autoApply = true)
    public static class JpaConverter extends WireValue.Converter<ObservationMethod> {
        public JpaConverter() { super(ObservationMethod.class); }
    }
}
