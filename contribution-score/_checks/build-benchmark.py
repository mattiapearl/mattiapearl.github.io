"""Publish only whitelisted aggregate fields from the completed benchmark.

Reads small local summary files, never metadata/parquet. No network access.
Usage: python _checks/build-benchmark.py PATH_TO_COMPACT_BENCHMARK_DELIVERY
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

POLICY = 'a042935d96c9d9c49a6ca6b62b1a15dfb6d521d044f3660b676a4264a9cd0f2d'
PROTOCOL = '7606c672978270443dc11ef3595d228e69911f31c4133578636b4d67709b304f'
INPUT = '7eae822a4312421fda91aef35c860d6de58ebcfee71cd4af38e0e2c58b79d7fe'
SCRIPT = 'f904df600755123e4018b5fd7a08289b603d277fd5c459e3192ce63b6217d229'


def build(source):
    manifest = json.loads((source / 'MANIFEST.json').read_text())
    files = ['FROZEN.json', 'SUMMARY.json', 'METRICS.csv', 'STATLOCKER_SUMMARY.csv', 'INPUT_AND_DEDUCTION_AUDIT.json']
    hashes = {}
    for name in files:
        raw = (source / name).read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if digest != manifest['artifacts'][name]['sha256'] or len(raw) != manifest['artifacts'][name]['bytes']:
            raise ValueError(f'benchmark receipt mismatch: {name}')
        hashes[name] = digest
    frozen = json.loads((source / 'FROZEN.json').read_text())
    if (frozen['scorer_policy_sha256'], frozen['protocol_sha256'], frozen['archived_v8_sha256'], frozen['script_sha256'], frozen['smoke']) != (POLICY, PROTOCOL, INPUT, SCRIPT, False):
        raise ValueError('wrong benchmark identity')
    summary = json.loads((source / 'SUMMARY.json').read_text())
    if tuple(summary[k] for k in ('matches', 'player_rows', 'variants', 'archived_v8_max_abs_error', 'smoke')) != (18741, 224892, 24, 0, False):
        raise ValueError('wrong completed run summary')
    with (source / 'METRICS.csv').open(newline='') as handle:
        metrics = list(csv.DictReader(handle))
    with (source / 'STATLOCKER_SUMMARY.csv').open(newline='') as handle:
        external = {row['variant']: row for row in csv.DictReader(handle)}
    if len(metrics) != 24 or len(external) != 24 or len({r['variant'] for r in metrics}) != 24:
        raise ValueError('expected all 24 variants')
    variants = []
    for row in metrics:
        if (int(row['matches']), int(row['players']), row['reference_variant']) != (18741, 224892, 'rational__all_current'):
            raise ValueError('wrong population or reference')
        ext = external[row['variant']]
        if tuple(int(ext[k]) for k in ('total_matches', 'total_players', 'correlation_matches', 'correlation_players')) != (11, 132, 11, 110):
            raise ValueError('wrong comparison coverage')
        kind, adjustment = row['variant'].split('__')
        variants.append({
            'id': row['variant'], 'curve': kind, 'adjustment': adjustment,
            'diagnostic_only': kind == 'linear_unbounded',
            'exact_scores': int(row['exact_players']), 'bounded_scores': int(row['bounded_players']),
            'complete_rosters': int(row['complete_rosters']),
            'top_changed': int(row['disjoint_guaranteed_top_matches']),
            'top_comparable': int(row['both_have_guaranteed_top']),
            'pair_reversals': int(row['guaranteed_pair_reversals']),
            'pairs_comparable': int(row['pairs_ordered_by_both']),
            'score_upper_max': float(row['max_upper']),
            'score_upper_over_100': int(row['players_upper_over_100']),
            'agreement': float(ext['mean_within_match_spearman']),
            'agreement_delta': float(ext['delta_vs_v8']),
            'agreement_delta_ci95': [float(ext['paired_match_bootstrap_delta_lo']), float(ext['paired_match_bootstrap_delta_hi'])],
            'external_pairs': {key: int(ext[key]) for key in ('strict_label_pairs', 'definite_agreement', 'definite_disagreement', 'tied_or_unresolved')},
        })
    audit = json.loads((source / 'INPUT_AND_DEDUCTION_AUDIT.json').read_text())
    # Explicit field selection: no account IDs, names, match IDs, paths or samples.
    return {
        'schema': 'match-score-benchmark-public/1', 'date': '2026-09-28',
        'aggregate_only': True, 'baseline': 'rational__all_current', 'policy_sha256': POLICY,
        'population': {'matches': 18741, 'player_games': 224892, 'development_matches': 17741,
                       'later_matches': 1000, 'reused_data': True, 'independent_holdout': False,
                       'all_outliers_and_bounds_retained': True},
        'comparison': {'matches': 11, 'player_games': 132, 'common_exact_player_games': 110,
                       'bootstrap_draws': 1000, 'intervals_adjusted_for_multiple_comparisons': False,
                       'target': 'historical external scorer; agreement is not ground-truth accuracy'},
        'audit': {
            'confirmed_credited_player_events': audit['event_trace']['known_credited_player_events'],
            'confirmed_events_reusing_interval_damage': audit['event_trace']['known_credited_events_in_reused_intervals'],
            'mean_deduction_bounds': [audit['deduction_lower']['mean'], audit['deduction_upper']['mean']],
            'maximum_deduction_upper': audit['deduction_upper']['max'],
            'uncapped_linear_gross_upper_over_100': audit['uncapped_linear_gross_over_100'],
        },
        'verification': {'archived_baseline_max_abs_error': 0, 'implementation_tests_passed': 55,
                         'quality_accuracy_test': False},
        'variants': variants,
        'provenance': {'protocol_sha256': PROTOCOL, 'benchmark_script_sha256': SCRIPT,
                       'input_archive_sha256': INPUT, 'summary_sha256': {
                           'freeze': hashes['FROZEN.json'], 'run_summary': hashes['SUMMARY.json'], 'metrics': hashes['METRICS.csv'],
                           'external_comparison': hashes['STATLOCKER_SUMMARY.csv'],
                           'input_and_deduction_audit': hashes['INPUT_AND_DEDUCTION_AUDIT.json']}},
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--check', action='store_true', help='Verify the published bytes without rewriting them')
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / 'benchmark.json'
    expected = (json.dumps(build(args.source), indent=2, allow_nan=False) + '\n').encode('utf8')
    if args.check:
        if output.read_bytes() != expected:
            raise ValueError('published benchmark differs from verified aggregate export')
        print('Published aggregate bytes match the verified source')
    else:
        output.write_bytes(expected)
        print(f'Wrote aggregate-only benchmark: {output}')
