package com.sonora.ingestion.api.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Texto armazenável no PostgreSQL com tamanho em code points, como o maxLength do JSON Schema e o
 * varchar(n) do banco. @Size contaria unidades UTF-16 (um emoji = 2) e rejeitaria texto válido.
 * Rejeita NUL e surrogates isolados, que o PostgreSQL não armazena; nunca trunca.
 */
@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UnicodeTextValidator.class)
public @interface UnicodeText {
    int min() default 1;
    int max();
    String message() default "must contain between {min} and {max} valid Unicode characters";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
