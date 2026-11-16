package com.sonora.ingestion.api.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class UnicodeTextValidator implements ConstraintValidator<UnicodeText, String> {
    private int min;
    private int max;

    @Override
    public void initialize(UnicodeText annotation) {
        min = annotation.min();
        max = annotation.max();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || valid(value, min, max); // Obrigatoriedade fica com @NotNull.
    }

    public static boolean valid(String value, int min, int max) {
        int codePoints = 0;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '\u0000') return false;
            if (Character.isHighSurrogate(c)) {
                if (i + 1 >= value.length() || !Character.isLowSurrogate(value.charAt(i + 1))) return false;
                i++;
            } else if (Character.isLowSurrogate(c)) {
                return false;
            }
            codePoints++;
        }
        return codePoints >= min && codePoints <= max;
    }
}
