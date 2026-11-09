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
    credentials = json.loads((ROOT / "contracts/fixtures/mock-credentials.json").read_text(encoding="utf-8"))[service]

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

        def authenticate(self, operation):
            requirements = operation.get("security", document.get("security", []))
            if not requirements:
                return True
            token = self.headers.get("X-Api-Key")
            self.credential = next((item for item in credentials if item["key"] == token), None)
            if self.credential is None:
                self.error(401, "unauthorized", "Missing or invalid mock API key.")
                return False
            required = set(operation.get("x-required-scopes", []))
            if not required.issubset(self.credential["scopes"]):
                self.error(403, "forbidden", "API key lacks the required scope.")
                return False
            return True

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Api-Key")
            self.end_headers()

        def do_GET(self):
            self.handle_operation("get")

        def do_POST(self):
            self.handle_operation("post")

        def handle_operation(self, method):
            url = urlsplit(self.path)
            query = parse_qs(url.query, keep_blank_values=True)
            if url.path == document["x-api-prefix"] + "/openapi.json" and method == "get":
                if not self.authenticate({"x-required-scopes": ["operations:read"]}):
                    return
                return self.send(200, document)
            for path, path_item in document["paths"].items():
                pattern = re.sub(r"\\\{[^}]+\\\}", "([^/]+)", re.escape(path))
                match = re.fullmatch(pattern, url.path)
                if not match:
                    continue
                if method not in path_item:
                    return self.error(405, "method_not_allowed", "Method not allowed.")
                operation = path_item[method]
                if not self.authenticate(operation):
                    return
                try:
                    path_names = re.findall(r"\{([^}]+)\}", path)
                    path_values = dict(zip(path_names, match.groups()))
                    for parameter in operation.get("parameters", []):
                        name = parameter["name"]
                        raw = path_values.get(name) if parameter["in"] == "path" else query.get(name, [None])[0]
                        if raw is None:
                            if parameter.get("required"):
                                return self.error(400, "missing_parameter", "Missing required parameter: " + name)
                            continue
                        typ = parameter["schema"].get("type")
                        value = float(raw) if typ == "number" else int(raw) if typ == "integer" else raw
                        check_value(document, parameter["schema"], value)
                    if ("latitude" in query) != ("longitude" in query):
                        return self.error(400, "invalid_coordinates", "Latitude and longitude must be provided together.")
                    if "from" in query:
                        begin = datetime.fromisoformat(query["from"][0].replace("Z", "+00:00"))
                        end = datetime.fromisoformat(query["to"][0].replace("Z", "+00:00"))
                        if end <= begin or (end - begin).total_seconds() > 31 * 86400:
                            return self.error(400, "invalid_window", "Invalid time window or period longer than 31 days.")
                    if method == "post":
                        length = int(self.headers.get("Content-Length", "0"))
                        if length < 1 or length > MAX_BODY:
                            return self.error(400, "invalid_body_size", "Missing body or mock size limit exceeded.")
                        body = json.loads(self.rfile.read(length), parse_constant=lambda _value: (_ for _ in ()).throw(ValueError("non-finite JSON")))
                        schema = operation["requestBody"]["content"]["application/json"]["schema"]
                        check_value(document, schema, body)
                        if self.credential.get("deviceId") and body.get("deviceId") != self.credential["deviceId"]:
                            return self.error(403, "forbidden", "API key is not authorized for this device.")
                except (ValueError, ValidationError, KeyError, OverflowError):
                    return self.error(400, "invalid_request", "Request does not match the contract.")
                if url.path == "/dashboard":
                    return self.send(200, "<!doctype html><html lang='en'><meta charset='utf-8'><title>Sonora contract mock</title><h1>Static contract mock</h1><p>Synthetic fixtures only. Data endpoints require X-Api-Key. This page contains no private data.</p></html>", "text/html")
                statuses = operation["responses"]
                status = "201" if method == "post" and "201" in statuses else "200" if "200" in statuses else "204"
                media = statuses[status].get("content", {}).get("application/json", {})
                value = copy.deepcopy(media.get("example"))
                if "examples" in media:
                    key = "empty" if query.get("scenario") == ["empty"] else "available"
                    value = copy.deepcopy(media["examples"][key]["value"])
                # Somente eco de identificador/janela para navegação; nenhum cálculo ou gravação real.
                if isinstance(value, dict) and "locationId" in value and "locationId" in path_values:
                    value["locationId"] = path_values["locationId"]
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
            return self.error(404, "not_found", "Route not found.")

    return ThreadingHTTPServer((host, port), Handler)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--service", choices=["csharp", "soa"], default="csharp")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int)
    args = parser.parse_args()
    server = create_server(args.service, args.host, args.port or (4010 if args.service == "csharp" else 4011))
    print(f"STATIC MOCK {args.service}: http://{args.host}:{server.server_port}; public fixture keys only, no persistence or production authentication.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
