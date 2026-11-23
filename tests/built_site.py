"""Read public entry points from the same build that the WSGI server serves."""
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend" / "src"
sys.path.insert(0, str(ROOT))


def source_text(area):
    directory = SOURCE / area
    paths = sorted(directory.rglob("*")) if directory.is_dir() else [directory]
    return "\n".join(p.read_text() for p in paths if p.suffix in {".js", ".jsx"})


def assert_js(test, fragment, source):
    """Check code tokens without making layout or optional trailing commas a contract."""
    def compact(text):
        return re.sub(r",([}\])])", r"\1", re.sub(r"\s+", "", text))
    test.assertTrue(compact(fragment) in compact(source), fragment)


def open_fixture(page, entry, sdk):
    from servidor import resource

    def serve(route):
        path = urlsplit(route.request.url).path
        if path == "/config.js":
            return route.fulfill(content_type="text/javascript", body="")
        if path == "/vendor/supabase.js":
            return route.fulfill(content_type="text/javascript", body=sdk)
        status, body, mime, _ = resource(path, "127.0.0.1")
        return route.fulfill(status=status, content_type=mime, body=body)

    origin = "https://clyriva.test"
    page.route(origin + "/**", serve)
    page.goto(origin + "/" + entry)
