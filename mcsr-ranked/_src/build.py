"""Render the static research page using only Python's standard library.

The committed index.html is the GitHub Pages artifact; no runtime JS or build
service is required. Content lives in page.html; measured values in evidence.json.
"""
from collections import Counter
from datetime import date
from html import escape
from pathlib import Path
from statistics import mean
from string import Template
import argparse
import json

ROOT = Path(__file__).resolve().parent.parent


def percent(value):
    return f"{value:.2%}"


def count(value):
    return f"{value:,}"


def span(values, digits=None):
    low, high = min(values), max(values)
    if digits is not None:
        return f"{low:.{digits}f}–{high:.{digits}f}"
    return f"{low}–{high}"


def render():
    data = json.loads((ROOT / "evidence.json").read_text(encoding="utf-8"))
    motion = data["motion"]["cases"]
    variants = {v["targetFlints"]: v for v in data["gravel"]["variants"]}
    reference = data["coordinates"]["ideal"]
    example = data["workedExample"]
    if not motion or sorted(variants) != [10, 12]:
        raise ValueError("Missing study data")
    if len({r["fixture"] for r in motion}) != len(motion):
        raise ValueError("Duplicate motion fixture IDs")
    if any(not 0 <= r["expectedEyesFromCode"] <= 12 for r in motion):
        raise ValueError("Invalid eye count")
    if len(set(example["filledLocalFrameIndices"])) != example["eyeCountFromCode"]:
        raise ValueError("Worked example frame count disagrees")
    if any(not 0 <= i <= 11 for i in example["filledLocalFrameIndices"]):
        raise ValueError("Invalid frame index")
    if data["scope"]["endToEndHumanTrials"] != 0 or data["scope"]["rankedApproval"]:
        raise ValueError("New human/approval evidence requires a prose review, not just a number update")

    values = {
        "ranked_version": data["scope"]["ranked"],
        "minecraft_version": data["scope"]["minecraft"],
        "evidence_date": data["evidenceDate"],
        "evidence_date_display": date.fromisoformat(data["evidenceDate"]).strftime("%d %b %Y"),
        "human_trials": data["scope"]["endToEndHumanTrials"],
        "motion_total": len(motion),
        "motion_correct": sum(r["uniqueTrueRngSeed"] and r["candidateEyes"] == [r["expectedEyesFromCode"]] for r in motion),
        "motion_time_range": span([r["solverSeconds"] for r in motion], 3),
        "translated_fixtures": data["motion"]["additionalTranslatedFixtures"],
        "geometry_cases": count(data["motion"]["measurementModel"]["geometryCases"]),
        "baseline_one": percent(reference[0]["pAtLeastOne"]),
        "high_one": percent(reference[2]["pAtLeastOne"]),
        "high_zero": percent(1 - reference[2]["pAtLeastOne"]),
        "held_out_seeds": count(data["coordinates"]["heldOutSeeds"]),
        "actual_positions": count(data["coordinates"]["actualPositions"]),
        "actual_seeds": count(data["coordinates"]["actualPositionSeeds"]),
        "actual_high": percent(data["coordinates"]["actualFavourablePAtLeastOne"]),
        "actual_high_ci": "–".join(percent(p) for p in data["coordinates"]["actualFavourable95PercentSeedClusteredInterval"]),
        "temple_guarantees": count(data["temple"]["conditionalGuaranteesChecked"]),
        "temple_one": percent(data["temple"]["eastFacingEligiblePAtLeastOne"]),
        "example_seed": example["fixtureSeed"],
        "example_eyes": example["eyeCountFromCode"],
        "filled_frames": " and ".join(str(i) for i in example["filledLocalFrameIndices"]),
    }
    for n, variant in variants.items():
        rows = variant["cases"]
        if not rows or any(sum(r["blazeOutcomes"]) != data["gravel"]["blazeTargetRods"] for r in rows):
            raise ValueError("Blaze stopping rule disagrees with the study")
        values.update({
            f"gravel{n}_total": len(rows),
            f"gravel{n}_unique": sum(r["candidatesAfterBlazes"] == 1 for r in rows),
            f"gravel{n}_final": variant["finalCorrectUniqueRoots"],
            f"gravel{n}_break_range": span([r["gravelBreaks"] for r in rows]),
            f"gravel{n}_mean_breaks": f"{mean(r['gravelBreaks'] for r in rows):.2f}",
            f"gravel{n}_time_range": span([r["solverSeconds"] for r in rows], 3),
        })
    values["rod_kill_range"] = span([len(r["blazeOutcomes"]) for r in variants[10]["cases"]])
    values["rod_mean"] = f"{mean(len(r['blazeOutcomes']) for r in variants[10]['cases']):.2f}"
    values = {key: escape(str(value)) for key, value in values.items()}
    histogram = Counter(r["expectedEyesFromCode"] for r in motion)
    values["motion_histogram"] = "\n".join(
        f'<div class="histogram-row"><span>{eyes} eyes</span><meter min="0" max="{len(motion)}" value="{number}" aria-label="{number} of {len(motion)} fixtures had {eyes} eyes">{number}/{len(motion)}</meter><b>{number} cases</b></div>'
        for eyes, number in sorted(histogram.items())
    )
    values["reference_rows"] = "\n".join(
        f'<tr><th scope="row">{escape(row["group"])}</th><td>{percent(row["pAtLeastOne"])}</td><td>{percent(row["pAtLeastTwo"])}</td></tr>'
        for row in reference
    )
    values["example_checks"] = "\n".join(
        f'<li class="{"filled" if i in example["filledLocalFrameIndices"] else "empty"}" aria-label="Frame check {i}: {"eye present" if i in example["filledLocalFrameIndices"] else "no eye"}"><span>{i}</span><b aria-hidden="true">{"●" if i in example["filledLocalFrameIndices"] else "○"}</b></li>'
        for i in range(12)
    )
    return Template((ROOT / "_src" / "page.html").read_text(encoding="utf-8")).substitute(values)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the committed page is stale")
    args = parser.parse_args()
    expected = render()
    target = ROOT / "index.html"
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != expected:
            raise SystemExit("Stale index.html: run python mcsr-ranked/_src/build.py")
        print("PASS: rendered page matches its source and evidence")
    else:
        target.write_text(expected, encoding="utf-8", newline="\n")
        print("Rendered mcsr-ranked/index.html")
