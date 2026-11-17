import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "@phosphor-icons/web/regular";
import "./style.css";
import "./docs.css";
import { playgroundHTML, initPlayground } from "./playground";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<a class="skip" href="#docs-main">Pular para documentação</a>
<header class="docs-header"><a class="wordmark" href="./index.html"><i class="ph ph-waveform" aria-hidden="true"></i>sonora<span class="brand-dot">.</span></a><span class="docs-badge">API DOCS <small>v0.4.0</small></span><a href="./index.html">← Voltar ao produto</a></header>
<div class="docs-layout"><aside class="docs-sidebar"><span class="sidebar-caption">REFERÊNCIA C#</span><nav aria-label="Documentação"><a href="#docs-main">Visão geral</a><a href="#authentication">Autenticação</a><a href="#endpoints">Endpoints</a><a href="#api">Playground</a></nav><div class="sidebar-note"><span class="status-dot"></span> Sandbox local<p>Sem rede. Sem credenciais. Exemplos sintéticos.</p></div></aside>
<main id="docs-main" class="docs-main"><div class="docs-intro"><div class="section-kicker">CONSTRUA COM CONTEXTO</div><h1>Sonora <span>API Docs.</span></h1><p>A referência para transformar observações em contexto. Explore consultas da API privada C# sem precisar de uma chave nesta demonstração.</p><div class="docs-meta"><span>REST / JSON</span><span>X-Api-Key</span><span>Somente leitura</span></div></div>
<section id="authentication" class="docs-block"><h2>Autenticação</h2><p>Consultas privadas usam <code>X-Api-Key</code> com escopo <code>acoustics:read</code>. Nunca exponha uma chave de produção no código frontend. O playground abaixo apenas simula respostas.</p><pre><code>X-Api-Key: $SONORA_API_KEY</code></pre><p class="muted">O health/live é anônimo e verifica o processo, não a disponibilidade do banco.</p></section>
<section id="endpoints" class="docs-block"><h2>Explore os endpoints</h2><p>Selecione uma operação para abrir seu exemplo no playground. Esta referência guiada cobre três rotas; o contrato completo está no repositório.</p><div class="endpoint-index"><button data-route="profile"><b>GET</b><code>/api/sonora/v1/locations/{locationId}/noise-profile</code><span>Perfil acústico →</span></button><button data-route="locations"><b>GET</b><code>/api/sonora/v1/locations</code><span>Locais →</span></button><button data-route="health"><b>GET</b><code>/api/sonora/v1/health/live</code><span>Estado do processo →</span></button></div></section>
${playgroundHTML}<footer class="docs-footer"><a href="./index.html">← Voltar à landing</a><span>Sonora · Contrato C# · Exemplos, não medições</span></footer></main></div>`;
initPlayground();
document.querySelectorAll<HTMLButtonElement>("[data-route]").forEach((button) =>
  button.addEventListener("click", () => {
    const select = document.querySelector<HTMLSelectElement>("#api-endpoint")!;
    select.value = button.dataset.route!;
    select.dispatchEvent(new Event("change"));
    document
      .querySelector("#api")!
      .scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    select.focus({ preventScroll: true });
  }),
);
