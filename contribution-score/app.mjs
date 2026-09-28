import { PARTS, FLOW, component, playground, interval, formatBounds, rankLabel, average, flowState } from './math.mjs';

const $ = id => document.getElementById(id);
const text = (id, value) => { $(id).textContent = value; };
const node = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
};
const fixed = (n, digits = 2) => n.toFixed(digits);
const clock = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
let fixtures;
let flowIndex = 0;
let selectedCase = 'duration';
let own = [true, true, true, false, false, false];
let enemy = [true, false, false, false, false, false];

function stack(id, parts, field) {
  const container = $(id);
  for (const part of parts) container.querySelector(`.${part.key}`).style.width = `${part[field]}%`;
  container.setAttribute('aria-label', `${field === 'gross' ? 'Gross' : 'Final'} points on a 0 to 100 axis: ${parts.map(p => `${p.label} ${fixed(p[field])}`).join(', ')}`);
}

function renderTeams() {
  for (const [id, group] of [['own-team', own], ['enemy-team', enemy]]) {
    const container = $(id);
    container.replaceChildren();
    group.forEach((dead, index) => {
      const you = id === 'own-team' && index === 0;
      const label = you ? 'You' : `${id === 'own-team' ? 'A' : 'B'}${index + 1}`;
      const button = node('button', 'team-dot');
      button.type = 'button';
      button.dataset.focus = String(you);
      button.dataset.index = String(index);
      button.setAttribute('aria-pressed', String(dead));
      button.setAttribute('aria-label', `${label}: ${dead ? 'dead' : 'alive'}. Toggle state`);
      button.append(node('b', '', dead ? '×' : '○'), node('span', '', label));
      button.addEventListener('click', () => {
        group[index] = !group[index];
        // Rebuild the twelve labels, then preserve keyboard focus on the same player.
        renderTeams();
        $(id).children[index].focus({ preventScroll: true });
        renderPlayground();
      });
      container.append(button);
    });
  }
}

function renderPlayground() {
  const work = Object.fromEntries(PARTS.map(part => [part.key, Number($(`${part.key}-r`).value)]));
  for (const part of PARTS) text(`${part.key}-r-value`, `${fixed(work[part.key])}×`);
  const events = Number($('events').value);
  const span = Number($('span').value);
  const gain = $('enemy-gain').checked;
  const result = playground(work, own, enemy, gain, events, span);
  const d = own.filter(Boolean).length;
  const e = enemy.filter(Boolean).length;
  text('events-value', String(events)); text('span-value', `${span / 60} min`);
  text('own-count', `${d} dead / 6`); text('enemy-count', `${e} dead / 6`);
  text('gross-total', fixed(result.gross)); stack('gross-bar', result.parts, 'gross');
  text('loss-total', fixed(result.loss, 4)); text('presence', fixed(result.p, 4));
  text('final-gross', fixed(result.gross)); text('final-p', fixed(result.p, 4)); text('final-score', fixed(result.score));
  stack('final-bar', result.parts, 'final');
  $('final-parts').replaceChildren(...result.parts.map(part => {
    const box = node('div', part.key);
    box.append(node('span', '', part.label), node('strong', '', `${fixed(part.final)} / ${part.limit}`));
    return box;
  }));
  if (!gain) {
    text('event-arithmetic', 'No supported enemy gain → share = 0');
    text('event-explanation', 'Recorded deaths alone do not add a map-concession deduction. Work remains whatever the snapshots demonstrate.');
  } else if (!own[0]) {
    text('event-arithmetic', 'You are recorded alive → share = 0');
    text('event-explanation', 'Living players receive no concession share, even when teammates are dead.');
  } else {
    text('event-arithmetic', `max(0, ${d} − ${e}) / (6 × ${d}) = ${fixed(result.share, 4)}`);
    const budget = Math.max(0, d - e) / 6;
    text('event-explanation', budget === 0
      ? 'Equal or favorable dead counts: no additional map-concession charge for this event.'
      : `${fixed(result.share, 4)} unit for each of the ${d} dead teammates: ${fixed(budget, 4)} across the team, not ${d} full events. The remaining ${fixed(1 - budget, 4)} is unallocated.`);
  }
  const x = 42 + work.fight / 6 * 413;
  const y = 230 - component(work.fight, 100) / 100 * 210;
  $('curve-dot').setAttribute('cx', String(x)); $('curve-dot').setAttribute('cy', String(y));
  $('curve-value').setAttribute('x', String(work.fight > 4 ? x - 15 : x + 13));
  $('curve-value').setAttribute('text-anchor', work.fight > 4 ? 'end' : 'start');
  $('curve-value').setAttribute('y', String(y - 13));
  text('curve-value', `${fixed(component(work.fight, 100), 1)}%`);
}

function renderFlow() {
  const key = $('scenario').value;
  const state = flowState(key, flowIndex);
  const descriptions = [
    ['Start with a match ID.', 'The ID selects a match. It is not an input feature that adds points. In a real service, access is checked before any work.'],
    key === 'cached'
      ? ['Found: a compatible evaluation.', 'Reuse its score, bounds and event evidence. Skip metadata loading and inference; a cached interval is still a valid completed evaluation.']
      : ['No evaluation held for this policy.', 'A missing archive record means work is needed, not that this player earned zero. Coordinate one bounded evaluation rather than launching duplicates.'],
    key === 'missing'
      ? ['Stopped: required metadata is not held.', 'Return a specific unavailable reason. An ID cannot reconstruct missing snapshots. This path does not launch a replay or metadata download.']
      : ['Load the recorded evidence.', 'Read already-held snapshots, roster identities, deaths and supported objective events. Preserve unknown durations and claimants; do not turn missing lists into observed empty lists.'],
    key === 'unsupported'
      ? ['Stopped: the mode is unsupported.', 'The current policy admits Ranked only. It does not silently relabel a custom or tournament game, or substitute an older scoring formula.']
      : ['The input is admissible.', 'The mode, roster and snapshot coverage pass. Admissible does not mean every event is fully known: relevant ambiguity may still produce bounds.'],
    ['Compute each player’s contribution.', 'Calculate gross fighting/support, objective and economy work. Apply one map-consequence factor. Preserve uncertain states as bounds and compare all twelve players for rank bounds.'],
    [state.exact ? 'Complete: a point result.' : 'Complete: a bounded result.', key === 'cached'
      ? 'Return the archived evaluation unchanged. It needs no scoring job. “Ready” reports completion, not certainty.'
      : 'Save the validated result, event evidence and input/policy identities, then return it. Both point and bounded results count as successful evaluations.'],
  ];
  text('flow-status', state.status);
  text('flow-title', descriptions[state.step][0]); text('flow-description', descriptions[state.step][1]);
  document.querySelectorAll('.flow li').forEach(li => {
    const step = Number(li.dataset.step);
    li.classList.toggle('is-active', step === state.step);
    li.classList.toggle('is-done', state.visited.includes(step) && step !== state.step);
    li.classList.toggle('is-skipped', state.complete && !state.visited.includes(step));
    if (step === state.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  const response = { match_id: 123456789, status: state.status };
  if (state.complete && state.status === 'ready') {
    const row = fixtures.cases.find(c => c.key === (state.exact ? 'known' : 'duration')).players[0];
    Object.assign(response, { source: state.source, evaluated: true, players_returned: 12,
      focus_player: row.id, point_score_available: row.score !== null,
      score: row.score, score_bounds: row.bounds, rank_bounds: row.rank });
  } else if (state.complete) Object.assign(response, { evaluated: false, players: [] });
  text('flow-json', JSON.stringify(response, null, 2).replace(/\[\n\s*([^\[\]\n]+),\n\s*([^\[\]\n]+)\n\s*\]/g, '[$1, $2]'));
  $('next-step').disabled = state.complete;
  $('next-step').textContent = state.complete ? 'Route complete' : 'Next step →';
}

const STORIES = {
  known: 'P01 dies at 4:10 and is recorded respawned at 4:25, before both enemy gains. Those events give P01 no concession share. All twelve scores are exact under the model.',
  duration: 'The death at 4:10 is recorded, but its duration is unknown. P01 may be alive or dead at the enemy gains. The scorer retains both possibilities instead of inventing a respawn time.',
  ordering: 'The recorded respawn and structure completion are both at 4:30. Their within-second order is unknown. The later 5:00 event is resolved, so only the structure event leaves a concession interval.',
  claimant: 'P01 is recorded alive, but the Rejuvenator claimant is unknown. The killing team does not establish the claiming team. Either team may receive eligible objective credit, so many players get score intervals.',
};
function renderEvidence() {
  const selected = fixtures.cases.find(c => c.key === selectedCase);
  const focus = selected.players[0];
  document.querySelectorAll('[data-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === selectedCase)));
  text('evidence-story', STORIES[selectedCase]);
  text('focus-score', formatBounds(focus.bounds)); text('focus-rank', rankLabel(focus.rank));
  text('focus-equation', `Gross ${formatBounds(focus.gross, 2)} × factor ${formatBounds(focus.presence, 4)} ≈ ${formatBounds(focus.bounds)} / 100`);
  text('coverage-label', `${selected.exact} exact · ${selected.bounded} bounded`);
  const width = (selected.death_duration === null ? 360 - selected.death_time : selected.death_duration) / 120 * 510;
  $('death-band').setAttribute('x', String(40 + (selected.death_time - 240) / 120 * 510));
  $('death-band').setAttribute('width', String(width));
  $('death-band').classList.toggle('known', selected.death_duration !== null);
  text('timeline-desc', STORIES[selectedCase]);
  $('roster').replaceChildren(...selected.players.map((row, index) => {
    const li = node('li', index === 0 ? 'focus' : '');
    li.dataset.player = row.id;
    const track = node('span', 'range-track'); track.setAttribute('aria-hidden', 'true');
    const mark = node('span', `range-mark${interval(row.bounds) ? '' : ' point'}`);
    mark.style.left = `${row.bounds[0]}%`;
    mark.style.width = `${row.bounds[1] - row.bounds[0]}%`;
    track.append(mark);
    li.append(node('span', '', row.id), track, node('span', '', formatBounds(row.bounds)), node('span', '', rankLabel(row.rank)));
    li.setAttribute('aria-label', `${row.id}: contribution ${formatBounds(row.bounds)} of 100; rank ${rankLabel(row.rank)} of 12`);
    return li;
  }));
  $('ledger').replaceChildren(...selected.focus_ledger.map(event => {
    const tr = node('tr');
    [ `${clock(event.time)} · ${event.kind}`, `${event.beneficiary} team`,
      event.dead === null ? 'Unknown' : event.dead ? 'Dead' : 'Alive',
      `${formatBounds(event.own_dead, 0)} / ${formatBounds(event.enemy_dead, 0)}`,
      formatBounds(event.earned, 4), formatBounds(event.concession, 4) ].forEach(value => tr.append(node('td', '', value)));
    return tr;
  }));
}

// Print the complete explanation, then restore the reader's disclosure state.
let printDetails = [];
window.addEventListener('beforeprint', () => {
  printDetails = [...document.querySelectorAll('details')].map(element => [element, element.open]);
  printDetails.forEach(([element]) => { element.open = true; });
});
window.addEventListener('afterprint', () => { printDetails.forEach(([element, open]) => { element.open = open; }); });
$('print').addEventListener('click', () => window.print());

try {
  const response = await fetch(new URL('./cases.json', import.meta.url));
  if (!response.ok) throw new Error('Fixture unavailable');
  fixtures = await response.json();
  if (fixtures.schema !== 'contribution-explainer-fixtures/1' || fixtures.synthetic_only !== true
      || fixtures.policy_sha256 !== 'a042935d96c9d9c49a6ca6b62b1a15dfb6d521d044f3660b676a4264a9cd0f2d') throw new Error('Incompatible fixture');
  const points = Array.from({ length: 121 }, (_, i) => {
    const r = i / 20;
    return `${i === 0 ? 'M' : 'L'}${42 + r / 6 * 413},${230 - component(r, 100) / 100 * 210}`;
  });
  $('curve-line').setAttribute('d', points.join(' '));
  for (const id of ['fight-r', 'objective-r', 'economy-r', 'events', 'span', 'enemy-gain']) $(id).addEventListener('input', renderPlayground);
  $('zero-work').addEventListener('click', () => { PARTS.forEach(p => { $(`${p.key}-r`).value = '0'; }); renderPlayground(); });
  $('reset-work').addEventListener('click', () => { PARTS.forEach(p => { $(`${p.key}-r`).value = p.key === 'fight' ? '2' : '1'; }); renderPlayground(); });
  $('equal-exchange').addEventListener('click', () => { own = [true, true, true, false, false, false]; enemy = [...own]; $('enemy-gain').checked = true; renderTeams(); renderPlayground(); });
  $('reset-event').addEventListener('click', () => { own = [true, true, true, false, false, false]; enemy = [true, false, false, false, false, false]; $('events').value = '1'; $('span').value = '1200'; $('enemy-gain').checked = true; renderTeams(); renderPlayground(); });
  $('scenario').addEventListener('change', () => { flowIndex = 0; renderFlow(); });
  $('next-step').addEventListener('click', () => { if (flowIndex < FLOW[$('scenario').value].path.length - 1) flowIndex++; renderFlow(); });
  $('reset-flow').addEventListener('click', () => { flowIndex = 0; renderFlow(); });
  document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => { selectedCase = button.dataset.case; renderEvidence(); }));
  text('mean-result', formatBounds(average([[40, 40], [41.2, 44.8], [0, 0]]).bounds));
  renderTeams(); renderPlayground(); renderFlow(); renderEvidence();
  document.body.dataset.ready = 'true';
} catch {
  $('load-error').hidden = false;
  document.body.dataset.ready = 'failed';
}
