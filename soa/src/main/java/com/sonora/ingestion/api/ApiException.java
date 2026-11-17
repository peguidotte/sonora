package com.sonora.ingestion.api;

/** Falha de negócio com status HTTP e código estável; a mensagem nunca carrega dados recebidos. */
public class ApiException extends RuntimeException {
    private final int status;
    private final String code;

    public ApiException(int status, String code, String message) {
        super(message, null, false, false);
        this.status = status;
        this.code = code;
    }

    public static ApiException badRequest(String message) { return new ApiException(400, "invalid_request", message); }
    public static ApiException forbidden(String code, String message) { return new ApiException(403, code, message); }
    public static ApiException notFound(String message) { return new ApiException(404, "not_found", message); }
    public static ApiException conflict(String message) { return new ApiException(409, "conflict", message); }
    public static ApiException unprocessable(String code, String message) { return new ApiException(422, code, message); }

    public int status() { return status; }
    public String code() { return code; }
}
