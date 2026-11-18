"""Ingestão LENTA para testar o firmware no Wokwi: segura cada POST por --delay segundos e responde 503.

Reproduz o cenário da revisão (servidor lento/timeout/reenvio). Com o firmware apontando para
http://host.wokwi.internal:<porta>, o serial deve continuar mostrando uma janela a cada 5 s com
amostras=50 em 4900 ms, enquanto os envios ficam em timeout/503 e entram em reenvio. Não grava nada.

    python iot/test/slow_ingest.py --port 4012 --delay 8
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import argparse
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=4012)
    parser.add_argument("--delay", type=float, default=8.0, help="segundos antes de responder (timeout do firmware: 5 s)")
    args = parser.parse_args()

    class Slow(BaseHTTPRequestHandler):
        def do_POST(self):
            self.rfile.read(int(self.headers.get("Content-Length") or 0))
            time.sleep(args.delay)
            try:
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"code":"service_unavailable","message":"Slow test server."}')
            except (BrokenPipeError, ConnectionResetError):
                pass  # o firmware já desistiu pelo timeout

        def log_message(self, fmt, *values):
            print(f"[lento] {self.command} {self.path} segurado {args.delay:.0f} s", flush=True)

    print(f"Ingestão lenta em http://127.0.0.1:{args.port} (delay {args.delay} s, sempre 503; não grava nada)", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Slow).serve_forever()


if __name__ == "__main__":
    main()
