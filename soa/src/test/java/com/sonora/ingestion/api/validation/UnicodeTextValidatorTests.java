package com.sonora.ingestion.api.validation;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UnicodeTextValidatorTests {
    private static final String EMOJI = "🔊"; // 1 code point, 2 unidades UTF-16.

    @Test
    void countsCodePointsLikeJsonSchemaAndPostgres() {
        assertTrue(UnicodeTextValidator.valid("a".repeat(128), 1, 128));
        assertFalse(UnicodeTextValidator.valid("a".repeat(129), 1, 128));
        assertTrue(UnicodeTextValidator.valid(EMOJI.repeat(128), 1, 128), "128 emojis = 256 chars Java, mas 128 caracteres");
        assertFalse(UnicodeTextValidator.valid(EMOJI.repeat(129), 1, 128));
        assertTrue(UnicodeTextValidator.valid("São Paulo ação", 1, 128));
    }

    @Test
    void rejectsEmptyNulAndBrokenSurrogates() {
        assertFalse(UnicodeTextValidator.valid("", 1, 128));
        assertFalse(UnicodeTextValidator.valid("a\u0000b", 1, 128));
        assertFalse(UnicodeTextValidator.valid("\uD83D", 1, 128));
        assertFalse(UnicodeTextValidator.valid("\uDD0Aa", 1, 128));
    }
}
