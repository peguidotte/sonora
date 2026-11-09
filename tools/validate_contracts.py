"""Valida OpenAPI e exemplos compartilhados; não testa implementações reais."""
from pathlib import Path
import json

from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "contracts"


def load_service(service):
    return json.loads((CONTRACTS / "openapi" / f"{service}.openapi.json").read_text(encoding="utf-8"))


def check_value(document, schema, value):
    resource = Resource.from_contents({"$schema": "https://json-schema.org/draft/2020-12/schema", **document})
    registry = Registry().with_resource("urn:gs:contract", resource)
    scoped = {"$ref": "urn:gs:contract" + schema["$ref"]} if "$ref" in schema else schema
    Draft202012Validator(scoped, registry=registry, format_checker=FormatChecker()).validate(value)


def main():
    count = 0
    for service in ("csharp", "soa"):
        document = load_service(service)
        validate(document)
        operation_ids = []
        assert document["security"] == [{"ApiKeyAuth": []}], "API deve exigir autenticação por padrão"
        for path, path_item in document["paths"].items():
            for operation in path_item.values():
                operation_ids.append(operation["operationId"])
                if path.startswith("/api/v1/") or path == "/health/ready":
                    assert operation.get("security", document["security"]), f"Rota privada sem autenticação: {path}"
                    assert operation.get("x-required-scopes"), f"Permissão ausente: {path}"
                    assert {"401", "403"}.issubset(operation["responses"]), f"Erros de acesso ausentes: {path}"
                for response in operation["responses"].values():
                    media = response.get("content", {}).get("application/json", {})
                    if not media:
                        continue
                    values = ([media["example"]] if "example" in media else [])
                    values += [e["value"] for e in media.get("examples", {}).values()]
                    for value in values:
                        check_value(document, media["schema"], value)
                        count += 1
        assert len(operation_ids) == len(set(operation_ids)), "operationId duplicado"
    manifest = json.loads((CONTRACTS / "manifest.json").read_text(encoding="utf-8"))
    for item in manifest["requests"]:
        document = load_service(item["service"])
        schema = document["paths"][item["path"]]["post"]["requestBody"]["content"]["application/json"]["schema"]
        value = json.loads((CONTRACTS / "fixtures" / item["fixture"]).read_text(encoding="utf-8"))
        check_value(document, schema, value)
        if item["fixture"] == "import-request.json":
            for row in value["items"]:
                check_value(document, {"$ref": "#/components/schemas/PublicObservation"}, row)
        count += 1
    ml_schema = json.loads((CONTRACTS / "schemas/ml-summary.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(ml_schema)
    fixture = json.loads((CONTRACTS / "fixtures/ml-summary.mock.json").read_text(encoding="utf-8"))
    Draft202012Validator(ml_schema, format_checker=FormatChecker()).validate(fixture)
    print(f"OK: 2 contratos OpenAPI, schema ML e {count} exemplos válidos. Não comprova implementação das disciplinas.")


if __name__ == "__main__":
    main()
