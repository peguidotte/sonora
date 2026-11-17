package com.sonora.ingestion.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Política de acesso da rota. Lida pelo interceptor (autorização) e pelo OpenAPI (x-required-scopes),
 * então documentação e comportamento não divergem. Vazio = anônimo explícito. Sem anotação = negado.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiredScope {
    String[] value();
}
