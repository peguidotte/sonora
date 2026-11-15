// Painel Sonora. A chave vive apenas nesta variável (memória da aba): nada em localStorage, cookies ou URL.
// Todos os dados vindos da API são inseridos com textContent, nunca como HTML.
"use strict";

const API = "/api/sonora/v1";
const SAO_PAULO_OFFSET = "-03:00"; // Brasil sem horário de verão desde 2019; a API agrupa em America/Sao_Paulo.
let apiKey = null;

const $ = (id) => document.getElementById(id);

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

async function api(path) {
  const response = await fetch(API + path, { headers: { "X-Api-Key": apiKey }, cache: "no-store" });
  if (response.status === 204) return { status: 204, body: null };
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function describeError(result) {
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

function toUtcIso(date, addDays) {
  const local = new Date(`${date}T00:00:00${SAO_PAULO_OFFSET}`);
  local.setUTCDate(local.getUTCDate() + addDays);
  return local.toISOString().replace(".000Z", "Z");
}

function setDefaultDates() {
  const today = new Date();
  const week = new Date(today.getTime() - 6 * 86400000);
  $("to").value = today.toISOString().slice(0, 10);
  $("from").value = week.toISOString().slice(0, 10);
}

async function connect(event) {
  event.preventDefault();
  apiKey = $("api-key").value.trim();
  $("api-key").value = "";
  const status = $("access-status");
  status.className = "muted";
  status.textContent = "Conectando…";
  const result = await api("/locations?pageSize=100");
  if (result.status !== 200) {
    apiKey = null;
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
  loadDevices();
  loadSummary();
}

function disconnect() {
  apiKey = null;
  for (const id of ["query-card", "profile-card", "extra-card"]) $(id).hidden = true;
  $("disconnect").hidden = true;
  $("access-status").textContent = "Chave descartada desta aba.";
}

async function loadProfile(event) {
  event.preventDefault();
  const params = new URLSearchParams({
    from: toUtcIso($("from").value, 0),
    to: toUtcIso($("to").value, 1),
    origin: $("origin").value,
    aggregation: $("aggregation").value,
  });
  const result = await api(`/locations/${encodeURIComponent($("location").value)}/noise-profile?${params}`);
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

async function loadDevices() {
  const list = $("devices");
  list.replaceChildren();
  const result = await api("/devices");
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

async function loadSummary() {
  const list = $("ml-groups");
  list.replaceChildren();
  const result = await api("/analytics/summary");
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
