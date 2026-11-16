"""Cadastra Features e Test Cases do Sonora no Azure DevOps (processo Agile). Reexecutável sem duplicar.

Uso: python testing/azure/publicar_azure.py https://dev.azure.com/<org> <Projeto> [--dry-run]
Token: arquivo output/dev/azure-pat.txt (fora do Git) (escopos Work Items R/W, Test Management R/W, Project and Team Read).
"""
import base64
import html
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from conteudo import FEATURES  # noqa: E402

TAG = "Sonora GS"
API = "7.1"


def esc(text):
    return html.escape(text, quote=False)


def feature_fields(f):
    desc = (f"<p><b>{esc(f['codigo'])} — {esc(f['titulo'])}</b></p><p>{esc(f['historia'])}</p>"
            "<p><b>Regras de negócio</b></p><ul>" + "".join(f"<li>{esc(r)}</li>" for r in f["regras"]) + "</ul>")
    crit = "<ol>" + "".join(
        f"<li><b>Dado</b> {esc(d)}, <b>quando</b> {esc(q)}, <b>então</b> {esc(e)}.</li>" for d, q, e in f["criterios"]) + "</ol>"
    return desc, crit


def case_fields(c):
    prep = "".join(f"<li>{esc(p)}</li>" for p in c["preparacao"])
    desc = (f"<p><b>Objetivo:</b> {esc(c['objetivo'])}</p>"
            f"<p><b>Tipo:</b> {esc(c['tipo'])} · caixa-preta · {esc(c['canal'])}</p>"
            f"<p><b>Preparação (pré-condições):</b></p><ul>{prep}</ul>"
            f"<p><b>Entradas:</b> {esc(c['entradas'])}</p>"
            f"<p><b>Saída esperada:</b> {esc(c['passos'][-1][1])}</p>")
    steps = [f'<steps id="0" last="{len(c["passos"])}">']
    for i, (action, expected) in enumerate(c["passos"], start=1):
        steps.append(f'<step id="{i}" type="ValidateStep">'
                     f'<parameterizedString isformatted="true">{esc(esc(action))}</parameterizedString>'
                     f'<parameterizedString isformatted="true">{esc(esc(expected))}</parameterizedString>'
                     '<description/></step>')
    steps.append("</steps>")
    return desc, "".join(steps)


class Azure:
    def __init__(self, org, project, pat):
        self.org, self.project = org.rstrip("/"), project
        self.auth = "Basic " + base64.b64encode((":" + pat).encode()).decode()

    def call(self, method, url, body=None, content="application/json"):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", self.auth)
        req.add_header("Content-Type", content)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                text = r.read().decode()
                return json.loads(text) if text else {}
        except urllib.error.HTTPError as e:
            raise SystemExit(f"Azure respondeu HTTP {e.code} em {method} {url.split('?')[0]}: {e.read().decode()[:400]}")

    def url(self, path):
        return f"{self.org}/{urllib.parse.quote(self.project)}/_apis/{path}"

    def existing(self):
        wiql = {"query": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = @project "
                         f"AND [System.Tags] CONTAINS '{TAG}'"}
        ids = [w["id"] for w in self.call("POST", self.url(f"wit/wiql?api-version={API}"), wiql).get("workItems", [])]
        found = {}
        for start in range(0, len(ids), 200):
            chunk = ",".join(map(str, ids[start:start + 200]))
            items = self.call("GET", f"{self.org}/_apis/wit/workitems?ids={chunk}&fields=System.Title,System.WorkItemType&api-version={API}")
            for item in items["value"]:
                found[(item["fields"]["System.WorkItemType"], item["fields"]["System.Title"])] = item["id"]
        return found

    def fields_of(self, type_name):
        data = self.call("GET", self.url(f"wit/workitemtypes/{urllib.parse.quote(type_name)}/fields?api-version={API}"))
        return {f["referenceName"] for f in data["value"]}

    def create(self, type_name, ops):
        return self.call("POST", self.url(f"wit/workitems/${urllib.parse.quote(type_name)}?api-version={API}"), ops,
                         "application/json-patch+json")


def op(path, value):
    return {"op": "add", "path": path, "value": value}


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    org, project, dry = sys.argv[1], sys.argv[2], "--dry-run" in sys.argv
    total_cases = sum(len(f["casos"]) for f in FEATURES)
    print(f"{len(FEATURES)} Features e {total_cases} Test Cases "
          f"({sum(c['tipo'] == 'Positivo' for f in FEATURES for c in f['casos'])} positivos).")
    if dry:
        for f in FEATURES:
            print(f"{f['codigo']} {f['titulo']}: " + ", ".join(c["titulo"] for c in f["casos"]))
        return
    pat = (Path(__file__).resolve().parents[2] / "output/dev/azure-pat.txt").read_text(encoding="utf-8").strip()
    az = Azure(org, project, pat)
    has_criteria = "Microsoft.VSTS.Common.AcceptanceCriteria" in az.fields_of("Feature")
    existing = az.existing()
    for f in FEATURES:
        title = f"{f['codigo']} - {f['titulo']}"
        desc, crit = feature_fields(f)
        fid = existing.get(("Feature", title))
        if fid is None:
            ops = [op("/fields/System.Title", title), op("/fields/System.Tags", f"{TAG}; {f['codigo']}")]
            if has_criteria:
                ops += [op("/fields/System.Description", desc), op("/fields/Microsoft.VSTS.Common.AcceptanceCriteria", crit)]
            else:
                ops.append(op("/fields/System.Description", desc + "<p><b>Critérios de aceite</b></p>" + crit))
            fid = az.create("Feature", ops)["id"]
            print(f"Feature criada #{fid}: {title}")
        else:
            print(f"Feature já existe #{fid}: {title}")
        feature_url = f"{az.org}/_apis/wit/workItems/{fid}"
        for n, c in enumerate(f["casos"], start=1):
            ctitle = f"{f['codigo']}-CT{n:02d} [{c['tipo']}] {c['titulo']}"
            if ("Test Case", ctitle) in existing:
                print(f"  já existe: {ctitle}")
                continue
            cdesc, steps = case_fields(c)
            ops = [op("/fields/System.Title", ctitle),
                   op("/fields/System.Description", cdesc),
                   op("/fields/Microsoft.VSTS.TCM.Steps", steps),
                   op("/fields/Microsoft.VSTS.Common.Priority", c["prioridade"]),
                   op("/fields/System.Tags", f"{TAG}; {f['codigo']}; {c['tipo']}; Caixa-preta; {c['canal']}"),
                   op("/relations/-", {"rel": "Microsoft.VSTS.Common.TestedBy-Reverse", "url": feature_url,
                                       "attributes": {"comment": "Caso de aceitação da Feature"}})]
            cid = az.create("Test Case", ops)["id"]
            print(f"  Test Case criado #{cid}: {ctitle}")
    print("Concluído.")


if __name__ == "__main__":
    main()
