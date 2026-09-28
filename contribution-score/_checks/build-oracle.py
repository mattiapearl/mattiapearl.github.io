"""Generate anonymous teaching cases from a byte-pinned, local v8 archive.
Usage: python _checks/build-oracle.py /path/to/scorer.pyz
No network, private data, third-party dependencies, or production writes.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ARTIFACT = "bdbb77d0abbb1db9a23c4fe018218947feff39796fe44d2d79c22ce10f669840"
POLICY = "a042935d96c9d9c49a6ca6b62b1a15dfb6d521d044f3660b676a4264a9cd0f2d"
archive = Path(sys.argv[1])
assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARTIFACT
cases = []
for key, duration, claimant, title in (
    ("known", 15, 1, "Known respawn"),
    ("duration", None, 1, "Missing respawn"),
    ("ordering", 20, 1, "Same-second ordering"),
    ("claimant", 15, None, "Unknown claimant"),
):
    players = []
    for slot in range(12):
        work = 0 if slot == 11 else 5 if slot == 0 else slot + 1
        stats = []
        for clock in (0, 180, 360):
            stats.append({"time_stamp_s": clock, "net_worth": clock * work + 100,
                "max_health": 1000, "player_damage": clock * work,
                "teammate_healing": clock * (slot % 2) if work else 0,
                "teammate_barriering": 0, "kills": clock // 180 if work else 0,
                "assists": clock // 90 if work else 0, "boss_damage": clock * work,
                "creep_kills": clock // 10 if work else 0, "neutral_kills": 0,
                "denies": 0, "gold_lane_creep": clock * work, "gold_neutral_creep": 0})
        players.append({"account_id": 1001 + slot, "hero_id": 1 + slot,
            "player_slot": 1 + slot, "team": slot // 6, "stats": stats,
            "death_details": [{"game_time_s": 250, "death_duration_s": duration}] if slot == 0 else []})
    metadata = {"match_info": {"match_id": 123456789, "match_mode": 4, "duration_s": 360,
        "players": players,
        "objectives": [{"team": 0, "team_objective_id": 1, "first_damage_time_s": 200, "destroyed_time_s": 270}],
        "mid_boss": [{"team_killed": 0, "team_claimed": claimant, "destroyed_time_s": 300}]}}
    raw = json.dumps(metadata, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    run = subprocess.run([sys.executable, str(archive), "--metadata", "-", "--ledger"], input=raw, capture_output=True, check=True)
    native = json.loads(run.stdout)
    assert native["policy_sha256"] == POLICY
    rows = []
    for source, player in zip(native["player_games"], players):
        start, end = player["stats"][0], player["stats"][-1]
        # All synthetic snapshots have 1000 HP; no per-interval health variation.
        physical = .5 * ((end["player_damage"] - start["player_damage"]) / 1000
                        + (end["teammate_healing"] - start["teammate_healing"]) / 1000)
        participation = .5 * (end["kills"] + end["assists"])
        economy = .5 * end["gold_lane_creep"] if end["creep_kills"] > 0 else 0
        rows.append({"id": f"P{player['player_slot']:02d}", "team": player["team"],
            "score": source["score"], "bounds": source["score_bounds"], "rank": source["rank_bounds"],
            "gross": source["gross_score_bounds"], "presence": source["map_presence_bounds"],
            "losses": source["map_concession_units_bounds"],
            "rates": {"physical": physical, "participation": participation, "economy": economy,
                "objective": [.5 * sum(e["earned_completion_units_bounds"][i] for e in source["map_event_ledger"]) for i in (0, 1)]},
            "factors": {k: {"limit": f["point_limit"], "gross": f["gross_points_bounds"], "final": f["weighted_score_bounds"]}
                        for k, f in source["factors"].items()}})
    ledger = [{"time": e["time"], "kind": "Structure completion" if e["source"] == "structure" else "Reported Rejuvenator claim",
        "beneficiary": "unknown" if e["beneficiary_team"] is None else "own" if e["beneficiary_team"] == 0 else "enemy",
        "dead": e["dead_at_anchor"], "own_dead": e["own_dead_bounds"], "enemy_dead": e["enemy_dead_bounds"],
        "earned": e["earned_completion_units_bounds"], "concession": e["concession_units_bounds"]}
        for e in native["player_games"][0]["map_event_ledger"]]
    cases.append({"key": key, "title": title, "death_time": 250, "death_duration": duration,
        "claimant": claimant, "input_sha256": hashlib.sha256(raw).hexdigest(),
        "exact": native["ranking"]["exact_scores"], "bounded": native["ranking"]["bounded_scores"],
        "players": rows, "focus_ledger": ledger})
output = {"schema": "contribution-explainer-fixtures/1", "model": "v8", "policy_sha256": POLICY,
    "artifact_sha256": ARTIFACT, "synthetic_only": True, "observed_seconds": 360,
    "cases": cases}
path = Path(__file__).resolve().parents[1] / "cases.json"
path.write_text(json.dumps(output, indent=2, allow_nan=False) + "\n", encoding="utf-8")
print(json.dumps({"bytes": path.stat().st_size, "cases": [{"key": c["key"], "exact": c["exact"], "bounded": c["bounded"], "focus": c["players"][0]["bounds"], "rank": c["players"][0]["rank"]} for c in cases]}))
