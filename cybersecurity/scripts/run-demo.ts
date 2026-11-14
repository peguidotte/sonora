// Demo local: processa as fixtures sintéticas, mostra evidência antes/depois da sanitização
// e gera o dashboard Risco Cidadão em output/cybersecurity-dashboard.html (fora do Git).
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { interceptRequest } from "../src/middleware.js";
import { SecurityEventLog } from "../src/risk/events.js";
import { calculateRisk } from "../src/risk/score.js";
import { renderStaticPage } from "../src/dashboard/render.js";
import type { JsonValue } from "../src/pii/parser.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, "..", "..", "fixtures", "requests");
const OUTPUT_DIR = path.join(HERE, "..", "..", "..", "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "cybersecurity-dashboard.html");

async function main(): Promise<void> {
  const log = new SecurityEventLog();
  const files = (await readdir(FIXTURES_DIR)).filter((file) => file.endsWith(".json")).sort();

  for (const file of files) {
    const source = file.replace(/\.json$/, "");
    const raw = await readFile(path.join(FIXTURES_DIR, file), "utf-8");
    const payload = JSON.parse(raw) as JsonValue;

    console.log(`\n=== Fonte: ${source} ===`);
    const { findings } = await interceptRequest(payload, source, log);
    if (findings.length === 0) {
      console.log("Nenhum campo de PII detectado (fixture negativa ou sem dado sensível).");
      continue;
    }
    for (const finding of findings) {
      console.log(`- ${finding.path} [${finding.category}]`);
      console.log(`  ANTES (valor bruto, nunca deve alcançar log/resposta): ${finding.originalValue}`);
      console.log(`  DEPOIS (sanitizado, o que de fato chega ao sink):      ${finding.maskedValue}`);
    }
  }

  const events = log.all();
  const report = calculateRisk(events);
  console.log(`\n=== Risco Cidadão ===`);
  console.log(`Farol: ${report.level.toUpperCase()}`);
  console.log(report.explanation);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, renderStaticPage(report, events), "utf-8");
  console.log(`\nDashboard gerado em: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
