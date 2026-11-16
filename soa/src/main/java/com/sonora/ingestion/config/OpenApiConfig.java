package com.sonora.ingestion.config;

import java.util.List;
import com.sonora.ingestion.security.ApiKeyInterceptor;
import com.sonora.ingestion.security.RequiredScope;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentação gerada a partir do código em /api/ingestion/v1/openapi.json (operations:read).
 * x-required-scopes vem da mesma anotação que o interceptor aplica; um teste confronta o documento
 * gerado com contracts/openapi/soa.openapi.json.
 */
@Configuration
public class OpenApiConfig {
    static final String SCHEME = "ApiKeyAuth";

    @Bean
    OpenAPI ingestionOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Sonora | Ingestion API").version("0.4.0").description(
                        "Private Java ingestion API. Validates device observations and public-file imports, deduplicates "
                                + "and commits to PostgreSQL. Does not call the C# API. Import counts describe database "
                                + "persistence, not HTTP delivery."))
                .components(new Components().addSecuritySchemes(SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name(ApiKeyInterceptor.HEADER)
                        .description("Opaque service-specific credential. Missing, invalid, revoked or expired: 401. "
                                + "Valid credential without required scope: 403. Never send credentials in URLs.")))
                .addSecurityItem(new SecurityRequirement().addList(SCHEME));
    }

    @Bean
    OperationCustomizer requiredScopes() {
        return (operation, handler) -> {
            RequiredScope scope = handler.getMethodAnnotation(RequiredScope.class);
            List<String> scopes = scope == null ? List.of() : List.of(scope.value());
            operation.addExtension("x-required-scopes", scopes);
            if (scope != null && scopes.isEmpty()) operation.setSecurity(List.of()); // Anônimo explícito.
            return operation;
        };
    }
}
