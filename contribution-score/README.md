# A candidate match score

Unbranded, static explanation of the unchanged frozen v8 formula and the completed formula benchmark. The public page is organized as **results → inputs/math → adjustment → synthetic player example → request process**. History averaging and future rating-system design are no longer part of the presentation.

This simplifies the explanation, not the scoring policy. None of the benchmark alternatives is promoted or substituted into the player examples. The page is a candidate for assessment, not a claim of proven scoring accuracy.

## Public data and boundaries

- Only `contribution-score/` changes; the existing homepage, other tools and Pages configuration are untouched.
- No framework, dependency installation, analytics, credentials, external runtime assets or live scoring/player-lookup requests.
- `cases.json`: four unchanged, byte-pinned synthetic twelve-player scenarios. No real identities.
- `benchmark.json`: aggregate-only results for all 24 variants. No player/account/match identifiers, names, raw metadata, selected case rosters or private filesystem paths.
- The main benchmark remains readable without JavaScript; details contain the full matrix, exact work definitions and request simulation.
- The large 18,741-match run is a sensitivity study on reused data, not an independent accuracy test. The external agreement comparison has only 11 historical matches and 110 common-exact player observations. Nominal intervals are not multiplicity-adjusted.
- The unbounded linear variants are labelled diagnostics that violate component limits. No range is replaced by a midpoint or counted as an unfinished job.
- Native inputs remain Ranked-only; the page does not promise custom-match support or one exact scalar for every player.
- No production scorer, website integration, database or retention policy is changed by this publication.

## Run and check

From the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/contribution-score/
```

From `contribution-score/`, with Node 22+ and Chrome:

```sh
node --test --test-reporter=spec _checks/math.test.mjs _checks/benchmark.test.mjs
node _checks/browser.mjs
# Published-site acceptance:
node _checks/browser.mjs https://mattiapearl.github.io/contribution-score/
```

`CHROME_BIN` overrides the installed Chrome path. The browser check uses an isolated profile and blocks off-origin page requests. It covers all 24 aggregate rows, keyboard disclosure, the five request routes, all four oracle cases/all twelve players, curve presets, zero-work and consequence rules, keyboard slider input, print disclosure restoration, and collapsed/expanded layouts at 1440/390/320px. Receipts and screenshots go to an OS temporary directory. No user browser profile is accessed.

The Node checks retain all 48 native oracle-row comparisons and verify aggregate identities, counts, denominators, intervals, static fallback values, privacy, branding absence and link/ID integrity. The `_checks` directory is developer tooling, normally excluded by legacy Pages/Jekyll underscore-directory handling.

## Reproduce the aggregate export

Using the small delivered benchmark summaries (not raw data or parquet):

```sh
python _checks/build-benchmark.py /path/to/compact-benchmark-delivery
python _checks/build-benchmark.py /path/to/compact-benchmark-delivery --check
```

The exporter verifies source artifact hashes and the frozen policy/protocol/input/script identities, then selects an explicit aggregate field whitelist. Output is deterministic UTF-8/LF JSON. `--check` compares bytes without rewriting them. No full report or real-player case CSV is published.

The benchmark protocol is `7606c672978270443dc11ef3595d228e69911f31c4133578636b4d67709b304f`; implementation identity is `f904df600755123e4018b5fd7a08289b603d277fd5c459e3192ce63b6217d229`. Input archive and summary hashes are included in the public aggregate JSON.

## Synthetic oracle and formula identity

```sh
python _checks/build-oracle.py /path/to/scorer.pyz
```

This optional builder checks the local artifact hash, then constructs a six-minute synthetic match with twelve players. It changes only the focus player's death duration/order or the reported claimant. The actual fixtures are unchanged by the benchmark-page revision.

- Policy: `a042935d96c9d9c49a6ca6b62b1a15dfb6d521d044f3660b676a4264a9cd0f2d`
- Artifact: `bdbb77d0abbb1db9a23c4fe018218947feff39796fe44d2d79c22ce10f669840`

The boss-kill clock remains a **claim-timing proxy, not a pickup timestamp**. The four work references retain their mixed-mode historical provenance. Passing implementation tests or reproducing archived outputs is not evidence of correct causal attribution or an optimal formula.
