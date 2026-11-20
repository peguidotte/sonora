import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "@phosphor-icons/web/regular";
import "./style.css";
import "./architecture.css";

const components = {
  archive: [
    "file-archive",
    "Arquivo histórico",
    "NoiseCapture",
    "O Java importa arquivos públicos permitidos e preserva a procedência de cada observação histórica.",
  ],
  iot: [
    "broadcast",
    "Sensor de borda",
    "ESP32 / Wokwi",
    "A simulação envia janelas de nível acústico por HTTPS. As observações recebem a origem simulated.",
  ],
  mobile: [
    "device-mobile",
    "Aplicativo",
    "Mobile",
    "No aparelho, a pessoa escolhe local, período e origem. O aplicativo pede o perfil à API e mostra a cobertura observada.",
  ],
  panel: [
    "browser",
    "Painel e clientes",
    "Consulta externa",
    "O painel e os clientes autorizados pedem perfis à API com uma chave de leitura.",
  ],
  capture: [
    "funnel",
    "Recepção e validação",
    "SOA · Java",
    "Um envio do sensor e uma importação de arquivo entram por caminhos distintos. O Java verifica permissões, valida os campos e persiste as observações aceitas.",
  ],
  api: [
    "waveform",
    "Consulta de perfis",
    "API Sonora · C#",
    "A API recebe o pedido do cliente, lê as views do banco e calcula o perfil acústico e sua cobertura para a origem escolhida.",
  ],
  db: [
    "database",
    "Base de observações",
    "PostgreSQL",
    "O banco guarda locais, fontes e observações. O Java grava e o C# consulta as views com acesso de leitura. Dados históricos e simulados mantêm suas origens.",
  ],
  proxy: [
    "git-fork",
    "Entrada pública",
    "Proxy HTTPS",
    "Na VM Linux, o proxy recebe as conexões HTTPS e encaminha cada pedido ao serviço responsável pelo prefixo da rota.",
  ],
} as const;
type NodeId = keyof typeof components;
type View = "flow" | "infra";
type Edge = [NodeId, NodeId, string];
const edges: Record<View, Edge[]> = {
  flow: [
    ["archive", "capture", "Arquivo importado"],
    ["iot", "capture", "Envia leitura"],
    ["mobile", "api", "Pede perfil"],
    ["panel", "api", "Consulta"],
    ["capture", "db", "Grava"],
    ["api", "db", "Lê views"],
  ],
  infra: [
    ["iot", "proxy", "Envio HTTPS"],
    ["mobile", "proxy", "Consulta HTTPS"],
    ["proxy", "capture", "Ingestão"],
    ["proxy", "api", "Consultas"],
    ["capture", "db", "Escrita"],
    ["api", "db", "Leitura"],
  ],
};
const tours: Record<View, NodeId[]> = {
  flow: ["archive", "iot", "capture", "db", "mobile", "api", "panel"],
  infra: ["iot", "mobile", "proxy", "capture", "api", "db"],
};
const board = document.querySelector<HTMLElement>(".map-board")!;
const nodes = document.querySelector<HTMLElement>(".map-nodes")!;
const svg = document.querySelector<SVGSVGElement>(".map-lines")!;
const title = document.querySelector<HTMLElement>("#stage-title")!;
const narration = document.querySelector<HTMLElement>("#narration")!;
const play = document.querySelector<HTMLButtonElement>("#play")!;
let view: View = "flow",
  selected: NodeId | null = null,
  timer: number | undefined;
const ns = "http://www.w3.org/2000/svg";

function draw() {
  const bounds = board.getBoundingClientRect();
  const boxes = new Map<NodeId, DOMRect>();
  nodes
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((el) =>
      boxes.set(el.dataset.node as NodeId, el.getBoundingClientRect()),
    );
  if (view === "infra")
    board.style.setProperty(
      "--host-top",
      boxes.get("proxy")!.top - bounds.top - 12 + "px",
    );
  svg.querySelectorAll("g").forEach((el) => el.remove());

  for (const [from, to, label] of edges[view]) {
    const a = boxes.get(from)!,
      b = boxes.get(to)!;
    const down = a.top < b.top;
    const x1 = a.left - bounds.left + a.width / 2,
      x2 = b.left - bounds.left + b.width / 2;
    const y1 = (down ? a.bottom : a.top) - bounds.top,
      y2 = (down ? b.top : b.bottom) - bounds.top;
    // Separate ports where two branches enter the same block.
    const siblings = edges[view].filter((e) => e[1] === to);
    const offset =
      siblings.length === 2
        ? (siblings[0][0] === from ? -1 : 1) * Math.min(36, b.width * 0.22)
        : 0;
    const end = x2 + offset,
      mid = (y1 + y2) / 2;
    const path = document.createElementNS(ns, "path");
    path.setAttribute(
      "d",
      `M ${x1} ${y1} V ${mid} H ${end} V ${y2 + (down ? -4 : 4)}`,
    );
    const active = selected === from || selected === to;
    path.setAttribute("marker-end", active ? "url(#arrow-on)" : "url(#arrow)");
    const group = document.createElementNS(ns, "g");
    group.classList.toggle("lit", active);
    group.append(path);
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String((x1 + end) / 2));
    text.setAttribute("y", String(mid - 7));
    text.textContent = label;
    group.append(text);
    svg.append(group);
  }
}
function update() {
  nodes
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.node === selected)),
    );
  title.textContent = selected
    ? components[selected][1]
    : view === "flow"
      ? "Duas entradas, uma base compartilhada."
      : "Uma VM Linux hospeda os serviços.";
  narration.textContent = selected
    ? components[selected][3]
    : view === "flow"
      ? "As setas indicam a entrada dos dados, as gravações e as consultas. Selecione um bloco para explorar seu papel."
      : "O sensor e o aplicativo ficam fora da VM. O proxy recebe o tráfego público e encaminha os pedidos aos serviços internos.";
  play.textContent = timer !== undefined ? "Ⅱ  Pausar" : "▶  Guiar pelo mapa";
  draw();
}
function stop() {
  clearInterval(timer);
  timer = undefined;
}
function show(next: View) {
  stop();
  view = next;
  selected = null;
  board.dataset.view = view;
  document
    .querySelectorAll<HTMLElement>("[data-map]")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.map === view)),
    );
  nodes.replaceChildren(
    ...tours[view].map((id) => {
      const [icon, name, tech] = components[id];
      const button = document.createElement("button");
      button.dataset.node = id;
      button.style.gridArea = id;
      button.innerHTML = `<i aria-hidden="true" class="ph ph-${icon}"></i><span><strong>${name}</strong><small>${tech}</small></span>`;
      button.onclick = () => {
        stop();
        selected = id;
        update();
      };
      return button;
    }),
  );
  update();
}
document
  .querySelectorAll<HTMLButtonElement>("[data-map]")
  .forEach((el) => (el.onclick = () => show(el.dataset.map as View)));
play.onclick = () => {
  if (timer !== undefined) stop();
  else {
    const order = tours[view];
    selected = order[0];
    timer = window.setInterval(() => {
      selected = order[order.indexOf(selected!) + 1];
      if (selected === order[order.length - 1]) stop();
      update();
    }, 3200);
  }
  update();
};
new ResizeObserver(draw).observe(nodes);
document.fonts.ready.then(draw);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stop();
    update();
  }
});
show("flow");
