# Portal-eye research page

Published at **https://mattiapearl.github.io/mcsr-ranked/**.

A static, readable presentation of the method register: observations, calculations,
results, uncertainty and failed experiments. This is documentation, **not a
Ranked-approved calculator or a distributed seed cracker**. No proprietary JAR,
decompiled game source, raw game data or installed game modification is included.

## Files and updates

- `_src/page.html`: human-readable page template and method explanations.
- `evidence.json`: curated original experiment outputs and summary/provenance data.
- `_src/build.py`: dependency-free renderer; derives tables, ranges, histogram and
  worked frame checks from the evidence instead of maintaining duplicate numbers.
- `index.html`: committed generated page served directly by GitHub Pages.
- `style.css`: responsive layout, keyboard focus and print styles; no remote assets.
- `_checks/check.py`: dependency-free content, data, link and publication checks.

The existing site publishes the root of `main`. No workflow, build service,
JavaScript runtime, third-party font, tracking or package installation is needed.
Underscore-prefixed source/check directories are not part of the Jekyll Pages output.

After editing the template or evidence, from the repository root:

```sh
python mcsr-ranked/_src/build.py
python mcsr-ranked/_src/build.py --check
python mcsr-ranked/_checks/check.py
python -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/mcsr-ranked/
```

Check both desktop and narrow mobile layouts, native details controls, anchors
and the JSON download. Screenshots and local browser logs do not belong in the
published directory.

## Evidence discipline

- Preserve the method IDs and date/version scope when updating.
- The 10- and 12-flint variants use the **same twenty fixtures**.
- `expectedEyesFromCode` is the fixture seed's calculated result, **not a portal
  observed by a player**. The motion sample used original server-side physics in
  a limited fixture with simulated, rounded F3 readings.
- There are currently **zero complete human-observation → prediction → portal-visit
  trials**. The builder intentionally requires a prose review if this or approval
  status changes.
- Retain ambiguous/failed results and all eye counts. Do not clip rare outcomes.
- Distinguish implementation test success, a seed-distribution probability and a
  conditional mathematical guarantee. Uniform references are not live Ranked odds.
- Solver time is not data-acquisition or gameplay time. The nine-drop method needs
  eighteen aiming readings, setup and a controlled scene.
- Recovery methods require RNG seed = Overworld generation seed to predict eyes;
  the geometry methods do not. Standardized portal eyes are required throughout.
- The full-64-bit recovery and tool-approval rule caveats must remain prominent.

The initial snapshot adapts the local readable method register and recorded
2026-09-29 research. Raw lab logs stay local; their hashes are included for
provenance. This public subset is not a standalone reproduction package. Research
was constructed and run by the Pi AI assistant under the account owner's direction,
not personally played/verified by the account owner. It is independent of MCSR
Ranked and Mojang.
