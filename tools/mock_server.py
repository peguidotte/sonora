"""Mock de contrato com fixtures estáticas. Não substitui C#/SOA nem persiste dados."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from datetime import datetime
import argparse
import copy
import json
import re

from jsonschema.exceptions import ValidationError
from validate_contracts import check_value, load_service

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 262144


def create_server(service="csharp", host="127.0.0.1", port=4010):
    document = load_service(service)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass  # Não imprimir payloads, headers ou credenciais.

        def send(self, status, value=None, content_type="application/json"):
            raw = (json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8") if content_type == "application/json" else str(value).encode("utf-8")) if value is not None else b""
            self.send_response(status)
            self.send_header("Content-Type", content_type + "; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("X-Demo-Mode", "static-contract-mock")
            # Desenvolvimento local sem credenciais de cookies. Não usar este mock em produção.
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(raw)

        def error(self, status, code, message):
            self.send(status, {"code": code, "message": message})

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Ingest-Key,X-Admin-Key,X-Operator-Key")
            self.end_headers()

        def do_GET(self):
            self.handle_operation("get")

        def do_POST(self):
            self.handle_operation("post")

        def handle_operation(self, method):
            url = urlsplit(self.path)
            query = parse_qs(url.query, keep_blank_values=True)
            if url.path == "/openapi.json" and method == "get":
                return self.send(200, document)
            for path, path_item in document["paths"].items():
                pattern = re.sub(r"\\\{[^}]+\\\}", "([^/]+)", re.escape(path))
                match = re.fullmatch(pattern, url.path)
                if not match:
                    continue
                if method not in path_item:
                    return self.error(405, "method_not_allowed", "Método não previsto.")
                operation = path_item[method]
                try:
                    path_names = re.findall(r"\{([^}]+)\}", path)
                    path_values = dict(zip(path_names, match.groups()))
                    for parameter in operation.get("parameters", []):
                        name = parameter["name"]
                        raw = path_values.get(name) if parameter["in"] == "path" else query.get(name, [None])[0]
                        if raw is None:
                            if parameter.get("required"):
                                return self.error(400, "missing_parameter", "Parâmetro obrigatório ausente: " + name)
                            continue
                        typ = parameter["schema"].get("type")
                        value = float(raw) if typ == "number" else int(raw) if typ == "integer" else raw
                        check_value(document, parameter["schema"], value)
                    if ("latitude" in query) != ("longitude" in query):
                        return self.error(400, "invalid_coordinates", "Latitude e longitude devem ser fornecidas juntas.")
                    if "from" in query:
                        begin = datetime.fromisoformat(query["from"][0].replace("Z", "+00:00"))
                        end = datetime.fromisoformat(query["to"][0].replace("Z", "+00:00"))
                        if end <= begin or (end - begin).total_seconds() > 31 * 86400:
                            return self.error(400, "invalid_window", "Janela inválida ou superior a 31 dias.")
                    for security in operation.get("security", []):
                        for name in security:
                            header = document["components"]["securitySchemes"][name]["name"]
                            if not self.headers.get(header):
                                return self.error(401, "missing_demo_credential", "Envie uma credencial fictícia; o mock verifica somente presença.")
                    if method == "post":
                        length = int(self.headers.get("Content-Length", "0"))
                        if length < 1 or length > MAX_BODY:
                            return self.error(400, "invalid_body_size", "Corpo ausente ou acima do limite do mock.")
                        body = json.loads(self.rfile.read(length), parse_constant=lambda _value: (_ for _ in ()).throw(ValueError("non-finite JSON")))
                        schema = operation["requestBody"]["content"]["application/json"]["schema"]
                        check_value(document, schema, body)
                except (ValueError, ValidationError, KeyError, OverflowError):
                    return self.error(400, "invalid_request", "Entrada incompatível com o contrato.")
                if url.path == "/painel":
                    return self.send(200, "<!doctype html><html lang='pt-BR'><meta charset='utf-8'><title>Mock de contrato</title><h1>Mock de contrato</h1><p>Fixtures sintéticas e estáticas. Nenhuma API de disciplina está implementada por este servidor.</p><a href='/api/v1/pontos'>Locais</a><br><a href='/openapi.json'>OpenAPI</a></html>", "text/html")
                statuses = operation["responses"]
                status = "201" if method == "post" and "201" in statuses else "200" if "200" in statuses else "204"
                media = statuses[status].get("content", {}).get("application/json", {})
                value = copy.deepcopy(media.get("example"))
                if "examples" in media:
                    key = "empty" if query.get("scenario") == ["empty"] else "available"
                    value = copy.deepcopy(media["examples"][key]["value"])
                # Somente eco de identificador/janela para navegação; nenhum cálculo ou gravação real.
                if isinstance(value, dict) and "pointId" in value and "id" in path_values:
                    value["pointId"] = path_values["id"]
                if isinstance(value, dict) and "from" in query:
                    if "from" in value:
                        value["from"], value["to"] = query["from"][0], query["to"][0]
                    if "origin" in value:
                        value["origin"] = query["origin"][0]
                    # Uma fixture simulada nunca deve virar uma resposta de medições reais.
                    if query.get("origin") == ["public_dataset"]:
                        if "series" in value:
                            value.update(status="no_data", laeqDbA=None, sources=[], series=[])
                        elif "items" in value:
                            value.update(items=[], total=0)
                return self.send(int(status), value)
            return self.error(404, "not_found", "Rota não prevista no contrato.")

    return ThreadingHTTPServer((host, port), Handler)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--service", choices=["csharp", "soa"], default="csharp")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int)
    args = parser.parse_args()
    server = create_server(args.service, args.host, args.port or (4010 if args.service == "csharp" else 4011))
    print(f"MOCK ESTÁTICO {args.service}: http://{args.host}:{server.server_port}; sem persistência/validação de credencial real.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
