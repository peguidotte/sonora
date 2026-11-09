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
                if path.startswith(document["x-api-prefix"]) and not path.endswith("/health/live"):
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
        count += 1
    ml_schema = json.loads((CONTRACTS / "schemas/ml-summary.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(ml_schema)
    fixture = json.loads((CONTRACTS / "fixtures/ml-summary.mock.json").read_text(encoding="utf-8"))
    Draft202012Validator(ml_schema, format_checker=FormatChecker()).validate(fixture)
    validate_database_contract()
    print(f"OK: 2 contratos OpenAPI, interface de banco, schema ML e {count} exemplos válidos. Não comprova implementação das disciplinas.")


def validate_database_contract():
    database = json.loads((CONTRACTS / "database.json").read_text(encoding="utf-8"))
    core, ingestion = load_service("csharp"), load_service("soa")
    assert database["contractVersion"] == core["info"]["version"] == ingestion["info"]["version"]
    assert database["engine"] == "PostgreSQL" and database["migrationOwner"] == "soa"
    assert core["x-database-access"]["role"] == "sonora_query"
    assert core["x-database-access"]["access"] == "read-only"
    assert ingestion["x-database-access"]["migrationOwner"] == database["migrationOwner"]
    query_role = database["roles"]["sonora_query"]
    assert query_role["canReadPublishedViews"] is True
    assert query_role["canWriteStorage"] is False and query_role["canMigrate"] is False
    for view in database["readViews"].values():
        if "payloadSchema" in view:
            assert (CONTRACTS / view["payloadSchema"]).is_file()
            continue
        schema = core["components"]["schemas"][view["responseSchema"]]
        fields = {column["jsonField"] for column in view["columns"]} | set(view.get("computedFields", []))
        assert set(schema["required"]).issubset(fields), f"Campos obrigatórios não publicados: {view}"
        assert fields.issubset(schema["properties"]), f"Campo SQL sem mapeamento JSON: {view}"
    assert all(set(item) == {"get"} for item in core["paths"].values()), "API C# deve ser somente consulta"
    for route in ingestion["paths"]:
        assert route.startswith(ingestion["x-api-prefix"])


if __name__ == "__main__":
    main()
