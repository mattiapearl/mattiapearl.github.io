"""Publication checks. Use the Python environment from _src/requirements.txt."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import json
import hashlib
import re
import runpy
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.h1 = 0
        self.frames = 0
        self.eyes = 0
        self.details = 0
        self.math = 0
        self.tex = 0
        self.visuals = set()
        self.text = []
        self.csp = None
        self.lang = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        assert tag not in {"script", "iframe", "object", "embed"}, tag
        assert not any(k.startswith("on") for k in attrs), attrs
        assert "style" not in attrs, "Inline style would violate the CSP"
        assert not (tag == "mspace" and "linebreak" in attrs), "Use separate MathML blocks; Core does not support forced mspace line breaks"
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if "href" in attrs:
            self.links.append((tag, attrs["href"], attrs.get("rel")))
        if tag == "h1":
            self.h1 += 1
        if tag == "g" and "portal-frame" in attrs.get("class", "").split():
            self.frames += 1
            self.eyes += "prefilled" in attrs.get("class", "").split()
        if "data-visual" in attrs:
            self.visuals.add(attrs["data-visual"])
        if tag == "math":
            self.math += 1
        if tag == "annotation" and attrs.get("encoding") == "application/x-tex":
            self.tex += 1
        if tag == "details":
            self.details += 1
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "meta" and attrs.get("http-equiv") == "Content-Security-Policy":
            self.csp = attrs["content"]

    def handle_data(self, text):
        self.text.append(text)


def check():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert html == runpy.run_path(str(ROOT / "_src" / "build.py"))["render"](), "Stale generated page"
    page = Page()
    page.feed(html)
    assert page.lang == "en" and page.h1 == 1 and page.frames == 12 and page.eyes == 2
    assert page.details == 8 and page.math == page.tex == 9
    assert page.visuals == {"portal", "motion", "flint", "durability", "bearing", "temple", "histogram"}
    assert all(f"m{i:02}" in page.ids for i in range(1, 6))
    word_count = len(" ".join(page.text).split())
    assert word_count < 1500, ("Copy budget exceeded", word_count)
    assert len(page.ids) == len(set(page.ids)), "Duplicate anchor ID"
    assert page.csp and "default-src 'none'" in page.csp and "font-src 'self'" in page.csp
    for tag, href, rel in page.links:
        url = urlsplit(href)
        if url.scheme:
            assert url.scheme == "https" or (rel == "icon" and url.scheme == "data"), href
            continue
        target = (ROOT / unquote(url.path)).resolve() if url.path else ROOT / "index.html"
        if target.is_dir():
            target /= "index.html"
        assert target.is_file(), href
        if url.fragment and target == ROOT / "index.html":
            assert url.fragment in page.ids, href
    for name in ["index.html", "style.css", "evidence.json"]:
        text = (ROOT / name).read_text(encoding="utf-8")
        assert not re.search(r"(?<![A-Za-z0-9])[A-Za-z]:[/\\]|file://|gh[pousr]_[A-Za-z0-9]{20,}", text), name
    assert not re.search(r"\$\{?[a-z][a-z_]+", html), "Unexpanded template variable"
    assert "@import" not in (ROOT / "style.css").read_text(encoding="utf-8")
    data = json.loads((ROOT / "evidence.json").read_text(encoding="utf-8"))
    assert data["scope"]["endToEndHumanTrials"] == 0 and not data["scope"]["rankedApproval"]
    motion = data["motion"]["cases"]
    assert len(motion) == 100 and len({r["fixture"] for r in motion}) == 100
    assert all(r["uniqueTrueRngSeed"] and r["candidateEyes"] == [r["expectedEyesFromCode"]] for r in motion)
    assert Counter(r["expectedEyesFromCode"] for r in motion) == {0: 23, 1: 34, 2: 28, 3: 11, 4: 4}
    a, b = (v["cases"] for v in data["gravel"]["variants"])
    assert len(a) == len(b) == 20
    for first, second in zip(a, b):
        assert first["fixture"] == second["fixture"]
        assert first["flintIndices"] == second["flintIndices"][:10]
        assert first["blazeOutcomes"] == second["blazeOutcomes"]
        assert first["expectedEyesFromCode"] == second["expectedEyesFromCode"]
    assert sum(r["candidatesAfterBlazes"] == 1 for r in a) == 17
    assert sum(r["candidatesAfterBlazes"] == 1 for r in b) == 20
    assert [len(r["extraBushCounts"]) for r in a if r["extraBushCounts"]] == [1, 3, 2]
    assert all(not r["extraBushCounts"] for r in b)
    for required in ["No human end-to-end validation", "Not Ranked-approved", "private seed filter", "full-world-seed prohibition", "Pi AI assistant", "0.138–0.422", "79.08%", "71.75%", "13,041", "0 complete human trials", "Simulated aiming", "Same 20 tests", "No portals were visited"]:
        assert required in html, required
    home = (ROOT.parent / "index.html").read_text(encoding="utf-8")
    assert 'href="mcsr-ranked/"' in home
    assert 'href="counthing.html"' in home and 'href="matcher.html"' in home
    forbidden = {".jar", ".class", ".zip", ".dll", ".exe", ".sqlite", ".db"}
    assert not any(p.suffix.lower() in forbidden for p in ROOT.rglob("*")), "Unexpected binary artifact"
    fonts = ROOT / "assets" / "fonts"
    for entry in json.loads((fonts / "sources.json").read_text()):
        assert hashlib.sha256((fonts / entry["file"]).read_bytes()).hexdigest() == entry["sha256"], entry["file"]
    assert "SIL OPEN FONT LICENSE" in (fonts / "atkinsonhyperlegible-OFL.txt").read_text()
    assert "SIL OPEN FONT LICENSE" in (fonts / "pixelifysans-OFL.txt").read_text()
    print(f"PASS: 7 visual explanations, 9 LaTeX/MathML formulas, {word_count} total words including disclosures, unchanged cohorts, anchors, privacy and font licenses")


if __name__ == "__main__":
    check()
