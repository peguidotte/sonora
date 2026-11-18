import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "@phosphor-icons/web/regular";
import "./style.css";
import "./architecture.css";

type Source = "iot" | "archive";
type Stage = {
  name: string;
  icon: string;
  action: string;
  title: string;
  text: string;
};
function journey(source: Source): Stage[] {
  const iot = source === "iot";
  return [
    iot
      ? {
          name: "ESP32 / Wokwi",
          icon: "cpu",
          action: "Borda simulada",
          title: "Uma janela de som vira observação.",
          text: "No Wokwi, o ESP32 simula uma leitura, identifica a sessão e envia o nível acústico e o horário ao Java por HTTPS. A mensagem contém dados numéricos.",
        }
      : {
          name: "NoiseCapture",
          icon: "archive",
          action: "Arquivo público",
          title: "O percurso começa em um arquivo histórico.",
          text: "As observações do NoiseCapture já têm local e horário. Um operador solicita ao Java a importação de um arquivo permitido e identifica a fonte pública.",
        },
    {
      name: "Java / SOA",
      icon: "funnel",
      action: iot ? "Validar envio" : "Validar lote",
      title: iot
        ? "O Java valida antes de gravar."
        : "O Java confere o arquivo e sua procedência.",
      text: iot
        ? "O serviço verifica a chave, o escopo de escrita, o dispositivo e os campos da observação. Um reenvio idêntico recupera o registro existente."
        : "O serviço verifica o escopo de importação, associa observações a locais pelo critério geográfico e contabiliza os registros aceitos e rejeitados.",
    },
    {
      name: "PostgreSQL",
      icon: "database",
      action: "Persistir",
      title: "A observação fica disponível para consulta.",
      text: "O Java grava a observação com local, horário e origem. As views publicadas no banco dão ao serviço C# acesso de leitura. As duas origens permanecem identificadas separadamente.",
    },
    {
      name: "API C#",
      icon: "brackets-curly",
      action: "Calcular perfil",
      title: "O pedido do aplicativo aciona a consulta.",
      text: "O Mobile solicita um local, um período e uma origem por HTTPS. O C# verifica a permissão de leitura, consulta as views e calcula o perfil por média energética, com a cobertura observada.",
    },
    {
      name: "Mobile",
      icon: "device-mobile",
      action: "Apresentar",
      title: "A pessoa vê o contexto do lugar.",
      text: "O aplicativo recebe a resposta do C# e apresenta o perfil acústico, sua origem e o período observado. Quando faltam observações, a tela indica ausência de dados.",
    },
  ];
}

const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const map = document.querySelector<HTMLElement>(".signal-map")!;
const play = element<HTMLButtonElement>("play");
const prev = element<HTMLButtonElement>("prev");
const next = element<HTMLButtonElement>("next");
let source: Source = "iot",
  step = 0,
  timer: number | undefined;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const stepButtons = journey(source).map((_, i) => {
  const button = document.createElement("button");
  button.className = "station";
  button.innerHTML =
    '<span class="station-icon"><i aria-hidden="true"></i></span><strong></strong><small></small>';
  button.addEventListener("click", () => select(i));
  map.append(button);
  return button;
});
function render() {
  const stages = journey(source);
  element("origin").textContent =
    source === "iot" ? "simulated" : "public_dataset";
  stepButtons.forEach((button, i) => {
    const stage = stages[i];
    button.setAttribute("aria-pressed", String(i === step));
    button.classList.toggle("visited", i < step);
    button.querySelector("i")!.className = "ph ph-" + stage.icon;
    button.querySelector("strong")!.textContent = stage.name;
    button.querySelector("small")!.textContent = stage.action;
  });
  element("phase").textContent = `ETAPA ${step + 1} DE ${stages.length}`;
  element("stage-title").textContent = stages[step].title;
  element("narration").textContent = stages[step].text;
  play.textContent =
    timer !== undefined
      ? "Ⅱ  Pausar"
      : step === 4
        ? "↺  Repetir percurso"
        : "▶  Reproduzir";
  prev.disabled = step === 0;
  next.disabled = step === 4;
}
function stop() {
  window.clearInterval(timer);
  timer = undefined;
}
function select(i: number) {
  stop();
  step = i;
  render();
}
document
  .querySelectorAll<HTMLButtonElement>("[data-source]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      source = button.dataset.source as Source;
      document
        .querySelectorAll("[data-source]")
        .forEach((el) =>
          el.setAttribute("aria-pressed", String(el === button)),
        );
      select(0);
    }),
  );
prev.onclick = () => select(step - 1);
next.onclick = () => select(step + 1);
play.onclick = () => {
  if (timer !== undefined) stop();
  else {
    if (step === 4) step = 0;
    timer = window.setInterval(() => {
      step++;
      if (step === 4) stop();
      render();
    }, 5000);
  }
  render();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) select(step);
});
reduced.addEventListener("change", () => select(step));
render();
