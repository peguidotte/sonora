// Dashboard "Risco Cidadão": HTML gerado a partir dos eventos reais do log.
// renderStaticPage() é usado pela demo CLI (print de evidência); renderLivePage()
// é servido pelo microserviço: formulário genérico (qualquer JSON) à esquerda,
// eventos reais à direita — mostra que o motor não está preso às fixtures.
import type { SecurityEvent } from "../risk/events.js";
import type { RiskReport } from "../risk/score.js";

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
    .split("<").join("\\u003c")
    .split(">").join("\\u003e")
    .split(LINE_SEPARATOR).join("\\u2028")
    .split(PARAGRAPH_SEPARATOR).join("\\u2029");
}

const LEVEL_COLOR: Record<RiskReport["level"], string> = {
  verde: "#1a7f37",
  amarelo: "#9a6700",
  vermelho: "#b91c1c",
};

const PAGE_STYLE = `
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1b1b1b; background: #fafafa; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin-top: 0; }
  .farol { display: inline-block; width: 1.2rem; height: 1.2rem; border-radius: 50%; margin-right: 0.5rem; vertical-align: middle; }
  .explicacao { color: #444; margin-bottom: 1.5rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
  th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; }
  th { background: #efefef; }
  .aviso { font-size: 0.8rem; color: #666; margin-top: 1rem; }
  .layout { display: flex; gap: 2rem; align-items: flex-start; }
  .coluna-teste { flex: 0 0 380px; background: white; border: 1px solid #ddd; border-radius: 6px; padding: 1rem; }
  .coluna-eventos { flex: 1; min-width: 0; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin: 0.8rem 0 0.2rem; }
  input[type="text"], textarea { width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1px solid #bbb; border-radius: 4px; font-family: inherit; }
  textarea { font-family: ui-monospace, Consolas, monospace; font-size: 0.8rem; resize: vertical; }
  button { cursor: pointer; padding: 0.4rem 0.8rem; border: 1px solid #bbb; border-radius: 4px; background: white; }
  button.primario { margin-top: 0.8rem; border-color: #1a7f37; color: #1a7f37; font-weight: 600; }
  button.reiniciar { border-color: #b91c1c; color: #b91c1c; }
  .exemplos { margin-top: 1.2rem; border-top: 1px dashed #ccc; padding-top: 0.8rem; }
  .exemplos p { font-size: 0.8rem; color: #555; margin: 0 0 0.5rem; }
  .exemplos button { width: 100%; text-align: left; font-size: 0.8rem; margin-bottom: 0.4rem; display: block; }
  .erro { background: #fdecea; color: #b91c1c; border: 1px solid #f5c2c0; border-radius: 4px; padding: 0.5rem; font-size: 0.85rem; margin-bottom: 0.8rem; }
  @media (max-width: 820px) {
    .layout { flex-direction: column; }
    .coluna-teste { flex: 1; width: 100%; box-sizing: border-box; }
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
  const status = event.blocked ? "BLOQUEADO" : "PERMITIDO (sanitizado)";
  const statusColor = event.blocked ? "#b91c1c" : "#1a7f37";
  return `
    <tr>
      <td>${escapeHtml(event.timestamp)}</td>
      <td>${escapeHtml(event.source)}</td>
      <td>${escapeHtml(event.category)}</td>
      <td>${escapeHtml(event.sink)}</td>
      <td style="color:${statusColor};font-weight:600">${status}</td>
      <td>${escapeHtml(event.citizenMessage)}</td>
      <td>${event.usedLlm ? "LLM real" : "fallback declarado"}</td>
    </tr>`;
}

function renderFarolEExplicacao(report: RiskReport): string {
  const color = LEVEL_COLOR[report.level];
  return `
  <h1><span class="farol" style="background:${color}"></span>Risco Cidadão: ${report.level.toUpperCase()}</h1>
  <p class="explicacao">${escapeHtml(report.explanation)}</p>`;
}

function renderEventsTable(events: readonly SecurityEvent[]): string {
  return `
  <table>
    <thead>
      <tr><th>Quando</th><th>Fonte</th><th>Categoria</th><th>Sink</th><th>Status</th><th>Mensagem ao cidadão</th><th>Tradução</th></tr>
    </thead>
    <tbody>
      ${events.length > 0 ? [...events].reverse().map(renderRow).join("\n") : '<tr><td colspan="7">Nenhum evento ainda — envie um valor ao lado para testar.</td></tr>'}
    </tbody>
  </table>
  <p class="aviso">Farol ilustrativo da auditoria local (payloads sintéticos/arbitrários), sem valor de classificação oficial de risco. Eventos mais recentes primeiro.</p>`;
}

/** Página estática usada pela demo CLI (print de evidência). */
export function renderStaticPage(report: RiskReport, events: readonly SecurityEvent[]): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Risco Cidadão — Sonora Cybersecurity (demo local)</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
  ${renderFarolEExplicacao(report)}
  ${renderEventsTable(events)}
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
  options: { error?: string } = {},
): string {
  const presetButtons = presets
    .map((preset, index) => `<button type="button" onclick="fillPreset(${index})">Preencher: ${escapeHtml(preset.label)}</button>`)
    .join("\n        ");

  const presetsData = toInlineJson(presets.map((preset) => ({ source: preset.source, payloadJson: preset.payloadJson })));

  const errorBlock = options.error ? `<p class="erro">${escapeHtml(options.error)}</p>` : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Risco Cidadão — Sonora Cybersecurity (microserviço)</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
  <div class="layout">
    <div class="coluna-teste">
      <h2>Testar o serviço</h2>
      <p class="aviso" style="margin-top:0">Envie qualquer JSON — o motor detecta PII pelo conteúdo/chave dos campos, não por uma lista fixa de exemplos. Alguns valores vão disparar risco, outros não.</p>
      ${errorBlock}
      <form method="post" action="/dashboard/run-custom">
        <label for="source">Fonte (nome livre)</label>
        <input type="text" id="source" name="source" placeholder="ex: mobile-form, teste-manual" />
        <label for="payload">Payload (JSON)</label>
        <textarea id="payload" name="payload" rows="9" placeholder='{"campoQualquer": "valor aleatório", "operatorCpf": "529.982.247-25"}'></textarea>
        <button type="submit" class="primario">Analisar</button>
      </form>
      <div class="exemplos">
        <p>Ou preencha com um exemplo pronto (só preenche os campos acima — não envia sozinho):</p>
        ${presetButtons}
      </div>
      <form method="post" action="/dashboard/reset" style="margin-top:0.8rem">
        <button type="submit" class="reiniciar">Reiniciar log</button>
      </form>
    </div>
    <div class="coluna-eventos">
      ${renderFarolEExplicacao(report)}
      ${renderEventsTable(events)}
    </div>
  </div>
  <p class="aviso">Servido por POST /api/cybersecurity/v1/analyze; este painel só lê o log em memória do processo (reinicia ao reiniciar o serviço).</p>
  <script>
    const PRESETS = ${presetsData};
    function fillPreset(index) {
      const preset = PRESETS[index];
      if (!preset) return;
      document.getElementById("source").value = preset.source;
      document.getElementById("payload").value = preset.payloadJson;
    }
  </script>
</body>
</html>`;
}
