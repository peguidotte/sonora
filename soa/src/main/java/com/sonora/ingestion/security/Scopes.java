package com.sonora.ingestion.security;

/** Escopos da API Java (docs/arquitetura.md). acoustics:read pertence ao C# e não autoriza nada aqui. */
public final class Scopes {
    public static final String OBSERVATIONS_WRITE = "observations:write";
    public static final String IMPORTS_MANAGE = "imports:manage";
    public static final String OPERATIONS_READ = "operations:read";

    private Scopes() {}
}
