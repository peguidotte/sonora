// Busca o OpenAPI protegido com a chave informada e entrega o documento já carregado ao Scalar.
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("docs-form");
  const status = document.getElementById("docs-status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("docs-key");
    const key = input.value.trim();
    input.value = "";
    status.textContent = "Carregando…";
    const response = await fetch("/api/sonora/v1/openapi.json", { headers: { "X-Api-Key": key }, cache: "no-store" });
    if (!response.ok) {
      status.textContent = response.status === 403
        ? "A chave não tem o escopo operations:read."
        : "Chave inválida, expirada ou revogada.";
      return;
    }
    const spec = await response.json();
    for (const node of document.querySelectorAll("header, main")) node.remove();
    window.Scalar.createApiReference("#docs", {
      content: spec,
      withDefaultFonts: false,
      hideClientButton: true,
      showDeveloperTools: "never",
      agent: { disabled: true },
      telemetry: false,
      baseServerURL: window.location.origin,
      authentication: { preferredSecurityScheme: "ApiKeyAuth", apiKey: { token: key } },
    });
  });
});
