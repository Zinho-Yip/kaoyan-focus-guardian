#!/usr/bin/env python3
"""Local LAN test server: static files plus a PHP-sync-compatible JSON endpoint."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
STORE = ROOT / "api" / "data.local.json"

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/sync.php":
            data = json.loads(STORE.read_text(encoding="utf-8")) if STORE.exists() else None
            self.send_json({"data": data})
            return
        super().do_GET()

    def do_PUT(self):
        if self.path.split("?", 1)[0] != "/api/sync.php":
            self.send_error(405)
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        current = json.loads(STORE.read_text(encoding="utf-8")) if STORE.exists() else None
        if current and current.get("updatedAt", 0) > payload.get("updatedAt", 0):
            self.send_json({"data": current, "kept": True})
            return
        STORE.parent.mkdir(exist_ok=True)
        STORE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        self.send_json({"data": payload})

    def send_json(self, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    print(f"LAN server: http://0.0.0.0:{args.port}", flush=True)
    server.serve_forever()
