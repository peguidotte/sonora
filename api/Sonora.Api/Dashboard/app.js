// Painel Sonora. A chave vive apenas na sessão em memória (aba): nada em localStorage, cookies ou URL.
// Todos os dados vindos da API são inseridos com textContent, nunca como HTML.
"use strict";

const API = "/api/sonora/v1";
const ZONE = "America/Sao_Paulo"; // mesmo fuso usado pela API para agrupar por hora/dia

// Sessão atual: chave + AbortController. Desconectar aborta tudo que estiver pendente, e cada resposta
// confere se ainda pertence à sessão (e, no perfil, à consulta mais recente) antes de tocar na tela.
let session = null;
let profileQuery = null;

const $ = (id) => document.getElementById(id);

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

async function api(owner, path, signal = owner.controller.signal) {
  try {
    const response = await fetch(API + path, { headers: { "X-Api-Key": owner.key }, cache: "no-store", signal });
    if (response.status === 204) return { status: 204, body: null };
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (error) {
    return { status: 0, body: null, aborted: error && error.name === "AbortError" };
  }
}

const isCurrent = (owner) => owner !== null && owner === session;

function describeError(result) {
  if (result.status === 0) return "Não foi possível falar com a API (rede).";
  if (result.status === 401) return "Chave inválida, expirada ou revogada.";
  if (result.status === 403) return "A chave não tem permissão para este recurso.";
  if (result.status === 503) return "Banco de dados indisponível no momento.";
  return (result.body && result.body.message) || `Erro ${result.status}.`;
}

function formatDb(value) {
  return value === null || value === undefined ? "sem dado" : `${value.toFixed(1).replace(".", ",")} dB(A)`;
}

// A API mantém os textos do contrato em inglês (fixtures compartilhadas); o painel apenas os apresenta em PT-BR.
// Texto desconhecido (por exemplo, limitações gravadas pelas fontes) é exibido como veio.
const LIMITATIONS = [
  [/^No observations in the requested period\.$/, () => "Nenhuma observação no período consultado."],
  [/^Multiple producers or methods are reported as separate series; no combined level is given\.$/,
    () => "Há mais de um produtor ou método: cada série é mostrada separadamente e não há nível combinado."],
  [/^Only ([\d.]+) seconds observed; this does not represent the entire (hour|day|requested period)\.$/,
    (m) => `Apenas ${formatDuration(Number(m[1]))} observados; isso não representa ${
      { hour: "a hora inteira", day: "o dia inteiro", "requested period": "todo o período consultado" }[m[2]]}.`],
  [/^Synthetic values\.$/, () => "Valores sintéticos (simulação, não medição real)."],
  [/^Not a physical sound measurement\.$/, () => "Não é uma medição sonora física."],
];

function translate(text) {
  for (const [pattern, render] of LIMITATIONS) {
    const match = pattern.exec(text);
    if (match) return render(match);
  }
  return text;
}

const METHODS = { wokwi_linear_demo: "simulação linear Wokwi", noisecapture_1s: "NoiseCapture (1 s)" };
const CALIBRATION = { unknown: "desconhecida", simulated: "simulada", documented: "documentada" };

function formatDuration(totalSeconds) {
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds} s`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (minutes) parts.push(`${minutes} min`);
  if (!days && seconds % 60) parts.push(`${seconds % 60} s`);
  return parts.join(" ");
}

function localLabel(isoUtc, aggregation, short) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(isoUtc)).map((part) => [part.type, part.value]));
  if (aggregation === "day") return `${parts.day}/${parts.month}`;
  return short ? `${parts.hour}h` : `${parts.day}/${parts.month} ${parts.hour}h`;
}

// Datas do formulário são dias civis de São Paulo. A conversão usa as regras reais do fuso (Intl), então
// períodos com horário de verão (até fev/2019, presentes nos dados públicos) e o dia sem meia-noite saem certos.
const zoneParts = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hourCycle: "h23",
});

function zoneDate(instant) {
  const parts = Object.fromEntries(zoneParts.formatToParts(instant).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Primeiro instante do dia civil em São Paulo (00:00, ou 01:00 no dia em que o relógio pulava a meia-noite).
// Os deslocamentos do fuso são horas inteiras entre UTC−2 e UTC−3, então passos de 30 min a partir de 00:00Z bastam.
function startOfZoneDay(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  for (let t = Date.UTC(year, month - 1, day); t <= Date.UTC(year, month - 1, day, 6); t += 1800000) {
    if (zoneDate(new Date(t)) === isoDate) return new Date(t);
  }
  throw new RangeError(`Data inválida: ${isoDate}`);
}

function toUtcIso(isoDate, plusDays) {
  return startOfZoneDay(addDays(isoDate, plusDays)).toISOString().replace(".000Z", "Z");
}

function setDefaultDates() {
  const today = zoneDate(new Date());
  $("to").value = today;
  $("from").value = addDays(today, -6);
}

function clearData() {
  for (const id of ["location", "profile-summary", "profile-series", "profile-limitations", "profile-sources",
    "devices", "ml-groups"]) $(id).replaceChildren();
  for (const id of ["devices-status", "ml-status"]) $(id).textContent = "";
}

async function connect(event) {
  event.preventDefault();
  if (session) session.controller.abort();
  const owner = { key: $("api-key").value.trim(), controller: new AbortController() };
  session = owner;
  $("api-key").value = "";
  const status = $("access-status");
  status.className = "muted";
  status.textContent = "Conectando…";
  const result = await api(owner, "/locations?pageSize=100");
  if (!isCurrent(owner)) return; // desconectou (ou reconectou) enquanto esperava
  if (result.status !== 200) {
    session = null;
    status.className = "error";
    status.textContent = describeError(result);
    return;
  }
  const select = $("location");
  select.replaceChildren();
  for (const location of result.body.items) {
    const option = el("option", `${location.name} — ${location.city}${location.isDemo ? " (demonstração)" : ""}`);
    option.value = location.id;
    select.append(option);
  }
  status.textContent = `Conectado. ${result.body.total} local(is) disponível(is).`;
  $("query-card").hidden = false;
  $("extra-card").hidden = false;
  $("disconnect").hidden = false;
  loadDevices(owner);
  loadSummary(owner);
}

function disconnect() {
  if (session) session.controller.abort();
  session = null;
  profileQuery = null;
  for (const id of ["query-card", "profile-card", "extra-card"]) $(id).hidden = true;
  clearData();
  $("disconnect").hidden = true;
  $("access-status").className = "muted";
  $("access-status").textContent = "Chave descartada desta aba.";
}

async function loadProfile(event) {
  event.preventDefault();
  const owner = session;
  if (!owner) return;
  // Nova consulta cancela a anterior: uma resposta antiga nunca sobrescreve a mais recente.
  if (profileQuery) profileQuery.abort();
  const query = new AbortController();
  profileQuery = query;
  owner.controller.signal.addEventListener("abort", () => query.abort(), { once: true });
  const params = new URLSearchParams({
    from: toUtcIso($("from").value, 0),
    to: toUtcIso($("to").value, 1),
    origin: $("origin").value,
    aggregation: $("aggregation").value,
  });
  const result = await api(owner, `/locations/${encodeURIComponent($("location").value)}/noise-profile?${params}`,
    query.signal);
  if (!isCurrent(owner) || profileQuery !== query) return;
  const card = $("profile-card");
  card.hidden = false;
  const summary = $("profile-summary");
  summary.replaceChildren();
  $("profile-series").replaceChildren();
  $("profile-limitations").replaceChildren();
  $("profile-sources").replaceChildren();
  if (result.status !== 200) {
    summary.append(el("p", describeError(result), "error"));
    return;
  }
  renderProfile(result.body);
}

function metric(label, value) {
  const box = el("div", null, "metric");
  box.append(el("span", label), el("strong", value));
  return box;
}

function renderProfile(profile) {
  const observed = profile.series.flatMap((s) => s.bins).reduce((sum, bin) => sum + bin.observedSeconds, 0);
  $("profile-summary").append(
    metric("Nível equivalente (LAeq)", profile.status === "no_data" ? "sem dados" : formatDb(profile.laeqDbA)),
    metric("Tempo observado", formatDuration(observed)),
    metric("Séries", profile.series.length),
    metric("Origem", profile.origin === "simulated" ? "simulada" : "dados públicos"),
  );

  for (const series of profile.series) {
    const block = el("div", null, "series");
    block.append(el("p", `Produtor ${series.producerId} · método ${METHODS[series.method] || series.method}`
      + ` · calibração ${CALIBRATION[series.calibrationStatus] || series.calibrationStatus}`));
    block.append(renderChart(series, profile.aggregation));
    const details = el("details");
    details.append(el("summary", `Ver tabela (${series.bins.length} intervalo(s))`));
    const table = el("table");
    const head = el("tr");
    for (const title of ["Início (São Paulo)", "LAeq", "Observações", "Sessões", "Tempo observado"]) head.append(el("th", title));
    table.append(head);
    for (const bin of series.bins) {
      const row = el("tr");
      row.append(el("td", localLabel(bin.from, profile.aggregation)), el("td", formatDb(bin.laeqDbA)),
        el("td", bin.observationCount), el("td", bin.sessionCount), el("td", formatDuration(bin.observedSeconds)));
      table.append(row);
    }
    details.append(table);
    block.append(details);
    $("profile-series").append(block);
  }

  for (const limitation of profile.limitations) $("profile-limitations").append(el("li", translate(limitation)));
  if (profile.sources.length === 0) $("profile-sources").append(el("li", "Nenhuma fonte no período.", "muted"));
  for (const source of profile.sources) {
    const item = el("li", `${source.name} — licença: ${source.license}; recorte de ${formatDate(source.snapshotDate)}. `);
    item.append(el("span", source.limitations.map(translate).join(" "), "muted"));
    $("profile-sources").append(item);
  }
}

function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split("-");
  return day && month && year ? `${day}/${month}/${year}` : isoDate;
}

// Cada coluna leva barra e rótulo juntos, então rolar o gráfico nunca desalinha horário e valor.
// A régua de 20–100 dB(A) fica fixa à esquerda, fora da área que rola.
function renderChart(series, aggregation) {
  const wrapper = el("div", null, "chart-wrapper");
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", `Gráfico de ${series.bins.length} intervalo(s) com nível em dB(A); valores na tabela abaixo`);

  const axis = el("div", null, "axis");
  axis.setAttribute("aria-hidden", "true");
  for (const tick of [100, 80, 60, 40, 20]) axis.append(el("span", tick));
  axis.append(el("span", "dB(A)", "unit"));

  const scroller = el("div", null, "chart-scroll");
  scroller.tabIndex = 0;
  const chart = el("div", null, "chart");
  chart.setAttribute("aria-hidden", "true");
  let previousDay = null;
  for (const bin of series.bins) {
    const day = localLabel(bin.from, "day");
    const column = el("div", null, "column");
    if (aggregation === "hour" && day !== previousDay && previousDay !== null) column.classList.add("new-day");
    const plot = el("div", null, "plot");
    const fill = el("span", null, "fill");
    // Escala visual 20–100 dB(A) para evidenciar a variação; o valor exato fica no rótulo e na tabela.
    fill.style.height = `${Math.round(Math.max(1, Math.min(100, ((bin.laeqDbA - 20) / 80) * 100)) * 2)}px`; // 100% = 200px
    plot.append(el("span", bin.laeqDbA.toFixed(0), "value"), fill);
    column.title = `${localLabel(bin.from, aggregation)}: ${formatDb(bin.laeqDbA)}, ${formatDuration(bin.observedSeconds)} observados`;
    const tick = el("div", null, "tick");
    tick.append(el("span", localLabel(bin.from, aggregation, true)));
    if (aggregation === "hour") tick.append(el("span", day !== previousDay ? day : "", "day"));
    column.append(plot, tick);
    chart.append(column);
    previousDay = day;
  }
  scroller.append(chart);
  wrapper.append(axis, scroller);
  return wrapper;
}

async function loadDevices(owner) {
  const list = $("devices");
  list.replaceChildren();
  const result = await api(owner, "/devices");
  if (!isCurrent(owner)) return;
  if (result.status !== 200) {
    $("devices-status").textContent = describeError(result);
    return;
  }
  const names = { recent: "recebendo", stale: "sem envio recente", never_seen: "nunca enviou" };
  $("devices-status").textContent = `${result.body.items.length} dispositivo(s).`;
  for (const device of result.body.items) {
    list.append(el("li", `${device.name}: ${names[device.state] || device.state}${device.enabled ? "" : " (desabilitado)"}`));
  }
}

async function loadSummary(owner) {
  const list = $("ml-groups");
  list.replaceChildren();
  const result = await api(owner, "/analytics/summary");
  if (!isCurrent(owner)) return;
  if (result.status === 204) {
    $("ml-status").textContent = "Nenhum resumo de ML real importado ainda.";
    return;
  }
  if (result.status !== 200) {
    $("ml-status").textContent = describeError(result);
    return;
  }
  const summary = result.body;
  $("ml-status").textContent = `Modelo ${summary.modelVersion}, ${summary.sampleCount} amostras (${summary.city}).`;
  for (const group of summary.groups) list.append(el("li", `${group.id}: ${group.count} — ${group.description}`));
}

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
  $("access").addEventListener("submit", connect);
  $("disconnect").addEventListener("click", disconnect);
  $("query").addEventListener("submit", loadProfile);
});
