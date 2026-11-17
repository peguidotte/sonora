// Dashboard "Risco Cidadão": HTML gerado a partir dos eventos reais do log.
// renderStaticPage() é usado pela demo CLI (print de evidência); renderLivePage()
// é servido pelo microserviço: formulário genérico (qualquer JSON) à esquerda,
// eventos reais à direita — mostra que o motor não está preso às fixtures.
import type { SecurityEvent } from "../risk/events.js";
import { CATEGORY_WEIGHT, type RiskReport } from "../risk/score.js";
import type { PiiCategory } from "../pii/rules.js";

export interface Preset {
  source: string;
  label: string;
  payloadJson: string;
}

const LINE_SEPARATOR = String.fromCharCode(8232);
const PARAGRAPH_SEPARATOR = String.fromCharCode(8233);

/** Serializa com segurança para dentro de um <script>: sem fechar a tag nem separadores de linha do JS. */
function toInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .split("<")
    .join("\\u003c")
    .split(">")
    .join("\\u003e")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}

const CATEGORY_LABEL: Record<PiiCategory, string> = {
  cpf: "CPF",
  rg: "RG",
  health: "Saúde",
  credential: "Credencial",
};

const LEVEL_HINT: Record<RiskReport["level"], string> = {
  verde: "Nenhum dado sensível foi bloqueado.",
  amarelo: "Há dados sensíveis bloqueados.",
  vermelho: "Risco alto: vários dados sensíveis bloqueados.",
};

const DARK_TOKENS = `
      color-scheme: dark;
      --bg: #0b1020; --surface: #131a2e; --surface-2: #1a2340; --border: #27314f;
      --text: #e8ecf6; --muted: #98a2bb; --accent: #9b83ff; --accent-soft: #261f4d;
      --green: #4ade80; --green-soft: #12301f; --amber: #fbbf24; --amber-soft: #3a2b0d;
      --red: #f87171; --red-soft: #3b1618; --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);`;

const PAGE_STYLE = `
  :root {
    color-scheme: light;
    --bg: #f4f6fb; --surface: #ffffff; --surface-2: #f0f3f9; --border: #e2e7f0;
    --text: #0f172a; --muted: #5b6577; --accent: #6d4aff; --accent-soft: #ece8ff;
    --green: #15803d; --green-soft: #dcfce7; --amber: #b45309; --amber-soft: #fef3c7;
    --red: #b91c1c; --red-soft: #fee2e2; --shadow: 0 1px 2px rgba(15,23,42,.05), 0 8px 24px rgba(15,23,42,.06);
  }
  @media (prefers-color-scheme: dark) {
    :root {${DARK_TOKENS}
    }
  }
  * { box-sizing: border-box; }
  body { font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; color: var(--text); background: var(--bg); line-height: 1.5; }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 32px 16px 48px; }
  .layout { display: grid; grid-template-columns: 380px minmax(0, 1fr); gap: 24px; align-items: start; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow); padding: 20px; }
  .coluna-eventos { display: grid; gap: 24px; min-width: 0; }
  h1, h2 { margin: 0; letter-spacing: -.01em; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.05rem; }
  .muted { color: var(--muted); font-size: .88rem; margin: 6px 0 0; }
  .hero { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; }
  .farol-badge { transition: color .6s ease, background-color .6s ease, box-shadow .6s ease; width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; font-size: 1.7rem; font-weight: 800; color: var(--tone); background: var(--tone-soft); box-shadow: 0 0 0 6px var(--tone-soft); margin: 6px; }
  .tone-verde { --tone: var(--green); --tone-soft: var(--green-soft); }
  .tone-amarelo { --tone: var(--amber); --tone-soft: var(--amber-soft); }
  .tone-vermelho { --tone: var(--red); --tone-soft: var(--red-soft); }
  .farol { transition: background-color .6s ease; display: inline-block; width: .7rem; height: .7rem; border-radius: 50%; margin-right: .5rem; background: var(--tone); vertical-align: middle; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
  .stat { background: var(--surface-2); border-radius: 12px; padding: 12px 14px; }
  .stat b { display: block; font-size: 1.35rem; line-height: 1.2; }
  .stat span { font-size: .78rem; color: var(--muted); }
  .scale { position: relative; height: 10px; border-radius: 999px; margin-top: 20px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
  .scale-fill { display: block; height: 100%; width: 0; border-radius: 999px; background: var(--tone); transition: width .9s cubic-bezier(.22,1,.36,1), background-color .6s ease; }
  .scale-tick { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--border); }
  .scale-legend { display: flex; justify-content: space-between; font-size: .72rem; color: var(--muted); margin-top: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .chip { display: inline-flex; gap: 6px; align-items: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; font-size: .8rem; }
  .chip em { font-style: normal; color: var(--muted); }
  .table-scroll { overflow-x: auto; margin-top: 14px; }
  table { border-collapse: collapse; width: 100%; font-size: .82rem; min-width: 760px; }
  th { text-align: left; font-weight: 600; color: var(--muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  .time { color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .74rem; font-weight: 600; white-space: nowrap; }
  .badge.bloqueado { color: var(--red); background: var(--red-soft); }
  .badge.permitido { color: var(--green); background: var(--green-soft); }
  .badge.neutro { color: var(--accent); background: var(--accent-soft); }
  .vazio { text-align: center; color: var(--muted); padding: 32px 10px; }
  label { display: block; font-size: .8rem; font-weight: 600; margin: 14px 0 6px; }
  input[type="text"], textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2); color: var(--text); font: inherit; }
  input[type="text"]:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  textarea { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .8rem; resize: vertical; }
  button { cursor: pointer; font: inherit; }
  button.primario { width: 100%; margin-top: 14px; padding: 10px 14px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font-weight: 600; }
  button.primario:hover { filter: brightness(1.1); }
  button.reiniciar { width: 100%; padding: 9px 14px; border: 1px solid var(--red); border-radius: 10px; background: transparent; color: var(--red); font-weight: 600; }
  button.reiniciar:hover { background: var(--red-soft); }
  .exemplos { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
  .exemplos p { font-size: .78rem; color: var(--muted); margin: 0 0 10px; }
  .exemplos button { display: block; width: 100%; text-align: left; font-size: .82rem; margin-bottom: 8px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2); color: var(--text); }
  .exemplos button:hover { border-color: var(--accent); }
  .ok-banner { display: flex; align-items: center; gap: 14px; background: var(--green-soft); color: var(--green); border: 1px solid var(--green); border-radius: 16px; padding: 14px 18px; animation: ok-in .5s cubic-bezier(.22,1,.36,1); }
  .ok-banner[hidden] { display: none; }
  .ok-banner strong { display: block; }
  .ok-banner span { font-size: .85rem; opacity: .9; }
  .ok-icon { flex: none; width: 36px; height: 36px; border-radius: 50%; background: var(--green); color: var(--surface); display: grid; place-items: center; font-weight: 800; animation: ok-pop .6s cubic-bezier(.34,1.56,.64,1) .1s both; }
  @keyframes ok-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  @keyframes ok-pop { from { transform: scale(0); } to { transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .ok-banner, .ok-icon { animation: none; } }
  .erro { background: var(--red-soft); color: var(--red); border: 1px solid var(--red); border-radius: 10px; padding: 10px 12px; font-size: .85rem; margin: 12px 0 0; }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    .hero { grid-template-columns: 1fr; justify-items: start; }
  }
`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRow(event: SecurityEvent): string {
  const badge = event.blocked
    ? '<span class="badge bloqueado">Bloqueado</span>'
    : '<span class="badge permitido">Permitido (sanitizado)</span>';
  return `
    <tr>
      <td class="time">${escapeHtml(event.timestamp)}</td>
      <td>${escapeHtml(event.source)}</td>
      <td>${escapeHtml(CATEGORY_LABEL[event.category] ?? event.category)}</td>
      <td>${escapeHtml(event.sink)}</td>
      <td>${badge}</td>
      <td>${escapeHtml(event.citizenMessage)}</td>
      <td><span class="badge neutro">${
        event.usedLlm ? "IA" : "Texto padrão"
      }</span></td>
    </tr>`;
}

function renderFarolEExplicacao(report: RiskReport): string {
  const markerPercent = Math.min(report.score, 10) * 10;
  const chips = (Object.keys(CATEGORY_WEIGHT) as PiiCategory[])
    .map((category) => {
      const count = report.byCategory[category];
      return `<span class="chip"><strong>${
        CATEGORY_LABEL[category]
      }</strong> ${count} × peso ${CATEGORY_WEIGHT[category]} <em>= ${
        count * CATEGORY_WEIGHT[category]
      }</em></span>`;
    })
    .join("");
  return `
  <section class="card tone-${report.level}" id="risk-card" data-score="${report.score}" data-level="${report.level}">
    <div class="hero">
      <div class="farol-badge" id="risk-badge">${report.score}</div>
      <div>
        <h1><span class="farol"></span><span id="risk-title">Risco Cidadão: ${report.level.toUpperCase()}</span></h1>
        <p class="muted">${
          LEVEL_HINT[report.level]
        } A pontuação soma o peso de cada evento bloqueado.</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>${report.score}</b><span>Pontuação</span></div>
      <div class="stat"><b>${
        report.blockedCount
      }</b><span>Bloqueados</span></div>
      <div class="stat"><b>${
        report.allowedCount
      }</b><span>Sanitizados e permitidos</span></div>
    </div>
    <div class="scale"><span class="scale-fill" style="width:${markerPercent}%"></span><span class="scale-tick" style="left:50%"></span></div>
    <div class="scale-legend"><span>0 · verde</span><span>1–4 · amarelo</span><span>5+ · vermelho (barra cheia em 10)</span></div>
    <div class="chips">${chips}</div>
  </section>`;
}

function renderEventsTable(events: readonly SecurityEvent[]): string {
  const rows =
    events.length > 0
      ? [...events].reverse().map(renderRow).join("\n")
      : '<tr><td colspan="7" class="vazio">Nenhum evento ainda. Envie um JSON ao lado para testar.</td></tr>';
  return `
  <section class="card">
    <h2>Eventos</h2>
    <p class="muted">Mais recentes primeiro.</p>
    <div class="table-scroll">
      <table>
        <thead>
          <tr><th>Quando</th><th>Fonte</th><th>Categoria</th><th>Sink</th><th>Status</th><th>Mensagem ao cidadão</th><th>Tradução</th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </section>`;
}

/** Página estática usada pela demo CLI (print de evidência). */
export function renderStaticPage(
  report: RiskReport,
  events: readonly SecurityEvent[]
): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Risco Cidadão — Sonora Cybersecurity (demo local)</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
  <div class="wrap">
    <div class="coluna-eventos">
      ${renderFarolEExplicacao(report)}
      ${renderEventsTable(events)}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Página interativa servida pelo microserviço. Esquerda: formulário genérico que aceita
 * qualquer fonte/payload JSON (o motor não está preso às fixtures), com botões que só
 * preenchem o formulário (não enviam sozinhos). Direita: eventos reais acumulados no log.
 */
export function renderLivePage(
  report: RiskReport,
  events: readonly SecurityEvent[],
  presets: readonly Preset[],
  options: { error?: string } = {}
): string {
  const presetButtons = presets
    .map(
      (preset, index) =>
        `<button type="button" onclick="fillPreset(${index})">Preencher: ${escapeHtml(
          preset.label
        )}</button>`
    )
    .join("\n        ");

  const presetsData = toInlineJson(
    presets.map((preset) => ({
      source: preset.source,
      payloadJson: preset.payloadJson,
    }))
  );

  const errorBlock = options.error
    ? `<p class="erro">${escapeHtml(options.error)}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Risco Cidadão — Sonora Cybersecurity (microserviço)</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
  <div class="wrap">
    <div class="layout">
      <aside class="card">
        <h2>Testar o serviço</h2>
        <p class="muted">Cole um JSON qualquer. O motor procura dados sensíveis pelo conteúdo e pelo nome dos campos.</p>
        ${errorBlock}
        <form method="post" action="/dashboard/run-custom">
          <label for="source">Fonte</label>
          <input type="text" id="source" name="source" placeholder="ex: mobile-form" />
          <label for="payload">Payload (JSON)</label>
          <textarea id="payload" name="payload" rows="9" placeholder='{"campoQualquer": "valor aleatório", "operatorCpf": "529.982.247-25"}'></textarea>
          <button type="submit" class="primario">Analisar</button>
        </form>
        <div class="exemplos">
          <p>Exemplos prontos (só preenchem os campos):</p>
          ${presetButtons}
        </div>
        <form method="post" action="/dashboard/reset" style="margin-top:8px">
          <button type="submit" class="reiniciar">Reiniciar log</button>
        </form>
      </aside>
      <main class="coluna-eventos" data-events="${events.length}">
        <div class="ok-banner" id="safe-banner" role="status" hidden>
          <div class="ok-icon">✓</div>
          <div><strong>Análise segura</strong><span>Nenhum dado sensível encontrado neste payload.</span></div>
        </div>
        ${renderFarolEExplicacao(report)}
        ${renderEventsTable(events)}
      </main>
    </div>
  </div>
  <script>
    const PRESETS = ${presetsData};
    function fillPreset(index) {
      const preset = PRESETS[index];
      if (!preset) return;
      document.getElementById("source").value = preset.source;
      document.getElementById("payload").value = preset.payloadJson;
    }
    // Animação da barra/cor: antes de enviar, guarda o estado exibido; ao recarregar,
    // desenha o estado anterior e transiciona (CSS transition) para o novo.
    // Feedback de análise segura: se o envio não gerou eventos novos, mostra o aviso verde.
    (function () {
      var main = document.querySelector("main");
      var banner = document.getElementById("safe-banner");
      var analyze = document.querySelector('form[action="/dashboard/run-custom"]');
      if (!main || !banner || !analyze) return;
      analyze.addEventListener("submit", function () {
        try { sessionStorage.setItem("pendingAnalysis", main.dataset.events); } catch (e) {}
      });
      var pending = null;
      try { pending = sessionStorage.getItem("pendingAnalysis"); sessionStorage.removeItem("pendingAnalysis"); } catch (e) {}
      if (pending !== null && !document.querySelector(".erro") && Number(pending) === Number(main.dataset.events)) {
        banner.hidden = false;
      }
    })();
    (function () {
      var card = document.getElementById("risk-card");
      if (!card) return;
      var cur = { score: Number(card.dataset.score), level: card.dataset.level };
      function pct(score) { return Math.min(score, 10) * 10; }
      Array.prototype.forEach.call(document.forms, function (form) {
        form.addEventListener("submit", function () {
          try { sessionStorage.setItem("prevRisk", JSON.stringify(cur)); } catch (e) {}
        });
      });
      var prev = null;
      try { prev = JSON.parse(sessionStorage.getItem("prevRisk") || "null"); sessionStorage.removeItem("prevRisk"); } catch (e) {}
      if (!prev || (prev.score === cur.score && prev.level === cur.level)) return;
      var fill = card.querySelector(".scale-fill");
      var badge = document.getElementById("risk-badge");
      var title = document.getElementById("risk-title");
      var finalTitle = title.textContent;
      function setLevel(level) {
        card.classList.remove("tone-verde", "tone-amarelo", "tone-vermelho");
        card.classList.add("tone-" + level);
      }
      var all = card.querySelectorAll(".farol-badge, .farol, .scale-fill");
      Array.prototype.forEach.call(all, function (el) { el.style.transition = "none"; });
      setLevel(prev.level);
      fill.style.width = pct(prev.score) + "%";
      badge.textContent = String(prev.score);
      title.textContent = "Risco Cidadão: " + prev.level.toUpperCase();
      void card.offsetWidth;
      Array.prototype.forEach.call(all, function (el) { el.style.transition = ""; });
      requestAnimationFrame(function () {
        setLevel(cur.level);
        fill.style.width = pct(cur.score) + "%";
        badge.textContent = String(cur.score);
        title.textContent = finalTitle;
      });
    })();
  </script>
</body>
</html>`;
}
