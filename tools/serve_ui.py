#!/usr/bin/env python3
"""
Serve the built intake UI as a durable service.

Why this exists: the Vite dev server is a foreground process owned by whoever
started it, and it died three separate times across build sessions. On a
conference stage that is the most likely thing to fail. This serves the static
`dist/` bundle instead, with no npm or network dependency at runtime, so it can
run from a Windows Scheduled Task that survives both a reboot and a logout.

  python tools/serve_ui.py              # serve on the default port
  python tools/serve_ui.py --port 8090
  python tools/serve_ui.py --check      # one-shot health probe, exits 0/1

Deliberately stdlib-only. Anything that needs `npx` or a package download at
start-up is a dependency that can fail at the worst moment.
"""
import argparse
import http.server
import os
import socketserver
import sys
import urllib.request
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Override with UI_DIST if you build the UI somewhere else.
DIST = os.environ.get('UI_DIST') or os.path.join(REPO, 'ui', 'dist')
DEFAULT_PORT = int(os.environ.get('UI_PORT') or 8090)


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static files out of dist/, with single-page-app fallback."""

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def send_head(self):
        # The app uses a client-side router, so any path that is not a real file
        # has to return index.html rather than a 404 -- otherwise a refresh on a
        # deep link breaks. Equivalent to the netlify.toml redirect.
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not self.path.startswith('/assets/'):
            self.path = '/index.html'
        return super().send_head()

    def end_headers(self):
        # index.html must never be cached: a rebuild changes the hashed asset
        # names inside it, and a stale copy would point at files that are gone.
        if self.path in ('/', '/index.html'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        else:
            self.send_header('Cache-Control', 'public, max-age=3600')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Scheduled tasks have no console; keep it terse and timestamped so the
        # redirected log file stays readable.
        sys.stderr.write('%s  %s\n' % (
            datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), fmt % args))
        sys.stderr.flush()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def check(port):
    url = 'http://127.0.0.1:%d/' % port
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            body = r.read(4096).decode('utf-8', 'replace')
        ok = r.status == 200 and '<title>Interview Prep</title>' in body
        print('%s  HTTP %s  title=%s' % (url, r.status, 'OK' if ok else 'MISSING'))
        return 0 if ok else 1
    except Exception as e:
        print('%s  UNREACHABLE: %s' % (url, e))
        return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=int(os.environ.get('UI_PORT', DEFAULT_PORT)))
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    if args.check:
        sys.exit(check(args.port))

    if not os.path.isfile(os.path.join(DIST, 'index.html')):
        sys.stderr.write('No build found at %s\nRun `npm run build` in the UI directory first.\n' % DIST)
        sys.exit(2)

    with Server(('0.0.0.0', args.port), Handler) as httpd:
        sys.stderr.write('%s  serving %s on 0.0.0.0:%d\n' % (
            datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), DIST, args.port))
        sys.stderr.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
