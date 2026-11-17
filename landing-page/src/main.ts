import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "@phosphor-icons/web/regular";
import "./style.css";
import { profileFor } from "./demo.mjs";
const icon = (name: string) =>
  `<i class="ph ph-${name}" aria-hidden="true"></i>`;
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="header"><a class="wordmark" href="#" aria-label="Sonora, início">${icon("waveform")}<span>sonora<span class="brand-dot">.</span></span></a><nav class="desktop-nav" aria-label="Navegação principal"><a href="#produto">O produto</a><a href="#experimente">Experimente</a><a href="#dispositivo">O dispositivo</a><a href="#modelo">Como funciona</a></nav><a class="button small header-cta" href="#experimente">Explore o Sonora ${icon("arrow-up-right")}</a><button class="menu-toggle icon-button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-nav">${icon("list")}</button></header>
<nav id="mobile-nav" class="mobile-nav" aria-label="Navegação móvel" hidden><a href="#produto">O produto</a><a href="#experimente">Experimente</a><a href="#dispositivo">O dispositivo</a><a href="#modelo">Como funciona</a></nav>
<main id="conteudo">
<section class="hero" aria-labelledby="hero-title"><div class="hero-art"><img src="./images/city.webp" alt="Ilustração conceitual de uma cidade atravessada por ondas azuis" width="1536" height="1024" fetchpriority="high"/><canvas id="wave-canvas" aria-hidden="true"></canvas></div><div class="hero-copy"><div class="eyebrow"><span class="line"></span> CONTEXTO ALÉM DO ENDEREÇO</div><h1 id="hero-title">Toda cidade<br/>tem camadas.<br/><span>Nós revelamos<br/>contexto.</span></h1><p>O lugar onde a vida acontece tem muito a dizer. Conheça sua paisagem sonora antes de tomar a próxima decisão.</p><a class="button" href="#experimente">Conheça o Sonora ${icon("arrow-right")}</a><div class="hero-note">Inteligência acústica para decisões imobiliárias.</div></div><div class="hero-caption"><span class="status-dot"></span> A cidade como você ainda não ouviu.<span>VISUALIZAÇÃO CONCEITUAL</span></div><button class="motion-button" id="motion-toggle" aria-pressed="false">${icon("pause")}<span>Pausar movimento</span></button></section>
<section id="produto" class="intro section"><div class="section-kicker">01 / O PRODUTO</div><div class="intro-grid"><h2>Um novo jeito<br/>de ler o lugar.</h2><div class="intro-detail"><p class="lead">Não é só sobre decibéis.<br/>É sobre <em>entender o contexto.</em></p><p>Sonora organiza observações acústicas em uma API privada. Fonte, período e cobertura acompanham os dados para ajudar plataformas imobiliárias a construir decisões mais informadas.</p></div></div><div class="principles"><article>${icon("map-pin-line")}<h3>O lugar, em perspectiva</h3><p>Contexto territorial para ir além das características de um imóvel.</p></article><article>${icon("clock")}<h3>O tempo faz diferença</h3><p>Explore como as observações variam entre períodos e fontes.</p></article><article>${icon("shield-check")}<h3>Dados, não gravações</h3><p>Sem armazenar áudio. Sem transformar falta de dados em certeza.</p></article></div></section>
<section id="experimente" class="experience section"><div class="section-kicker">02 / EXPLORE A EXPERIÊNCIA</div><div class="section-heading"><h2>Uma cidade.<br/><span>Muitas leituras.</span></h2><p>Mude o período e descubra como o Sonora apresenta uma paisagem sonora. Este exemplo é inteiramente simulado.</p></div><div class="demo"><div class="demo-map"><img src="./images/city.webp" alt="Cidade ilustrativa, sem representação de um endereço real" loading="lazy" width="1536" height="1024"/><div class="map-label">${icon("map-pin")} Local demonstrativo <span>NENHUM ENDEREÇO REAL</span></div><div class="map-pin" aria-hidden="true">${icon("waveform")}</div><div class="map-foot">Uma perspectiva sobre o ambiente.<br/>Não uma promessa de silêncio.</div></div><div class="demo-panel"><div class="demo-top"><span>PERFIL ACÚSTICO</span><span class="tag">Simulação</span></div><h3>O mesmo lugar.<br/>Em outro momento.</h3><div class="periods" role="group" aria-label="Período do exemplo"><button data-period="morning" aria-pressed="true">Manhã</button><button data-period="afternoon" aria-pressed="false">Tarde</button><button data-period="evening" aria-pressed="false">Noite</button><button data-period="empty" aria-pressed="false">Sem dados</button></div><div id="profile-output" aria-live="polite" aria-atomic="true"></div><div class="demo-foot">${icon("info")} Valores fictícios, em janelas de igual duração. Não representam medições ou cobertura do produto.</div></div></div></section>
<section id="dispositivo" class="device section"><div class="section-kicker">03 / UM OLHAR PARA O DISPOSITIVO</div><div class="device-grid"><div class="device-copy"><span class="tag">Conceito de design industrial</span><h2>Pequeno na forma.<br/><span>Parte de algo maior.</span></h2><p>Uma visão de como a captura poderia ganhar forma no mundo físico. Explore o conceito e entenda o papel de cada parte.</p><div class="device-controls" role="group" aria-label="Explorar partes do dispositivo"><button data-part="capture" aria-pressed="true"><span>01</span> Captura ${icon("arrow-up-right")}</button><button data-part="signal" aria-pressed="false"><span>02</span> Estado ${icon("arrow-up-right")}</button><button data-part="connection" aria-pressed="false"><span>03</span> Conexão ${icon("arrow-up-right")}</button></div><p class="device-disclaimer">O protótipo atual utiliza ESP32/Wokwi com dados simulados. Este gabinete é uma proposta visual, não hardware fabricado ou calibrado.</p></div><div class="device-stage"><img id="device-image" src="./images/device.webp" alt="Conceito de gabinete branco compacto com grelha de captura e indicador luminoso azul" loading="lazy" width="1536" height="1024"/><div class="device-detail" aria-live="polite"><span id="part-number">01 / CAPTURA</span><h3 id="part-title">Observar sem gravar.</h3><p id="part-description">O conceito representa a entrada acústica. O Sonora armazena observações e metadados, não arquivos de áudio.</p></div></div></div></section>
<section id="modelo" class="model section"><div class="section-kicker">04 / POR DENTRO DO SONORA</div><div class="section-heading"><h2>Do sinal<br/><span>à perspectiva.</span></h2><p>Uma arquitetura que mantém a origem à vista. Explore o caminho que transforma observações em contexto.</p></div><div class="flow" role="group" aria-label="Etapas da arquitetura"><button data-step="sources" aria-pressed="true"><span>01</span>${icon("broadcast")}<strong>Fontes</strong><small>IoT e arquivos públicos</small></button><button data-step="ingestion" aria-pressed="false"><span>02</span>${icon("funnel")}<strong>Ingestão</strong><small>Java / SOA</small></button><button data-step="database" aria-pressed="false"><span>03</span>${icon("database")}<strong>Observações</strong><small>PostgreSQL</small></button><button data-step="api" aria-pressed="false"><span>04</span>${icon("brackets-curly")}<strong>Contexto</strong><small>API C# / clientes</small></button></div><div class="flow-detail" aria-live="polite"><span id="step-label">01 / ORIGEM EXPLÍCITA</span><h3 id="step-title">Duas origens. Sem misturar evidências.</h3><p id="step-description">O ESP32/Wokwi transmite observações simuladas. Arquivos públicos históricos do NoiseCapture entram por importação. Cada origem mantém sua identidade ao longo de todo o fluxo.</p></div><a class="text-link" href="https://github.com/peguidotte/sonora/blob/main/docs/arquitetura.md" target="_blank" rel="noopener noreferrer">Explore a arquitetura no GitHub ${icon("arrow-up-right")}<span class="sr-only"> (abre em nova aba)</span></a></section>
<section class="faq section"><div><div class="section-kicker">TRANSPARÊNCIA POR DESIGN</div><h2>Contexto também<br/>é saber os limites.</h2></div><div class="questions"><details><summary>O Sonora garante um imóvel silencioso? ${icon("plus")}</summary><p>Não. Observações descrevem uma fonte e um período. Elas não garantem conforto interno, silêncio contínuo ou conformidade legal de um imóvel.</p></details><details><summary>Esses dados são reais? ${icon("plus")}</summary><p>Todos os dados deste demonstrador são fictícios. No produto, dados públicos históricos e observações simuladas são identificados e nunca agregados entre si.</p></details><details><summary>Como integrar à minha plataforma? ${icon("plus")}</summary><p>O modelo previsto é uma API privada autenticada. Este site demonstra a proposta e não emite chaves, envia formulários ou oferece contratação. Os contratos técnicos estão disponíveis no repositório.</p><a href="https://github.com/peguidotte/sonora/tree/main/contracts" target="_blank" rel="noopener noreferrer">Ver contratos (nova aba)</a></details><details><summary>Por que alguns períodos não têm leitura? ${icon("plus")}</summary><p>A cobertura depende das observações disponíveis. Sem dados, o Sonora informa essa ausência. Isso não equivale a zero decibéis ou ausência de ruído.</p></details></div></section>
<section class="closing"><div class="eyebrow">OLHE ALÉM DO ENDEREÇO</div><h2>O próximo capítulo<br/>começa com contexto.</h2><a class="button light" href="#experimente">Explore o Sonora ${icon("arrow-up-right")}</a><span>Uma visão de produto. Muitas possibilidades.</span></section>
</main><footer><a class="wordmark" href="#">${icon("waveform")}<span>sonora.</span></a><p>Produto Sonora · Marca institucional em definição.<br/>Projeto CitizenTech · FIAP</p><a href="https://github.com/peguidotte/sonora" target="_blank" rel="noopener noreferrer">Repositório ${icon("arrow-up-right")}<span class="sr-only"> (nova aba)</span></a><a href="#">Voltar ao topo ${icon("arrow-up")}</a></footer>`;

function updateProfile(key: string) {
  const profile = profileFor(key);
  const output = document.querySelector<HTMLElement>("#profile-output")!;
  const numeric =
    profile.level === null ? "—" : profile.level.toFixed(1).replace(".", ",");
  output.innerHTML = `<div class="reading"><strong>${numeric}</strong><span>${profile.level === null ? "Sem observações" : "dB(A) · LAeq demonstrativo"}</span></div><p class="period-label">${profile.period}</p><div class="chart ${profile.values.length ? "" : "empty-chart"}" role="img" aria-label="${profile.values.length ? "Valores simulados em decibéis: " + profile.values.join(", ") : "Não há dados para este período"}">${profile.values.length ? profile.values.map((v: number, i: number) => `<div class="bar-group"><div class="bar" style="height:${(v - 25) * 2}px"><span>${v}</span></div><small>${String((key === "morning" ? 6 : key === "afternoon" ? 12 : 18) + i).padStart(2, "0")}h</small></div>`).join("") : "<p>Nenhuma observação disponível.<br/>Sem dados ≠ silêncio.</p>"}</div><p class="profile-note">${profile.note}</p>`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-period]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.period === key)),
    );
}
document
  .querySelectorAll<HTMLButtonElement>("[data-period]")
  .forEach((b) =>
    b.addEventListener("click", () => updateProfile(b.dataset.period!)),
  );
updateProfile("morning");

const parts: Record<string, string[]> = {
  capture: [
    "01 / CAPTURA",
    "Observar sem gravar.",
    "O conceito representa a entrada acústica. O Sonora armazena observações e metadados, não arquivos de áudio.",
  ],
  signal: [
    "02 / ESTADO",
    "Saber se há sinal.",
    "No produto, o estado do dispositivo depende do recebimento das observações. A luz deste conceito é apenas uma indicação visual proposta.",
  ],
  connection: [
    "03 / CONEXÃO",
    "Um ponto na rede.",
    "O dispositivo envia observações para a ingestão Java com credencial vinculada à sua identidade. O gabinete ilustrado não implica conectividade já certificada.",
  ],
};
document.querySelectorAll<HTMLButtonElement>("[data-part]").forEach((b) =>
  b.addEventListener("click", () => {
    const [label, title, description] = parts[b.dataset.part!];
    document.querySelector("#part-number")!.textContent = label;
    document.querySelector("#part-title")!.textContent = title;
    document.querySelector("#part-description")!.textContent = description;
    document
      .querySelectorAll("[data-part]")
      .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
    document.querySelector<HTMLElement>(".device-stage")!.dataset.active =
      b.dataset.part;
  }),
);
const steps: Record<string, string[]> = {
  sources: [
    "01 / ORIGEM EXPLÍCITA",
    "Duas origens. Sem misturar evidências.",
    "O ESP32/Wokwi transmite observações simuladas. Arquivos públicos históricos do NoiseCapture entram por importação. Cada origem mantém sua identidade ao longo de todo o fluxo.",
  ],
  ingestion: [
    "02 / VALIDAÇÃO E INGESTÃO",
    "Cada observação encontra seu lugar.",
    "Java valida dados e credenciais, identifica repetições e persiste observações no PostgreSQL. Não há repasse HTTP para a API C#.",
  ],
  database: [
    "03 / PERSISTÊNCIA",
    "Um contrato compartilhado.",
    "PostgreSQL preserva observações e procedência. Views de leitura publicadas pelo módulo de banco permitem que a consulta C# acesse os dados sem alterá-los.",
  ],
  api: [
    "04 / LEITURA E CONTEXTO",
    "Pronto para outras perspectivas.",
    "A API privada C# consulta as views e calcula perfis acústicos. Clientes e aplicações recebem contexto acompanhado de origem, período e cobertura, sem expor credenciais de ingestão.",
  ],
};
document.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
  b.addEventListener("click", () => {
    const [label, title, description] = steps[b.dataset.step!];
    document.querySelector("#step-label")!.textContent = label;
    document.querySelector("#step-title")!.textContent = title;
    document.querySelector("#step-description")!.textContent = description;
    document
      .querySelectorAll("[data-step]")
      .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
  }),
);
const menu = document.querySelector<HTMLButtonElement>(".menu-toggle")!,
  nav = document.querySelector<HTMLElement>("#mobile-nav")!;
function closeMenu() {
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Abrir menu");
  nav.hidden = true;
}
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  nav.hidden = !open;
});
nav
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !nav.hidden) {
    closeMenu();
    menu.focus();
  }
});
matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
  if (e.matches) closeMenu();
});

// Procedural waves are a live visualization, not a replacement for the generated city artwork.
const canvas = document.querySelector<HTMLCanvasElement>("#wave-canvas")!,
  ctx = canvas.getContext("2d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let paused = reduce.matches,
  frame = 0,
  phase = 0,
  visible = true;
const motionButton =
  document.querySelector<HTMLButtonElement>("#motion-toggle")!;
function syncMotion() {
  motionButton.setAttribute("aria-pressed", String(paused));
  motionButton.innerHTML = `${icon(paused ? "play" : "pause")}<span>${paused ? "Ativar movimento" : "Pausar movimento"}</span>`;
  document.documentElement.classList.toggle("motion-paused", paused);
}
function resize() {
  const rect = canvas.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function draw() {
  if (!ctx) return;
  const { width: w, height: h } = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, w, h);
  for (let n = 0; n < 9; n++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 5) {
      const y =
        h * 0.63 +
        Math.sin((x / w) * Math.PI * 2.3 + phase + n * 0.035) * h * 0.1 +
        n * 5;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(92,163,255,${0.55 - n * 0.035})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (!paused && !document.hidden && visible) {
    phase += 0.007;
    frame = requestAnimationFrame(draw);
  }
}
function start() {
  cancelAnimationFrame(frame);
  draw();
}
motionButton.addEventListener("click", () => {
  paused = !paused;
  syncMotion();
  start();
});
reduce.addEventListener("change", (e) => {
  paused = e.matches;
  syncMotion();
  start();
});
document.addEventListener("visibilitychange", start);
new ResizeObserver(() => {
  resize();
  start();
}).observe(canvas);
new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  start();
}).observe(canvas);
syncMotion();
