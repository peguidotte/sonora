import "./playground.css";
import { simulateQuery } from "./playground-model.mjs";

export const playgroundHTML = `
<section id="api" class="api-lab section" aria-labelledby="api-title">
  <div class="section-kicker">05 / PARA QUEM CONSTRÓI</div>
  <div class="section-heading"><h2 id="api-title">Contexto pronto<br/><span>para integrar.</span></h2><p>Explore o contrato da API C#. Entenda a consulta, a resposta e o que cada campo quer dizer. Sem configurar nada.</p></div>
  <div class="api-mode"><span class="api-mode-dot"></span><strong>Playground local · dados sintéticos</strong><span>Nenhuma requisição é enviada. Nenhuma chave é solicitada.</span></div>
  <div class="api-workbench">
    <form id="api-form" class="api-controls">
      <label for="api-endpoint">O que você quer consultar?</label>
      <select id="api-endpoint"><option value="profile">Perfil acústico de um local</option><option value="locations">Locais cadastrados</option><option value="health">Estado do processo</option></select>
      <div id="api-profile-options"><label for="api-origin">Origem das observações</label><select id="api-origin"><option value="simulated">simulated · exemplo sintético</option><option value="public_dataset">public_dataset · sem dados nesta demo</option></select><div class="api-window"><span>JANELA FIXA DO EXEMPLO · UTC</span><code>2026-11-08 15:00:00 → 15:01:00</code><small>from inclusivo · to exclusivo · aggregation=hour</small></div></div>
      <div id="api-scenario-field"><label for="api-scenario">Explore um cenário</label><select id="api-scenario"><option value="available">Resposta disponível</option><option value="empty">Sem observações</option><option value="unauthorized">401 · chave ausente ou inválida</option><option value="forbidden">403 · escopo insuficiente</option></select></div>
      <p id="api-scope" class="api-scope">Escopo necessário: <code>acoustics:read</code></p>
      <button class="button api-run" type="submit"><i class="ph ph-play" aria-hidden="true"></i> Executar simulação</button>
      <p class="api-safety">O exemplo usa o contrato v0.4.0. Não comprova disponibilidade de um servidor ou cobertura acústica.</p>
    </form>
    <div class="api-code-area">
      <div class="api-request-heading"><span class="api-method">GET</span><code id="api-path"></code></div>
      <div class="api-code-toolbar"><span>EXEMPLO cURL</span><button type="button" id="api-copy">Copiar <i class="ph ph-copy" aria-hidden="true"></i></button></div>
      <pre class="api-code" tabindex="0" aria-label="Comando cURL de exemplo"><code id="api-curl"></code></pre>
      <div class="api-response-heading"><span>RESPOSTA JSON</span><span id="api-status" role="status" aria-live="polite">Pronto para simular</span></div>
      <pre class="api-code api-response" tabindex="0" aria-label="Resposta simulada JSON"><code id="api-response">Clique em Executar simulação para explorar a resposta.</code></pre>
    </div>
  </div>
  <div class="api-insights"><article><span>01</span><h3>O nível não conta tudo.</h3><p><code>laeqDbA</code> usa média energética. No exemplo, 60 e 70 dB em janelas iguais resultam em 67,40 dB, não 65.</p></article><article><span>02</span><h3>A cobertura vem junto.</h3><p><code>observedSeconds</code>, método e origem acompanham a leitura. Dez segundos observados não representam uma hora inteira.</p></article><article><span>03</span><h3>Ausência é informação.</h3><p><code>status: no_data</code> e <code>laeqDbA: null</code> significam falta de observações. Nunca silêncio ou zero decibéis.</p></article></div>
  <details class="api-real"><summary>Como executar contra a API real? <i class="ph ph-arrow-down" aria-hidden="true"></i></summary><p>Execute a API C# e o PostgreSQL conforme o README do projeto. O cURL usa a URL local documentada e a variável <code>SONORA_API_KEY</code>, que você define apenas no seu terminal com uma credencial autorizada. Não cole segredos nesta página. A API não habilita CORS para navegadores externos, por isso esta landing não tenta conectá-la nem permite configurar destinos arbitrários.</p><p>A documentação interativa Scalar está em <code>/dashboard/docs</code> no servidor C# em execução. <code>/api/sonora/v1/openapi.json</code> exige escopo <code>operations:read</code>. O health/live é anônimo e não comprova acesso ao banco.</p></details>
  <div class="api-doc-links"><a href="https://github.com/peguidotte/sonora/blob/main/api/README.md" target="_blank" rel="noopener noreferrer">Guia da API C# ↗<span class="sr-only"> (nova aba)</span></a><a href="https://github.com/peguidotte/sonora/blob/main/contracts/openapi/csharp.openapi.json" target="_blank" rel="noopener noreferrer">Contrato OpenAPI ↗<span class="sr-only"> (nova aba)</span></a></div>
</section>`;

export function initPlayground() {
  const root = document.querySelector<HTMLElement>("#api");
  if (!root) return;
  const endpoint = root.querySelector<HTMLSelectElement>("#api-endpoint")!;
  const origin = root.querySelector<HTMLSelectElement>("#api-origin")!;
  const scenario = root.querySelector<HTMLSelectElement>("#api-scenario")!;
  const status = root.querySelector<HTMLElement>("#api-status")!;
  const response = root.querySelector<HTMLElement>("#api-response")!;
  const copy = root.querySelector<HTMLButtonElement>("#api-copy")!;
  let current = simulateQuery(endpoint.value, origin.value, scenario.value);
  function update() {
    current = simulateQuery(endpoint.value, origin.value, scenario.value);
    root!.querySelector<HTMLElement>("#api-profile-options")!.hidden =
      endpoint.value !== "profile";
    root!.querySelector<HTMLElement>("#api-scenario-field")!.hidden =
      endpoint.value === "health";
    root!.querySelector<HTMLElement>("#api-scope")!.textContent =
      endpoint.value === "health"
        ? "Sem autenticação · verifica somente o processo"
        : "Escopo necessário: acoustics:read";
    root!.querySelector("#api-path")!.textContent = current.path;
    root!.querySelector("#api-curl")!.textContent = current.curl;
    status.textContent = "Parâmetros atualizados · execute a simulação";
    status.dataset.kind = "idle";
    response.textContent =
      "A resposta anterior foi limpa. Execute a simulação com os parâmetros atuais.";
    copy.textContent = "Copiar";
  }
  [endpoint, origin, scenario].forEach((el) =>
    el.addEventListener("change", update),
  );
  root.querySelector("#api-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    status.textContent = `${current.status} · resposta simulada`;
    status.dataset.kind = current.status === 200 ? "ok" : "error";
    response.textContent = JSON.stringify(current.body, null, 2);
  });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(current.curl);
      copy.textContent = "Copiado";
    } catch {
      copy.textContent = "Selecione o comando para copiar";
    }
  });
  update();
}
