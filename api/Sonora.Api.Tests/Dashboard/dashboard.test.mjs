// Regressão do JavaScript do painel, sem dependências: node api/Sonora.Api.Tests/Dashboard/dashboard.test.mjs
// DOM e fetch simulados; o fetch ignora o abort de propósito, para provar que as guardas de sessão/consulta
// bastam mesmo se a resposta chegar. Cobre datas em America/Sao_Paulo (com horário de verão histórico),
// desconexão com requisição pendente e respostas fora de ordem.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = readFileSync(process.argv[2] ?? new URL("../../Sonora.Api/Dashboard/app.js", import.meta.url), "utf8");

function makeElement(id) {
  return {
    id, children: [], hidden: false, value: "", className: "", textContent: "", title: "", tabIndex: 0, style: {},
    classList: { add() {} }, setAttribute() {}, addEventListener() {},
    append(...nodes) { this.children.push(...nodes); }, replaceChildren() { this.children = []; },
  };
}

function load(now) {
  const elements = new Map();
  const document = {
    getElementById: (id) => { if (!elements.has(id)) elements.set(id, makeElement(id)); return elements.get(id); },
    createElement: (tag) => makeElement(tag),
    addEventListener() {},
  };
  const pending = [];
  const fetch = (url) => new Promise((resolve) => pending.push({ url, resolve }));
  const RealDate = Date;
  const FixedDate = class extends RealDate { constructor(...a) { super(...(a.length ? a : [now ?? RealDate.now()])); } };
  FixedDate.UTC = RealDate.UTC; FixedDate.now = () => now ?? RealDate.now();
  const context = vm.createContext({ document, fetch, Intl, URLSearchParams, AbortController, console,
    Date: FixedDate, encodeURIComponent, String, Number, Object, Math, RangeError });
  vm.runInContext(source, context);
  return { context, $: document.getElementById, pending };
}

const reply = (status, body) => ({ status, json: async () => body });
const event = { preventDefault() {} };
const flush = () => new Promise((r) => setTimeout(r, 0));
const profileBody = (laeq) => ({ status: "available", laeqDbA: laeq, origin: "simulated", aggregation: "hour",
  series: [], limitations: [], sources: [] });

// 1) Datas: regras reais de America/Sao_Paulo.
{
  const { context } = load();
  const iso = (d, n) => vm.runInContext(`toUtcIso(${JSON.stringify(d)}, ${n})`, context);
  assert.equal(iso("2017-01-01", 0), "2017-01-01T02:00:00Z"); // horário de verão (UTC−2)
  assert.equal(iso("2017-10-15", 0), "2017-10-15T03:00:00Z"); // meia-noite inexistente: dia começa 01:00 (UTC−2)
  assert.equal(iso("2017-10-14", 1), "2017-10-15T03:00:00Z"); // fim exclusivo = início do dia seguinte
  assert.equal(iso("2017-02-18", 0), "2017-02-18T02:00:00Z"); // último dia de verão
  assert.equal(iso("2017-02-19", 0), "2017-02-19T03:00:00Z"); // volta para UTC−3
  assert.equal(iso("2026-11-14", 0), "2026-11-14T03:00:00Z"); // sem horário de verão
  assert.equal(iso("2026-12-31", 1), "2027-01-01T03:00:00Z"); // virada de ano
  console.log("ok datas históricas e atuais");
}

// 2) Datas padrão usam o dia de São Paulo, não o de UTC (22:30 local de 15/11 = 01:30Z de 16/11).
{
  const { context, $ } = load(Date.UTC(2026, 10, 16, 1, 30));
  vm.runInContext("setDefaultDates()", context);
  assert.equal($("to").value, "2026-11-15");
  assert.equal($("from").value, "2026-11-09");
  console.log("ok datas padrão no dia de São Paulo");
}

async function connected() {
  const app = load();
  app.$("api-key").value = "k";
  const connecting = vm.runInContext("connect", app.context)(event);
  app.pending.shift().resolve(reply(200, { total: 1, items: [{ id: "a", name: "A", city: "SP", isDemo: true }] }));
  await connecting;
  app.pending.splice(0).forEach((p) => p.resolve(reply(204))); // devices/summary
  await flush();
  for (const id of ["from", "to"]) app.$(id).value = "2026-11-10";
  app.$("location").value = "a"; app.$("origin").value = "simulated"; app.$("aggregation").value = "hour";
  return app;
}

// 3) Consulta pendente + desconectar: a resposta tardia não reabre o cartão nem escreve dados.
{
  const app = await connected();
  const loading = vm.runInContext("loadProfile", app.context)(event);
  vm.runInContext("disconnect()", app.context);
  app.pending.shift().resolve(reply(200, profileBody(60)));
  await loading;
  assert.equal(app.$("profile-card").hidden, true);
  assert.equal(app.$("profile-summary").children.length, 0);
  assert.equal(app.$("location").children.length, 0, "locais limpos ao desconectar");
  console.log("ok resposta tardia ignorada após desconectar");
}

// 4) Desconectar durante o connect: o formulário não reaparece.
{
  const app = load();
  app.$("api-key").value = "k";
  const connecting = vm.runInContext("connect", app.context)(event);
  vm.runInContext("disconnect()", app.context);
  app.pending.shift().resolve(reply(200, { total: 1, items: [{ id: "a", name: "A", city: "SP" }] }));
  await connecting;
  assert.equal(app.$("query-card").hidden, true);
  assert.equal(app.$("location").children.length, 0);
  console.log("ok connect interrompido não reabre o painel");
}

// 5) Respostas fora de ordem: vale a consulta mais recente.
{
  const app = await connected();
  const loadProfile = vm.runInContext("loadProfile", app.context);
  const first = loadProfile(event);
  const second = loadProfile(event);
  const [older, newer] = app.pending.splice(0);
  newer.resolve(reply(200, profileBody(70)));
  await second;
  older.resolve(reply(200, profileBody(40)));
  await first;
  const shown = app.$("profile-summary").children[0].children[1].textContent;
  assert.equal(shown, "70,0 dB(A)");
  console.log("ok resposta antiga não sobrescreve a nova");
}
