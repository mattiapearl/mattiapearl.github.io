import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raw = await readFile(new URL('../benchmark.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.mjs', import.meta.url), 'utf8');
const row = id => data.variants.find(value => value.id === id);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test('aggregate benchmark preserves the pinned population, policy and full 4x6 design', () => {
  assert.equal(data.schema, 'match-score-benchmark-public/1');
  assert.equal(data.aggregate_only, true);
  assert.equal(data.policy_sha256, 'a042935d96c9d9c49a6ca6b62b1a15dfb6d521d044f3660b676a4264a9cd0f2d');
  assert.equal(data.provenance.protocol_sha256, '7606c672978270443dc11ef3595d228e69911f31c4133578636b4d67709b304f');
  assert.equal(data.population.matches, 18741);
  assert.equal(data.population.player_games, 224892);
  assert.equal(data.population.development_matches + data.population.later_matches, data.population.matches);
  assert.equal(data.population.independent_holdout, false);
  assert.equal(data.population.all_outliers_and_bounds_retained, true);
  assert.equal(data.variants.length, 24);
  assert.equal(new Set(data.variants.map(value => value.id)).size, 24);
  for (const curve of ['rational', 'exponential', 'capped_linear', 'linear_unbounded']) {
    for (const adjustment of ['none', 'all_half', 'all_current', 'all_double', 'objective_only', 'fixed_reference']) {
      assert.equal(row(`${curve}__${adjustment}`).diagnostic_only, curve === 'linear_unbounded');
    }
  }
});

test('headline coverage, attribution counts and top-change denominator match the study', () => {
  const current = row(data.baseline), noFactor = row('rational__none');
  assert.equal(current.exact_scores, 179828);
  assert.equal(current.bounded_scores, 45064);
  assert.equal(noFactor.bounded_scores, 5387);
  assert.equal(current.bounded_scores - noFactor.bounded_scores, 39677);
  assert.equal(noFactor.top_changed, 2172);
  assert.equal(noFactor.top_comparable, 18324);
  assert.equal(noFactor.pair_reversals, 79039);
  assert.equal((100 * noFactor.top_changed / noFactor.top_comparable).toFixed(2), '11.85');
  assert.equal((100 * current.bounded_scores / data.population.player_games).toFixed(2), '20.04');
  assert.equal((100 * noFactor.bounded_scores / data.population.player_games).toFixed(2), '2.40');
  assert.equal(data.audit.confirmed_credited_player_events, 1497530);
  assert.equal(data.audit.confirmed_events_reusing_interval_damage, 1195282);
  assert.equal((100 * data.audit.confirmed_events_reusing_interval_damage / data.audit.confirmed_credited_player_events).toFixed(2), '79.82');
  assert.equal(row('exponential__all_current').top_changed, 557);
  assert.equal(row('capped_linear__all_current').top_changed, 1945);
  for (const variant of data.variants) {
    assert.equal(variant.exact_scores + variant.bounded_scores, data.population.player_games);
    assert.ok(variant.top_changed <= variant.top_comparable && variant.top_comparable <= data.population.matches);
    assert.ok(variant.pair_reversals <= variant.pairs_comparable);
    if (!variant.diagnostic_only) assert.ok(variant.score_upper_max <= 100);
  }
});

test('external comparison is small, matched, nominal and not an accuracy claim', () => {
  assert.equal(data.comparison.matches, 11);
  assert.equal(data.comparison.player_games, 132);
  assert.equal(data.comparison.common_exact_player_games, 110);
  assert.equal(data.comparison.intervals_adjusted_for_multiple_comparisons, false);
  assert.equal(data.verification.quality_accuracy_test, false);
  for (const variant of data.variants) {
    close(variant.agreement - row(data.baseline).agreement, variant.agreement_delta);
    assert.ok(variant.agreement_delta_ci95[0] <= variant.agreement_delta_ci95[1]);
    const pairs = variant.external_pairs;
    assert.equal(pairs.strict_label_pairs, 726);
    assert.equal(pairs.definite_agreement + pairs.definite_disagreement + pairs.tied_or_unresolved, 726);
    if (!variant.diagnostic_only) assert.ok(variant.agreement_delta_ci95[0] <= 0);
  }
  for (const id of ['rational__none', 'exponential__all_current', 'capped_linear__all_current']) {
    const [lo, hi] = row(id).agreement_delta_ci95;
    assert.ok(lo < 0 && hi > 0);
  }
});

test('visible static results agree with JSON before JavaScript runs', () => {
  for (const text of ['18,741', '224,892', '2,172 / 18,324', '79,039', '45,064 / 224,892', '5,387 / 224,892', '1,195,282 of 1,497,530']) {
    assert.ok(html.includes(text), text);
  }
  const signed = value => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(4)}`;
  const main = html.split('<tbody id="main-comparison">')[1].split('</tbody>')[0];
  for (const match of main.matchAll(/<tr data-variant="([^"]+)"><th scope="row">[^<]+<\/th><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)) {
    const variant = row(match[1]);
    assert.equal(match[2], variant.agreement.toFixed(4));
    assert.equal(match[3], variant.id === data.baseline ? 'Reference' : `${signed(variant.agreement_delta)} [${variant.agreement_delta_ci95.map(signed).join(', ')}]`);
  }
  assert.equal([...main.matchAll(/data-variant=/g)].length, 4);
});

test('public data is an explicit aggregate whitelist, not player records or branding', () => {
  const allowed = ['id', 'curve', 'adjustment', 'diagnostic_only', 'exact_scores', 'bounded_scores', 'complete_rosters',
    'top_changed', 'top_comparable', 'pair_reversals', 'pairs_comparable', 'score_upper_max', 'score_upper_over_100',
    'agreement', 'agreement_delta', 'agreement_delta_ci95', 'external_pairs'].sort();
  for (const variant of data.variants) assert.deepEqual(Object.keys(variant).sort(), allowed);
  assert.doesNotMatch(raw, /account_id|match_id|player_name|username|deadchaps|statlocker|\bedl\b|https?:\/\/|\/data\/|C:[/\\]/i);
  assert.doesNotMatch(raw, /NaN|Infinity/);
  for (const hash of Object.values(data.provenance.summary_sha256)) assert.match(hash, /^[a-f0-9]{64}$/);
});

test('candidate remains the same formula; removed detours and all internal links resolve', () => {
  assert.match(html, /scoring formula is unchanged/);
  assert.match(html, /large run measures sensitivity, not scoring accuracy/);
  assert.match(html, /not adjusted for the 23 comparisons/);
  assert.match(html, /not point mass or proven errors/);
  assert.match(html, /claim-timing proxy, not a pickup timestamp/);
  assert.doesNotMatch(html, /id="history"|id="reuse"|league rating|Average the evidence|mean-result/);
  assert.doesNotMatch(app, /mean-result|\baverage\(/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate element IDs');
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.ok(html.indexOf('id="benchmark"') < html.indexOf('id="work"'), 'results are not buried');
});
