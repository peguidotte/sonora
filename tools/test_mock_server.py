"""Testes dos limites do mock compartilhado, não das implementações dos colegas."""
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import json
import unittest

from mock_server import create_server


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
        req = Request(self.base + path, data=data, headers=headers or {})
        try:
            response = urlopen(req, timeout=3)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response), response.headers.get("X-Demo-Mode")

    def test_mock_identifies_synthetic_mode(self):
        status, body, mode = self.call("/api/v1/pontos")
        self.assertEqual(status, 200)
        self.assertTrue(body["items"][0]["isDemo"])
        self.assertEqual(mode, "static-contract-mock")

    def test_missing_profile_filters_rejected(self):
        status, _, _ = self.call("/api/v1/pontos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/perfil")
        self.assertEqual(status, 400)

    def test_simulated_data_never_labeled_public(self):
        path = "/api/v1/pontos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/perfil?from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z&origin=public_dataset"
        status, body, _ = self.call(path)
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "no_data")
        self.assertEqual(body["series"], [])
        self.assertEqual(body["sources"], [])

    def test_inverted_period_rejected(self):
        path = "/api/v1/pontos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/perfil?from=2026-11-09T15:00:00Z&to=2026-11-08T15:01:00Z&origin=simulated"
        status, _, _ = self.call(path)
        self.assertEqual(status, 400)

    def test_missing_write_key_rejected(self):
        status, _, _ = self.call("/api/v1/observacoes", b"{}", {"Content-Type":"application/json"})
        self.assertEqual(status, 401)

    def test_client_cannot_choose_origin(self):
        body = {"externalId":"x","deviceId":"11111111-1111-4111-8111-111111111111","sessionId":"x","observedAt":"2026-11-08T15:00:00Z","durationSeconds":5,"laeqDbA":60,"origin":"public_dataset"}
        status, _, _ = self.call("/api/v1/observacoes", json.dumps(body).encode(), {"Content-Type":"application/json","X-Ingest-Key":"not-a-real-secret"})
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
