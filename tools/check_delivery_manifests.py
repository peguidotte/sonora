"""Confere organização declarada. planned não significa entrega pronta."""
from pathlib import Path
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = ["api", "soa", "mobile", "iot", "ml", "linux", "cybersecurity", "testing"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-ready", nargs="*", choices=COMPONENTS, default=[])
    args = parser.parse_args()
    for name in COMPONENTS:
        path = ROOT / name / "component.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data["component"] == name, f"Nome divergente: {path}"
        assert data["status"] in ["planned", "in_progress", "ready"], f"Status inválido: {name}"
        assert (ROOT / name / "README.md").is_file(), f"README ausente: {name}"
        assert (ROOT / data["spec"]).is_file(), f"Especificação ausente: {name}"
        assert data["standalone"]["requiresCloud"] is False, f"Standalone depende da nuvem: {name}"
        if data["status"] == "ready" or name in args.require_ready:
            assert data["status"] == "ready", f"Ainda não pronto: {name}"
            assert data["standalone"]["commands"], f"Sem comando de reprodução: {name}"
            assert data["validation"]["commands"], f"Sem comando de validação: {name}"
            assert data["validation"]["evidence"], f"Sem evidência declarada: {name}"
            for relative in data["validation"]["evidence"]:
                resolved = (ROOT / relative).resolve()
                assert resolved.is_relative_to(ROOT), f"Evidência fora do repositório: {name}"
                assert resolved.is_file(), f"Evidência ausente: {relative}"
        print(f"{name}: {data['status']} — responsável: {data['owner']}")
    print("OK: organização declarada conferida. A execução real da matéria deve ser auditada separadamente.")


if __name__ == "__main__":
    main()
