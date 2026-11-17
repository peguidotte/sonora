import "./device.css";
export const deviceMarkup = `
<section id="dispositivo" class="device-story section">
 <div class="section-kicker">03 / DO POSTE À PLATAFORMA</div>
 <div class="section-heading"><h2>Feito para fazer<br/><span>parte da cidade.</span></h2><p>Uma direção de produto para postes públicos, com uma alternativa para ambientes com tomada. Role para explorar o que existe por trás do conceito.</p></div>
 <div class="installation-switch" role="group" aria-label="Conceito de instalação"><button data-install="pole" aria-pressed="true">01 / Poste público</button><button data-install="outlet" aria-pressed="false">02 / Tomada</button></div>
 <p class="installation-note" id="installation-note">Prioridade de design: fixação em poste, instalação técnica e autorização do responsável pelo espaço público. Alimentação e proteção ambiental ainda precisam de engenharia e validação.</p>
 <div class="device-scrolly">
  <div class="device-sticky"><div class="device-visual" data-layer="mount"><img id="device-concept-image" src="./images/device-pole.webp" alt="Conceito visual do dispositivo Sonora para instalação em poste" width="1536" height="1024" loading="lazy"/><div id="device-canvas" role="img" aria-label="Modelo 3D conceitual Sonora: gabinete, sensor acústico, placa de processamento e suporte. A rolagem separa as peças e depois remonta o mesmo dispositivo."></div><div class="concept-label">SONORA / ESTUDO DE PRODUTO 01</div><div class="assembly-caption">MODELO CONCEITUAL • NÃO É HARDWARE FINAL</div><div class="device-motion-status" aria-hidden="true"><span id="device-motion-status-name">01 / INTEGRADO À CIDADE</span><span id="device-motion-status-progress">000</span></div></div>
  <div class="device-progress" role="group" aria-label="Ir para componente"><button data-component="mount" aria-pressed="true">01</button><button data-component="capture" aria-pressed="false">02</button><button data-component="processing" aria-pressed="false">03</button><button data-component="connection" aria-pressed="false">04</button><span id="component-label">Fixação e energia</span></div><p class="device-hint">Role para abrir, explorar e remontar. Volte para inverter.</p></div>
  <div class="device-chapters">
   <article id="component-mount" data-chapter="mount"><span>01 / FIXAÇÃO E ENERGIA</span><h3>Presença discreta.<br/>Instalação pensada.</h3><p id="mount-description">A proposta parte de um suporte dedicado para poste. A instalação depende de autorização, avaliação do local e uma solução elétrica definida por profissionais habilitados.</p><small>Sem classificação IP, alimentação ou certificação definidas nesta proposta.</small></article>
   <article id="component-capture" data-chapter="capture"><span>02 / ENTRADA ACÚSTICA</span><h3>O som entra.<br/>A gravação, não.</h3><p>A abertura frontal representa a captura acústica. O produto trabalha com observações e metadados, não com arquivos de áudio. Proteção contra vento e chuva ainda é parte do projeto a validar.</p><small>Vista explodida ilustrativa. Componentes não estão em escala técnica.</small></article>
   <article id="component-processing" data-chapter="processing"><span>03 / PROCESSAMENTO</span><h3>Do sinal<br/>à observação.</h3><p>O protótipo atual usa ESP32/Wokwi e dados simulados. O firmware organiza janelas de observação; a placa mostrada é uma representação conceitual, não o desenho eletrônico final.</p><small>Nenhuma precisão metrológica ou calibração é prometida pelo render.</small></article>
   <article id="component-connection" data-chapter="connection"><span>04 / CONEXÃO</span><h3>Uma peça.<br/>Uma rede de contexto.</h3><p>Observações seguem para a ingestão Java, com identidade e origem preservadas. PostgreSQL organiza os dados; a API C# transforma a leitura em contexto para outras aplicações.</p><small>Conectividade, gabinete e método de alimentação dependem da evolução do hardware.</small></article>
  </div>
 </div>
</section>`;
export function initDevice() {
  const image = document.querySelector<HTMLImageElement>(
    "#device-concept-image",
  )!;
  const visual = document.querySelector<HTMLElement>(".device-visual")!;
  const labels: Record<string, string> = {
    mount: "Fixação e energia",
    capture: "Entrada acústica",
    processing: "Processamento",
    connection: "Conexão",
  };
  let scene:
    | {
        setProgress: (p: number) => void;
        setInstallation: (mode: string) => void;
      }
    | undefined;
  let progressValue = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const loadScene = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      loadScene.disconnect();
      if (reduced.matches) return;
      try {
        const { createDeviceScene } = await import("./device-scene");
        scene = createDeviceScene(
          document.querySelector<HTMLElement>("#device-canvas")!,
        );
        scene.setInstallation(installation);
        scene.setProgress(progressValue);
        visual.classList.add("has-webgl");
      } catch {
        visual.classList.add("device-fallback");
      }
    },
    { rootMargin: "500px" },
  );
  loadScene.observe(visual);
  reduced.addEventListener("change", () => {
    visual.classList.toggle("motion-disabled", reduced.matches);
    if (!reduced.matches && !scene) loadScene.observe(visual);
  });
  let installation = "pole",
    active = "mount";
  function show(key: string) {
    active = key;
    visual.dataset.layer = key;
    document.querySelector("#component-label")!.textContent = labels[key];
    document
      .querySelectorAll<HTMLButtonElement>("[data-component]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.component === key)),
      );
    document
      .querySelectorAll<HTMLElement>("[data-chapter]")
      .forEach((e) => e.classList.toggle("active", e.dataset.chapter === key));
  }
  document.querySelectorAll<HTMLButtonElement>("[data-install]").forEach((b) =>
    b.addEventListener("click", () => {
      installation = b.dataset.install!;
      document
        .querySelectorAll<HTMLButtonElement>("[data-install]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      document.querySelector("#installation-note")!.textContent =
        installation === "pole"
          ? "Prioridade de design: fixação em poste, instalação técnica e autorização do responsável pelo espaço público. Alimentação e proteção ambiental ainda precisam de engenharia e validação."
          : "Alternativa conceitual para ambientes com tomada. Fonte, isolamento, tensão e segurança elétrica ainda precisam ser especificados; o render não é orientação de instalação.";
      document.querySelector("#mount-description")!.textContent =
        installation === "pole"
          ? "A proposta parte de um suporte dedicado para poste. A instalação depende de autorização, avaliação do local e uma solução elétrica definida por profissionais habilitados."
          : "Uma versão compacta poderia usar uma tomada disponível no ambiente. O formato final e a alimentação dependem de projeto elétrico e validação de segurança, sem intervenção improvisada na rede.";
      image.src = `./images/device-${installation}.webp`;
      image.alt =
        installation === "pole"
          ? "Conceito do dispositivo no poste"
          : "Conceito do dispositivo para tomada";
      scene?.setInstallation(installation);
      show("mount");
      document.querySelector("#component-mount")!.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
    }),
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-component]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        show(b.dataset.component!);
        document
          .querySelector(`#component-${b.dataset.component}`)!
          .scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "center",
          });
      }),
    );
  const chapters = Array.from(
    document.querySelectorAll<HTMLElement>("[data-chapter]"),
  );
  let scheduled = false;
  function update() {
    scheduled = false;
    const line = innerHeight * (innerWidth <= 700 ? 0.8 : 0.62);
    let closest = chapters[0];
    let distance = Infinity;
    for (const chapter of chapters) {
      const r = chapter.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - line);
      if (d < distance) {
        closest = chapter;
        distance = d;
      }
    }
    if (closest.dataset.chapter !== active) show(closest.dataset.chapter!);
    const first = chapters[0].getBoundingClientRect();
    const last = chapters[chapters.length - 1].getBoundingClientRect();
    const progress = Math.max(
      0,
      Math.min(
        1,
        (line - first.top - first.height / 2) /
          (last.top + last.height / 2 - first.top - first.height / 2),
      ),
    );
    progressValue = progress;
    if (!reduced.matches) scene?.setProgress(progress);
    document.querySelector("#device-motion-status-progress")!.textContent =
      String(Math.round(progress * 100)).padStart(3, "0");
    document.querySelector("#device-motion-status-name")!.textContent =
      progress < 0.15
        ? "01 / INTEGRADO À CIDADE"
        : progress < 0.42
          ? "02 / ABRINDO O CONCEITO"
          : progress < 0.7
            ? "03 / CADA CAMADA, UM PAPEL"
            : "04 / DE VOLTA AO TODO";
  }
  addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  show("mount");
  update();
  addEventListener("resize", update);
}
