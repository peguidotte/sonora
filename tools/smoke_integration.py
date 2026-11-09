"""Smoke somente leitura contra backends reais; não cria dados nem conclui rubricas."""
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from datetime import datetime
import argparse
import json
import os

from validate_contracts import check_value, load_service


def get(base, path, document, route, status="200", headers=None):
    req = Request(base.rstrip("/") + path, headers=headers or {})
    with urlopen(req, timeout=10) as response:
        assert not response.headers.get("X-Demo-Mode"), "Endpoint é mock; não comprova integração real."
        assert response.status == int(status), f"Status inesperado em {route}"
        value = json.load(response)
    schema = document["paths"][route]["get"]["responses"][status]["content"]["application/json"]["schema"]
    check_value(document, schema, value)
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-base", default=os.environ.get("API_BASE_URL"))
    parser.add_argument("--soa-base", default=os.environ.get("SOA_BASE_URL"))
    parser.add_argument("--from", dest="begin", required=True)
    parser.add_argument("--to", dest="end", required=True)
    args = parser.parse_args()
    assert args.api_base, "Configure API_BASE_URL ou --api-base."
    read_key = os.environ.get("API_READ_KEY")
    operator_key = os.environ.get("API_OPERATOR_KEY")
    assert read_key and operator_key, "Configure API_READ_KEY e API_OPERATOR_KEY."
    read_headers = {"X-Api-Key": read_key}
    operator_headers = {"X-Api-Key": operator_key}
    begin = datetime.fromisoformat(args.begin.replace("Z", "+00:00"))
    end = datetime.fromisoformat(args.end.replace("Z", "+00:00"))
    assert end > begin and (end - begin).total_seconds() <= 31 * 86400
    api = load_service("csharp")
    get(args.api_base, "/health/live", api, "/health/live")
    get(args.api_base, "/health/ready", api, "/health/ready", headers=operator_headers)
    points = get(args.api_base, "/api/v1/locations", api, "/api/v1/locations", headers=read_headers)
    assert points["items"], "Sem seed/locations para demonstrar jornada."
    location_id = points["items"][0]["id"]
    qs = urlencode({"from":args.begin,"to":args.end,"origin":"simulated"})
    profile = get(args.api_base, f"/api/v1/locations/{location_id}/noise-profile?{qs}", api, "/api/v1/locations/{locationId}/noise-profile", headers=read_headers)
    if profile["status"] == "no_data":
        assert profile["laeqDbA"] is None and not profile["series"], "Ausência confundida com valor medido."
    if args.soa_base:
        soa = load_service("soa")
        get(args.soa_base, "/health/live", soa, "/health/live")
        key = os.environ.get("SOA_OPERATOR_KEY")
        assert key, "Configure SOA_OPERATOR_KEY para consultar lotes reais."
        get(args.soa_base, "/health/ready", soa, "/health/ready", headers={"X-Api-Key":key})
        get(args.soa_base, "/api/v1/batches", soa, "/api/v1/batches", headers={"X-Api-Key":key})
    print("OK: endpoints reais consultados e respostas compatíveis. Não testa escrita, persistência ou jornada Mobile.")


if __name__ == "__main__":
    main()
