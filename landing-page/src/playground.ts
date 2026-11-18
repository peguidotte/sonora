import "./playground.css";
import {
  choices,
  operations,
  scenarios,
  scenarioNames,
  simulateQuery,
} from "./playground-model.mjs";

export const playgroundHTML = `
<section id="api" class="api-lab section" aria-labelledby="api-title">
  <div class="section-kicker">PLAYGROUND / EXPLORE O CONTRATO</div>
  <div class="section-heading"><h2 id="api-title">Contexto pronto<br/><span>para integrar.</span></h2><p>Explore o contrato da API C#. Escolha uma operação e compare as respostas.</p></div>
  <div class="api-mode"><span class="api-mode-dot"></span><strong>Playground local · dados sintéticos</strong><span>Nenhuma requisição é enviada. Nenhuma chave é solicitada.</span></div>
  <div class="api-workbench">
    <form id="api-form" class="api-controls">
      <label for="api-endpoint">O que você quer consultar?</label>
      <select id="api-endpoint">${Object.entries(operations)
        .map(
          ([key, op]) =>
            `<option value="${key}" ${key === "profile" ? "selected" : ""}>${op.label}</option>`,
        )
        .join("")}</select>
      <details id="api-params"><summary>Parâmetros do exemplo</summary><div id="api-fields"></div></details>
      <div id="api-scenario-field"><label for="api-scenario">Cenário simulado</label><select id="api-scenario"></select></div>
      <p id="api-scope" class="api-scope">Escopo necessário: <code>acoustics:read</code></p>
      <button class="button api-run" type="submit"><i class="ph ph-play" aria-hidden="true"></i> Executar simulação</button>
      <p class="api-safety">Os parâmetros oferecem valores de exemplo do contrato v0.4.0. Não comprova disponibilidade de um servidor ou cobertura acústica.</p>
    </form>
    <div class="api-code-area">
      <div class="api-request-heading"><span class="api-method">GET</span><code id="api-path"></code></div>
      <div class="api-code-toolbar"><span>EXEMPLO cURL</span><button type="button" id="api-copy">Copiar <i class="ph ph-copy" aria-hidden="true"></i></button></div>
      <pre class="api-code" tabindex="0" aria-label="Comando cURL de exemplo"><code id="api-curl"></code></pre>
      <div class="api-response-heading"><span id="api-format">RESPOSTA</span><span id="api-status" role="status" aria-live="polite">Pronto para simular</span></div>
      <pre class="api-code api-response" tabindex="0" aria-label="Resposta simulada"><code id="api-response">Clique em Executar simulação para explorar a resposta.</code></pre>
    </div>
  </div>
  <div class="api-insights"><article><span>01</span><h3>O nível não conta tudo.</h3><p><code>laeqDbA</code> usa média energética. No exemplo, 60 e 70 dB em janelas iguais resultam em 67,40 dB, não 65.</p></article><article><span>02</span><h3>A cobertura vem junto.</h3><p><code>observedSeconds</code>, método e origem acompanham a leitura. Dez segundos observados não representam uma hora inteira.</p></article><article><span>03</span><h3>Ausência é informação.</h3><p><code>status: no_data</code> e <code>laeqDbA: null</code> significam falta de observações. Nunca silêncio ou zero decibéis.</p></article></div>
  <details class="api-real"><summary>Como executar contra a API real? <i class="ph ph-arrow-down" aria-hidden="true"></i></summary><p>Execute a API C# e o PostgreSQL conforme o README do projeto. O cURL usa a URL local documentada e a variável <code>SONORA_API_KEY</code>, que você define apenas no seu terminal com uma credencial autorizada. Não cole segredos nesta página. A API não habilita CORS para navegadores externos, por isso esta documentação não tenta conectá-la nem permite configurar destinos arbitrários.</p><p>A documentação interativa Scalar está em <code>/dashboard/docs</code> no servidor C# em execução. <code>/api/sonora/v1/openapi.json</code> exige escopo <code>operations:read</code>. O health/live é anônimo e não comprova acesso ao banco.</p></details>
  <div class="api-doc-links"><a href="https://github.com/peguidotte/sonora/blob/main/api/README.md" target="_blank" rel="noopener noreferrer">Guia da API C# ↗<span class="sr-only"> (nova aba)</span></a><a href="https://github.com/peguidotte/sonora/blob/main/contracts/openapi/csharp.openapi.json" target="_blank" rel="noopener noreferrer">Contrato OpenAPI ↗<span class="sr-only"> (nova aba)</span></a></div>
</section>`;

export function initPlayground() {
  const root = document.querySelector<HTMLElement>("#api");
  if (!root) return;
  const endpoint = root.querySelector<HTMLSelectElement>("#api-endpoint")!;
  const fields = root.querySelector<HTMLElement>("#api-fields")!;
  const names = choices as Record<string, string[]>;
  const hints: Record<string, string> = {
    locationId: "UUID do local",
    from: "Início inclusivo · UTC",
    to: "Fim exclusivo · UTC, até 31 dias",
    origin: "Origem das observações",
    aggregation: "Agrupamento · padrão hour",
    page: "Página · a partir de 1",
    pageSize: "Itens por página · 1 a 100",
    latitude: "Latitude · −90 a 90",
    longitude: "Longitude · −180 a 180",
    radiusMeters: "Raio com coordenadas · 1 a 1000 m, padrão 500",
  };
  const scenario = root.querySelector<HTMLSelectElement>("#api-scenario")!;
  const status = root.querySelector<HTMLElement>("#api-status")!;
  const response = root.querySelector<HTMLElement>("#api-response")!;
  const copy = root.querySelector<HTMLButtonElement>("#api-copy")!;
  let current = simulateQuery("profile");
  function configure() {
    const op = operations[endpoint.value];
    fields.innerHTML = op.parameters
      .map(
        ({ name, required }: { name: string; required: boolean }) =>
          `<label for="param-${name}"><code>${name}</code> · ${required ? "obrigatório" : "opcional"}<small>${hints[name]}</small></label>
       <select id="param-${name}" name="${name}" ${names[name].length === 1 ? "disabled" : ""}>${names[name].map((value) => `<option value="${value}">${value || "Omitir"}</option>`).join("")}</select>`,
      )
      .join("");
    root!.querySelector<HTMLElement>("#api-params")!.hidden =
      !op.parameters.length;
    const options = scenarios(endpoint.value);
    scenario.replaceChildren(
      ...options.map(
        (key) =>
          new Option(scenarioNames[key as keyof typeof scenarioNames], key),
      ),
    );
    root!.querySelector<HTMLElement>("#api-scenario-field")!.hidden =
      options.length < 2;
    root!.querySelector("#api-scope")!.textContent = op.scope
      ? `Escopo necessário: ${op.scope}`
      : "Acesso anônimo";
    update();
  }
  function update() {
    const params = Object.fromEntries(
      Array.from(fields.querySelectorAll("select"), (el) => [
        el.name,
        el.value,
      ]),
    );
    current = simulateQuery(
      endpoint.value,
      params.origin,
      scenario.value,
      params,
    );
    root!.querySelector("#api-format")!.textContent = current.format;
    root!.querySelector("#api-path")!.textContent = current.path;
    root!.querySelector("#api-curl")!.textContent = current.curl;
    status.textContent = "Parâmetros atualizados · execute a simulação";
    status.dataset.kind = "idle";
    response.textContent =
      "A resposta anterior foi limpa. Execute a simulação com os parâmetros atuais.";
    copy.textContent = "Copiar";
  }
  endpoint.addEventListener("change", configure);
  fields.addEventListener("change", update);
  scenario.addEventListener("change", update);
  root.querySelector("#api-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    status.textContent = `${current.status} · resposta simulada`;
    status.dataset.kind = current.status < 300 ? "ok" : "error";
    response.textContent =
      current.body === null
        ? "204 No Content · sem corpo de resposta."
        : typeof current.body === "string"
          ? current.body
          : JSON.stringify(current.body, null, 2);
  });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(current.curl);
      copy.textContent = "Copiado";
    } catch {
      copy.textContent = "Selecione o comando para copiar";
    }
  });
  configure();
}
