# End Portal eyes — visual guide

**https://mattiapearl.github.io/mcsr-ranked/**

Five method cards, original block-style SVG diagrams, charts and LaTeX equations.
Body text uses Atkinson Hyperlegible; headings use Pixelify Sans. Everything is
served locally. No runtime JavaScript, CDN requests, analytics or game access.

## Build

In a Python virtual environment, from the repository root:

```sh
python -m pip install -r mcsr-ranked/_src/requirements.txt
python mcsr-ranked/_src/build.py
python mcsr-ranked/_src/build.py --check
python mcsr-ranked/_checks/check.py
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/mcsr-ranked/`. GitHub Pages serves the committed
`index.html`; it does not run Python or install the build dependency.

- `_src/page.html`: concise content and layout.
- `_src/build.py`: evidence-derived results; LaTeX → native MathML using pinned
  `latex2mathml`. Each equation retains its TeX annotation. Modern browsers render
  the published maths without scripts, even offline.
- `_src/visuals.py`: original portal, falling-block, sight-line, compass and temple
  schematics; evidence-derived drop sequence and histogram. No game textures.
- `evidence.json`: unchanged experiment records and provenance.
- `style.css`: responsive layout, 18px body copy, keyboard focus and print styles.
- `assets/fonts/`: three self-hosted WOFF2 files, upstream SHA-256/source manifest
  and both SIL OFL 1.1 licences. The font files and licences are unmodified.
- `_checks/check.py`: data, copy-length, diagram, LaTeX, link, privacy and font checks.

Check desktop and 320px mobile layouts, font loading, native maths, keyboard
navigation, details and the data download before publishing. Keep screenshots
and browser logs outside the site. Source/check folders are excluded by Jekyll.

## Evidence rules

This is offline research, not a Ranked-approved tool. Keep these distinctions:

- Zero complete human observation → prediction → portal-visit trials.
- Motion: original physics fixtures, **simulated aiming**. Nine drops are not
  universally sufficient. M01 internally recovers full 64-bit RNG seeds.
- The ten- and twelve-flint variants use the **same twenty fixtures**.
- Expected eyes are calculated by code, not read from visited portals.
- Uniform-seed probabilities are not calibrated live Ranked odds.
- Temple guarantees depend on all conditions; hypothetical quarter anchors do
  not establish that actual origin temples exist in those test cases.
- All outcomes count. Preserve failures, ambiguity and rare values; do not clip.
- Solver time excludes setup and recording. Standardized eyes are required;
  M01/M02 also assume RNG seed = Overworld seed.

Research was constructed and run by the Pi AI assistant under the account
owner's direction. Raw lab logs, proprietary binaries and decompiled game code
remain local. The JSON is a curated snapshot, not a reproduction package.
