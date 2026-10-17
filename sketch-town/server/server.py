"""Sketch Town local server.

  python server/server.py                       # watch ./scans/inbox
  python server/server.py --watch "C:/Users/me/Pictures/ScanSnap"
  python server/server.py --host 0.0.0.0        # let other PCs/tablets on the LAN connect

Serves the operator station (/) and the 3D projection wall (/wall.html),
watches a hot folder for new scanner files, runs the OpenCV pipeline, and
pushes "spawn" events to every connected wall with Server-Sent Events.
"""
import argparse
import json
import mimetypes
import os
import queue
import threading
import time
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

import pipeline

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WEB = os.path.join(ROOT, "web")
SHARED = os.path.join(ROOT, "shared")
SCANS = os.path.join(ROOT, "scans")
TEXTURES = os.path.join(SCANS, "textures")
GALLERY = os.path.join(SCANS, "gallery.json")
SEEN = os.path.join(SCANS, "seen.json")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".pdf")
MAX_BODY = 40 * 1024 * 1024

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/json", ".json")


# ------------------------------------------------------------------ state
class Hub:
    """Fan-out of events to every connected display (SSE)."""

    def __init__(self):
        self.lock = threading.Lock()
        self.clients = []
        self.log = []  # recent activity for the operator status panel

    def subscribe(self):
        q = queue.Queue(maxsize=200)
        with self.lock:
            self.clients.append(q)
        return q

    def unsubscribe(self, q):
        with self.lock:
            if q in self.clients:
                self.clients.remove(q)

    def publish(self, event):
        event.setdefault("id", uuid.uuid4().hex)
        event.setdefault("time", time.time())
        with self.lock:
            for q in list(self.clients):
                try:
                    q.put_nowait(event)
                except queue.Full:
                    pass
        return event

    def note(self, level, text):
        entry = {"time": time.time(), "level": level, "text": text}
        print(f"[{level}] {text}", flush=True)
        with self.lock:
            self.log = (self.log + [entry])[-40:]
        self.publish({"type": "log", **entry})


HUB = Hub()
GALLERY_LOCK = threading.Lock()


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def ingest(img, source, template_id=None, registered=False, boost=True, label=""):
    """Run the pipeline on a decoded image, store the texture and announce it."""
    rgba, info = pipeline.process(img, template_id, registered=registered, boost=boost)
    sid = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
    pipeline.save_png(os.path.join(TEXTURES, sid + ".png"), rgba)
    item = {"id": sid, "url": f"/textures/{sid}.png", "source": source, "label": label, "time": time.time(), **info}
    with GALLERY_LOCK:
        gallery = load_json(GALLERY, [])
        gallery.append(item)
        save_json(GALLERY, gallery[-500:])
    HUB.publish({"type": "spawn", "item": item, "id": sid})
    detail = "" if info["codeDetected"] or registered else " (template code not found, used operator choice)"
    HUB.note("ok", f"{source}: {label or sid} -> {info['template']} via {info['method']}{detail}")
    return item


# ---------------------------------------------------------- hot folder
class FolderWatcher(threading.Thread):
    """Polls the scanner's output folder. Polling (not OS events) works the same on
    Windows, macOS, Linux and network shares, and lets us wait until the scanner has
    finished writing the file (size stable across two polls)."""

    def __init__(self, folder, get_default_template, interval=1.0):
        super().__init__(daemon=True)
        self.folder = folder
        self.get_default_template = get_default_template
        self.interval = interval
        self.seen = set(load_json(SEEN, []))
        self.pending = {}

    def run(self):
        os.makedirs(self.folder, exist_ok=True)
        HUB.note("info", f"Watching scanner folder: {self.folder}")
        while True:
            try:
                self.poll()
            except Exception as e:  # never let the watcher die
                HUB.note("error", f"watcher: {e}")
            time.sleep(self.interval)

    def poll(self):
        names = [n for n in os.listdir(self.folder) if n.lower().endswith(IMAGE_EXT) and not n.startswith(".")]
        for name in sorted(names):
            path = os.path.join(self.folder, name)
            try:
                st = os.stat(path)
            except OSError:
                continue
            key = f"{name}|{int(st.st_mtime)}|{st.st_size}"
            if key in self.seen:
                continue
            prev = self.pending.get(name)
            if prev != st.st_size or st.st_size == 0:
                self.pending[name] = st.st_size  # still being written, check next poll
                continue
            self.pending.pop(name, None)
            self.seen.add(key)
            save_json(SEEN, sorted(self.seen)[-5000:])
            HUB.publish({"type": "scanning", "label": name})
            try:
                img = pipeline.read_image(path)
                ingest(img, "scanner", self.get_default_template(), label=name)
            except Exception as e:
                HUB.note("error", f"{name}: {e}")


# ------------------------------------------------------- WIA (Windows)
def wia_scan(dpi=200):
    """Trigger a flatbed scan directly through Windows Image Acquisition (optional)."""
    try:
        import pythoncom
        import win32com.client
    except ImportError as e:
        raise RuntimeError("Direct scanning needs Windows + 'pip install pywin32'. "
                           "Otherwise use the scanner's own app and the hot folder.") from e
    pythoncom.CoInitialize()
    try:
        dm = win32com.client.Dispatch("WIA.DeviceManager")
        info = next((d for d in dm.DeviceInfos if d.Type == 1), None)  # 1 = scanner
        if info is None:
            raise RuntimeError("No WIA scanner found")
        item = info.Connect().Items[1]
        for p in item.Properties:
            if p.PropertyID in (6147, 6148):  # horizontal / vertical resolution
                p.Value = dpi
            elif p.PropertyID == 6146:  # colour intent: 1 = colour
                p.Value = 1
        image = item.Transfer("{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}")  # PNG
        return bytes(image.FileData.BinaryData)
    finally:
        pythoncom.CoUninitialize()


# ------------------------------------------------------------- handler
class Handler(BaseHTTPRequestHandler):
    server_version = "SketchTown/1.0"
    config = {}

    def log_message(self, fmt, *args):  # keep the console readable
        pass

    # helpers
    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            raise ValueError("empty or too large body")
        return self.rfile.read(n)

    def send_file(self, path):
        if not os.path.isfile(path):
            return self.send_error(404)
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    @staticmethod
    def safe_join(base, rel):
        path = os.path.abspath(os.path.join(base, rel.lstrip("/")))
        return path if path.startswith(os.path.abspath(base) + os.sep) or path == os.path.abspath(base) else None

    # routes
    def do_GET(self):
        url = urlparse(self.path)
        p = unquote(url.path)
        if p == "/api/events":
            return self.sse()
        if p == "/api/status":
            return self.send_json({
                "watch": self.config["watch"],
                "displays": len(HUB.clients),
                "log": HUB.log[-20:],
                "defaultTemplate": self.config["template"],
                "wia": os.name == "nt",
            })
        if p == "/api/gallery":
            return self.send_json(load_json(GALLERY, [])[-120:])
        if p.startswith("/textures/"):
            path = self.safe_join(TEXTURES, p[len("/textures/"):])
        elif p.startswith("/shared/"):
            path = self.safe_join(SHARED, p[len("/shared/"):])
        else:
            path = self.safe_join(WEB, "operator.html" if p == "/" else p)
        if path is None:
            return self.send_error(403)
        return self.send_file(path)

    def do_POST(self):
        p = urlparse(self.path).path
        try:
            if p == "/api/scan":  # raw photo / scan: full registration pipeline
                img = pipeline.decode_bytes(self.read_body())
                src = self.headers.get("X-Source", "upload")
                tpl = self.headers.get("X-Template") or self.config["template"]
                HUB.publish({"type": "scanning", "label": src})
                return self.send_json(ingest(img, src, tpl, label=unquote(self.headers.get("X-Label", ""))))
            if p == "/api/submit":  # drawn on screen: already aligned to the sheet
                img = pipeline.decode_bytes(self.read_body())
                tpl = self.headers.get("X-Template") or self.config["template"]
                return self.send_json(ingest(img, "drawing", tpl, registered=True, boost=False, label="drawing"))
            if p == "/api/wia-scan":
                HUB.publish({"type": "scanning", "label": "flatbed"})
                data = wia_scan()
                img = pipeline.decode_bytes(data)
                return self.send_json(ingest(img, "flatbed", self.config["template"], label="WIA scan"))
            if p == "/api/command":
                cmd = json.loads(self.read_body() or b"{}")
                if cmd.get("type") == "template":
                    self.config["template"] = cmd.get("template", "truck")
                return self.send_json(HUB.publish({"type": "command", "command": cmd}))
            if p == "/api/clear-gallery":
                with GALLERY_LOCK:
                    save_json(GALLERY, [])
                HUB.publish({"type": "command", "command": {"type": "clear"}})
                return self.send_json({"ok": True})
        except pipeline.ScanError as e:
            HUB.note("error", str(e))
            return self.send_json({"error": str(e)}, 422)
        except Exception as e:
            HUB.note("error", f"{p}: {e}")
            return self.send_json({"error": str(e)}, 500)
        self.send_error(404)

    def sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        q = HUB.subscribe()
        try:
            self.wfile.write(b"retry: 2000\n\n")
            self.wfile.flush()
            while True:
                try:
                    ev = q.get(timeout=15)
                    data = json.dumps(ev, ensure_ascii=False)
                    self.wfile.write(f"data: {data}\n\n".encode("utf-8"))
                except queue.Empty:
                    self.wfile.write(b": ping\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            HUB.unsubscribe(q)


def main():
    ap = argparse.ArgumentParser(description="Sketch Town scanner + projection server")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--watch", default=os.path.join(SCANS, "inbox"), help="folder your scanner saves into")
    ap.add_argument("--template", default="truck", help="template used when a scan has no readable code")
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    os.makedirs(TEXTURES, exist_ok=True)
    Handler.config = {"watch": os.path.abspath(args.watch), "template": args.template}
    FolderWatcher(Handler.config["watch"], lambda: Handler.config["template"]).start()

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    httpd.daemon_threads = True
    url = f"http://127.0.0.1:{args.port}/"
    print("=" * 60)
    print(" Sketch Town is running / スケッチタウン起動中")
    print(f"  Operator station : {url}")
    print(f"  Projection wall  : {url}wall.html")
    print(f"  Scanner folder   : {Handler.config['watch']}")
    print("  Stop with Ctrl+C")
    print("=" * 60, flush=True)
    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("bye")


if __name__ == "__main__":
    main()
