"""Testes dos limites do mock compartilhado, não das implementações dos colegas."""
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import json
import unittest

from mock_server import create_server
from smoke_integration import get
from validate_contracts import load_service


class MockTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server(port=0)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def call(self, path, data=None, headers=None):
        if headers is None:
            headers = {"X-Api-Key": "mock-consumer-key"}
        req = Request(self.base + path, data=data, headers=headers)
        try:
            response = urlopen(req, timeout=3)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response), response.headers.get("X-Demo-Mode")

    def test_mock_identifies_synthetic_mode(self):
        status, body, mode = self.call("/api/v1/locations")
        self.assertEqual(status, 200)
        self.assertTrue(body["items"][0]["isDemo"])
        self.assertEqual(mode, "static-contract-mock")

    def test_missing_profile_filters_rejected(self):
        status, _, _ = self.call("/api/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/noise-profile")
        self.assertEqual(status, 400)

    def test_simulated_data_never_labeled_public(self):
        path = "/api/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/noise-profile?from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z&origin=public_dataset"
        status, body, _ = self.call(path)
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "no_data")
        self.assertEqual(body["series"], [])
        self.assertEqual(body["sources"], [])

    def test_inverted_period_rejected(self):
        path = "/api/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/noise-profile?from=2026-11-09T15:00:00Z&to=2026-11-08T15:01:00Z&origin=simulated"
        status, _, _ = self.call(path)
        self.assertEqual(status, 400)

    def test_missing_write_key_rejected(self):
        status, _, _ = self.call("/api/v1/observations", b"{}", {"Content-Type":"application/json"})
        self.assertEqual(status, 401)

    def test_client_cannot_choose_origin(self):
        body = {"externalId":"x","deviceId":"11111111-1111-4111-8111-111111111111","sessionId":"x","observedAt":"2026-11-08T15:00:00Z","durationSeconds":5,"laeqDbA":60,"origin":"public_dataset"}
        status, _, _ = self.call("/api/v1/observations", json.dumps(body).encode(), {"Content-Type":"application/json","X-Api-Key":"mock-device-key"})
        self.assertEqual(status, 400)

    def test_integration_smoke_rejects_mock(self):
        with self.assertRaisesRegex(AssertionError, "Endpoint é mock"):
            get(self.base, "/health/live", load_service("csharp"), "/health/live")

    def test_soa_mock_requires_operator_header(self):
        server = create_server("soa", port=0)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with self.assertRaises(HTTPError) as error:
                urlopen(base + "/api/v1/batches", timeout=3)
            self.assertEqual(error.exception.code, 401)
            error.exception.close()
            request = Request(base + "/api/v1/batches", headers={"X-Api-Key":"mock-soa-operator-key"})
            with urlopen(request, timeout=3) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(json.load(response)["items"][0]["status"], "completed")
                self.assertEqual(response.headers["X-Demo-Mode"], "static-contract-mock")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_private_read_without_key_is_unauthorized(self):
        status, body, _ = self.call("/api/v1/locations", headers={})
        self.assertEqual(status, 401)
        self.assertEqual(body["code"], "unauthorized")

    def test_invalid_key_is_not_accepted_by_presence(self):
        status, _, _ = self.call("/api/v1/locations", headers={"X-Api-Key":"not-a-valid-key"})
        self.assertEqual(status, 401)

    def test_consumer_key_cannot_ingest(self):
        status, _, _ = self.call("/api/v1/observations", b"{}")
        self.assertEqual(status, 403)

    def test_device_key_cannot_read_customer_data(self):
        status, _, _ = self.call("/api/v1/locations", headers={"X-Api-Key":"mock-device-key"})
        self.assertEqual(status, 403)

    def test_device_key_is_bound_to_its_device(self):
        body = {"externalId":"x","deviceId":"99999999-9999-4999-8999-999999999999","sessionId":"x","observedAt":"2026-11-08T15:00:00Z","durationSeconds":5,"laeqDbA":60}
        status, _, _ = self.call("/api/v1/observations", json.dumps(body).encode(), {"Content-Type":"application/json","X-Api-Key":"mock-device-key"})
        self.assertEqual(status, 403)

    def test_readiness_requires_operations_scope(self):
        status, _, _ = self.call("/health/ready")
        self.assertEqual(status, 403)

    def test_key_in_query_is_not_authentication(self):
        status, _, _ = self.call("/api/v1/locations?apiKey=mock-consumer-key", headers={})
        self.assertEqual(status, 401)

    def test_legacy_portuguese_route_is_not_served(self):
        status, _, _ = self.call("/api/v1/pontos")
        self.assertEqual(status, 404)

    def test_valid_device_fixture_matches_contract(self):
        from pathlib import Path
        fixture = Path(__file__).resolve().parents[1] / "contracts/fixtures/iot-request.json"
        status, body, _ = self.call("/api/v1/observations", fixture.read_bytes(), {"Content-Type":"application/json","X-Api-Key":"mock-device-key"})
        self.assertEqual(status, 201)
        self.assertEqual(body["origin"], "simulated")


if __name__ == "__main__":
    unittest.main()
