# From a match to a score

An unbranded, static explanation of model v8: request lifecycle, positive work, the single map-consequence factor, evidence intervals, ranking and history aggregation. The final section distinguishes the current contribution model from a possible future league rating.

## Scope

- Only this `contribution-score/` subtree is added. Existing tools, homepage and Pages configuration are unchanged.
- No runtime dependency, framework, external font/script, analytics, credential, player lookup or live scorer call.
- The page fetches only its local `cases.json`; examples contain synthetic players, not real identities.
- Formula sliders are hypothetical. The four twelve-player scenarios are separate, byte-pinned scorer outputs.
- No policy, production integration, database, metadata retention or leaderboard is changed by publishing this page.
- Displayed response fields are illustrative lifecycle labels, not a promised wire-API schema.

## Run locally

From the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/contribution-score/
```

No build or package installation is required. Use the page's Print / PDF button to expand the technical disclosures for printing.

## Checks

From this directory, with Node 22+ and an installed Chrome:

```sh
node --test --test-reporter=spec _checks/math.test.mjs
node _checks/browser.mjs
# Optional published-site verification:
node _checks/browser.mjs https://mattiapearl.github.io/contribution-score/
```

`CHROME_BIN` can override the installed Chrome path. The browser check uses an isolated profile, blocks off-origin page requests and leaves screenshots plus a JSON receipt in an OS temporary directory. It exercises all five process routes, all four oracle cases, twelve individual results, zero work, no-conversion/equal-exchange rules, keyboard controls, print disclosure restoration and 1440/390/320 px layouts. No user browser profile is accessed.

The 14 arithmetic/content tests verify all 48 scenario rows against the frozen outputs: raw-work ratios, component points, one factor, score bounds and rank bounds. They also check event-budget conservation, objective shrinkage, equal-game endpoint averages, outward rounding and absence of branding/external runtime code.

The `_checks` directory is developer tooling; the legacy Pages/Jekyll build does not publish underscore-prefixed directories. It contains no private data either way.

## Reproduce the synthetic oracle

Provide a local copy of the frozen archive (not downloaded or bundled by this page):

```sh
python _checks/build-oracle.py /path/to/scorer.pyz
```

The builder checks the artifact hash before executing it. It constructs a six-minute, twelve-player synthetic match and changes only the focus player's death duration or the reported claimant:

| Case | Exact / bounded scores | Focus score bounds | Focus rank bounds |
| --- | --- | --- | --- |
| Known respawn | 12 / 0 | 27.755002221800773, 27.755002221800773 | 7, 7 |
| Missing respawn | 11 / 1 | 18.57524421072499, 27.755002221800773 | 7, 11 |
| Same-second ordering | 11 / 1 | 22.25569618283844, 27.755002221800773 | 7, 10 |
| Unknown claimant | 1 / 11 | 27.755002221800773, 39.122733728772516 | 6, 10 |

Each case records its canonical input hash. Zero work remains zero in all four cases. No unknown point is replaced by a midpoint, dropped from an evaluated-game average, or sorted as zero.

- Policy SHA-256: `a042935d96c9d9c49a6ca6b62b1a15dfb6d521d044f3660b676a4264a9cd0f2d`
- Artifact SHA-256: `bdbb77d0abbb1db9a23c4fe018218947feff39796fe44d2d79c22ce10f669840`

The explanation deliberately retains Ranked-only admission, historical mixed-mode reference calibration, the claim-timing proxy (not a pickup timestamp), unsupported evidence and non-causal interpretation. It does not claim the frozen formula is already validated for tournament/custom matches or a new league population.
