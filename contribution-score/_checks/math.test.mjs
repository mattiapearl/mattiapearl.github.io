import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PARTS, REFERENCE, FLOW, component, ratios, completionShare, concessionShare, consequence, playground,
  formatBounds, interval, ranks, rankLabel, average, flowState } from '../math.mjs';

const oracle = JSON.parse(await readFile(new URL('../cases.json', import.meta.url), 'utf8'));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('zero work has zero points; real 40/40/20 maxima; monotone diminishing returns', () => {
  assert.deepEqual(PARTS.map(p => p.limit), [40, 40, 20]);
  for (const { limit } of PARTS) {
    close(component(0, limit), 0);
    close(component(1, limit), limit / 2);
    close(component(3, limit), limit * .75);
    assert.ok(component(1000, limit) > component(6, limit)); // No production clipping at the slider limit.
    assert.ok(component(1000, limit) < limit);
    assert.ok(component(2, limit) - component(1, limit) > component(3, limit) - component(2, limit));
  }
  for (const bad of [-1, NaN, Infinity]) assert.throws(() => component(bad, 40));
});

test('event budgets conserve shared deficit; living, equal, favorable and no gain have zero share', () => {
  for (let d = 0; d <= 6; d++) for (let e = 0; e <= 6; e++) {
    const share = concessionShare(d, e, d > 0);
    close(share * d, Math.max(0, d - e) / 6);
    close(concessionShare(d, e, d > 0, false), 0);
    if (d < 6) close(concessionShare(d, e, false), 0);
  }
  close(concessionShare(3, 1, true), 1 / 9);
  assert.throws(() => concessionShare(0, 0, true));
  assert.throws(() => concessionShare(6, 0, false));
});

test('objective shrinkage matches the frozen synthetic event, retaining unallocated credit', () => {
  const claim = oracle.cases.find(c => c.key === 'claimant').focus_ledger[1];
  close(completionShare(900, 4500, 180), claim.earned[1]);
  assert.ok(completionShare(4500, 4500, 180) < 1);
  close(completionShare(0, 4500, 180), 0);
  assert.throws(() => completionShare(1, 0, 180));
  assert.throws(() => completionShare(1, 1, 0));
});

test('one factor only; gross components recombine without baseline credit', () => {
  const own = [true, true, true, false, false, false];
  const enemy = [true, false, false, false, false, false];
  const result = playground({ fight: 2, objective: 1, economy: 1 }, own, enemy, true, 1, 1200);
  close(result.gross, 80 / 3 + 20 + 10);
  close(result.p, 1 / (1 + .4 * (1 / 9) * 180 / 1200 / REFERENCE.objective));
  close(result.score, result.gross * result.p);
  close(playground({ fight: 0, objective: 0, economy: 0 }, own, enemy, true, 6, 180).score, 0);
  close(consequence(0, 360), 1);
  assert.throws(() => consequence(1, 0));
});

for (const scenario of oracle.cases) {
  test(`${scenario.key}: all 12 native results agree with taught work, factor, score and rank math`, () => {
    assert.equal(scenario.players.length, 12);
    assert.equal(scenario.exact + scenario.bounded, 12);
    const all = scenario.players.map(p => p.bounds);
    scenario.players.forEach((row, index) => {
      const p = row.losses.toReversed().map(loss => consequence(loss, oracle.observed_seconds));
      for (const end of [0, 1]) {
        close(row.presence[end], p[end]);
        const work = ratios(row.rates, end);
        for (const part of PARTS) {
          close(row.factors[part.key].gross[end], component(work[part.key], part.limit));
          close(row.factors[part.key].final[end], row.factors[part.key].gross[end] * p[end]);
        }
        close(row.bounds[end], PARTS.reduce((n, part) => n + row.factors[part.key].final[end], 0));
        close(row.gross[end], PARTS.reduce((n, part) => n + row.factors[part.key].gross[end], 0));
      }
      assert.deepEqual(ranks(all, index), row.rank);
      assert.equal(row.score === null, interval(row.bounds));
      if (row.score !== null) close(row.score, row.bounds[0]);
    });
    close(scenario.players[11].score, 0);
  });
}

test('uncertainty is not one mean estimate; exact players can have uncertain ranks', () => {
  const missing = oracle.cases.find(c => c.key === 'duration');
  assert.equal(missing.players[0].score, null);
  assert.deepEqual(missing.players[0].rank, [7, 11]);
  assert.ok(missing.players.some(p => p.score !== null && p.rank[0] < p.rank[1]));
  assert.equal(oracle.cases.find(c => c.key === 'known').exact, 12);
  assert.equal(oracle.cases.find(c => c.key === 'claimant').bounded, 11);
});

test('strict ranking shares ties and never sorts null points to zero', () => {
  const scores = [[50, 50], [50, 50], [40, 60], [0, 0]];
  assert.deepEqual(ranks(scores, 0), [1, 2]);
  assert.deepEqual(ranks(scores, 2), [1, 3]);
  assert.equal(rankLabel([3, 5]), '#3–#5');
  assert.equal(rankLabel([1, 1]), '#1');
});

test('history averages both endpoints, keeping bounded and zero-work games', () => {
  const result = average([[40, 40], [41.2, 44.8], [0, 0]]);
  assert.equal(result.games, 3);
  assert.equal(result.score, null);
  close(result.bounds[0], 81.2 / 3);
  close(result.bounds[1], 84.8 / 3);
  assert.equal(formatBounds(result.bounds), '27.0–28.3');
  assert.equal(average([[40, 40], [0, 0]]).score, 20);
  assert.throws(() => average([[40, 40], null]));
});

test('round bounds outward without hiding narrow uncertainty', () => {
  assert.equal(formatBounds([41.211, 41.212]), '41.2–41.3');
  assert.equal(formatBounds([0, 0]), '0.0');
  assert.equal(formatBounds(null), 'Unavailable');
});

test('ID lookup skips inference on a hit; bounded scoring is completed, missing input is not', () => {
  assert.deepEqual(FLOW.cached.path, [0, 1, 5]);
  for (const key of Object.keys(FLOW)) {
    const last = flowState(key, FLOW[key].path.length - 1);
    assert.equal(last.complete, true);
    assert.equal(last.status === 'ready', ['cached', 'score', 'range'].includes(key));
    assert.equal(flowState(key, 0).complete, false);
  }
  assert.equal(flowState('range', 5).exact, false);
  assert.equal(flowState('score', 5).exact, true);
  assert.ok(!FLOW.missing.path.includes(4));
  assert.ok(!FLOW.unsupported.path.includes(4));
});

test('public page has no branding, external code, trackers or live scoring calls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /deadchaps|\bedl\b|graffe|google-analytics|googletagmanager/i);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i);
  assert.match(html, /claim-timing proxy, not a pickup timestamp/);
  assert.doesNotMatch(app, /https?:\/\/|innerHTML|eval\(|localStorage|scorers\/|API_KEY/);
  assert.match(html, /Content-Security-Policy/);
  assert.equal(oracle.synthetic_only, true);
  assert.equal(oracle.artifact_sha256, 'bdbb77d0abbb1db9a23c4fe018218947feff39796fe44d2d79c22ce10f669840');
});
