package com.sonora.ingestion.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebSecurityConfig implements WebMvcConfigurer {
    private final ApiKeyInterceptor apiKeys;

    public WebSecurityConfig(ApiKeyInterceptor apiKeys) { this.apiKeys = apiKeys; }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // /error é o despacho interno do servlet; as rotas públicas da API ficam todas sob o prefixo.
        registry.addInterceptor(apiKeys).addPathPatterns("/**").excludePathPatterns("/error");
    }
}
