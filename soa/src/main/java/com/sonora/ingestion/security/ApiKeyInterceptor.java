package com.sonora.ingestion.security;

import java.io.IOException;
import java.util.Arrays;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Autentica e autoriza ANTES da leitura do corpo (o JSON só é desserializado depois do preHandle).
 * Ausente/inválida/revogada/expirada -> 401; válida sem escopo -> 403. Vínculo de dispositivo é
 * conferido no serviço de observações, onde o deviceId do corpo já está validado.
 */
@Component
public class ApiKeyInterceptor implements HandlerInterceptor {
    public static final String HEADER = "X-Api-Key";
    private final ApiKeyStore keys;

    public ApiKeyInterceptor(ApiKeyStore keys) { this.keys = keys; }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!(handler instanceof HandlerMethod method)) return true; // Rotas inexistentes seguem para o 404.
        String[] required = requiredScopes(method);
        if (required != null && required.length == 0) return true; // Anônimo declarado (liveness).
        var credential = keys.authenticate(request.getHeader(HEADER));
        if (credential.isEmpty()) {
            return deny(response, 401, "unauthorized", "Missing, invalid, revoked or expired API key.");
        }
        if (required == null || !Arrays.stream(required).allMatch(credential.get()::has)) {
            return deny(response, 403, "forbidden", "Authenticated credential lacks the required scope.");
        }
        request.setAttribute(Credential.REQUEST_ATTRIBUTE, credential.get());
        return true;
    }

    /** null = sem política declarada (negado por padrão). A documentação gerada exige operations:read. */
    static String[] requiredScopes(HandlerMethod method) {
        RequiredScope declared = method.getMethodAnnotation(RequiredScope.class);
        if (declared != null) return declared.value();
        if (method.getBeanType().getPackageName().startsWith("org.springdoc")) {
            return new String[] {Scopes.OPERATIONS_READ};
        }
        return null;
    }

    private static boolean deny(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
        return false;
    }
}
