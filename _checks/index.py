"""Check homepage coverage and local resources without extra dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re

ROOT = Path(__file__).resolve().parents[1]


class Index(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []
        self.styles = []
        self.h1 = 0
        self.lang = None

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        assert tag not in {"script", "iframe"}, "Keep the directory static"
        assert not any(key.startswith("on") for key in attrs), "No inline handlers"
        if tag == "a":
            self.links.append(attrs["href"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(attrs["href"])
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "html":
            self.lang = attrs.get("lang")


def resolve(href):
    url = urlsplit(href)
    assert not url.scheme and not url.netloc, href
    path = (ROOT / unquote(url.path).lstrip("/")).resolve()
    assert path.is_relative_to(ROOT), href
    return path / "index.html" if path.is_dir() else path


def check():
    index = Index()
    index.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    assert index.h1 == 1 and index.lang == "en"
    assert len(index.ids) == len(set(index.ids)), "Duplicate IDs"
    targets = set()
    for href in index.links:
        url = urlsplit(href)
        if url.scheme:
            assert url.scheme == "https", href
            continue
        target = resolve(href)
        assert target.is_file(), f"Broken link: {href}"
        if url.fragment and target == ROOT / "index.html":
            assert url.fragment in index.ids, href
        if url.path:
            targets.add(target)
    pages = {
        path.resolve() for path in ROOT.rglob("*.html")
        if path != ROOT / "index.html"
        and not any(part.startswith(("_", ".")) for part in path.relative_to(ROOT).parts)
    }
    missing = pages - targets
    assert not missing, f"Unlisted pages: {sorted(str(p.relative_to(ROOT)) for p in missing)}"
    assert "https://graffeproject.com" in index.links, "Preserve the existing project link"
    for href in index.styles:
        css_path = resolve(href)
        assert css_path.is_file(), href
        css = css_path.read_text(encoding="utf-8")
        assert "@import" not in css
        for _, resource in re.findall(r"url\(([\"']?)(.*?)\1\)", css):
            assert resolve(resource).is_file(), resource
    print(f"PASS: all {len(pages)} public subpages indexed; links, anchors, stylesheet and fonts resolve")


if __name__ == "__main__":
    check()
