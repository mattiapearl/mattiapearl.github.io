// Teaching arithmetic for the frozen v8 policy. Not a metadata ingestion/scoring API.
export const EPS = 1e-10;
export const REFERENCE = Object.freeze({ physical: 1.2422474822178062, participation: 1.561217977609064,
  objective: 0.13490002814390184, economy: 1316.0570647882992, tau: 3901.9950997238093 });
export const PARTS = Object.freeze([
  { key: 'fight', label: 'Fighting / support', limit: 40 },
  { key: 'objective', label: 'Objectives', limit: 40 },
  { key: 'economy', label: 'Economy', limit: 20 },
]);
function nonnegative(n) {
  if (!Number.isFinite(n) || n < 0) throw new Error('Finite nonnegative work required');
  return n;
}
export function component(r, limit) {
  nonnegative(r); nonnegative(limit);
  // Avoid overflow for large finite work; zero is exactly zero.
  return limit * (r / (1 + r));
}
export function ratios(rates, endpoint = 0) {
  return { fight: .8 * nonnegative(rates.physical) / REFERENCE.physical + .2 * nonnegative(rates.participation) / REFERENCE.participation,
    objective: nonnegative(rates.objective[endpoint]) / REFERENCE.objective,
    economy: nonnegative(rates.economy) / REFERENCE.economy };
}
export function completionShare(personalDamage, teamDamage, seconds) {
  nonnegative(personalDamage); nonnegative(teamDamage);
  if (personalDamage > teamDamage || !Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid completion evidence');
  return personalDamage / (teamDamage + REFERENCE.tau * seconds / 180);
}
export function concessionShare(ownDead, enemyDead, playerDead, enemyGain = true) {
  if (![ownDead, enemyDead].every(n => Number.isInteger(n) && n >= 0 && n <= 6)
      || (playerDead && ownDead === 0) || (!playerDead && ownDead === 6)) throw new Error('Inconsistent team state');
  return playerDead && enemyGain ? Math.max(0, ownDead - enemyDead) / (6 * ownDead) : 0;
}
export function consequence(lossUnits, seconds) {
  nonnegative(lossUnits);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Positive observed time required');
  return 1 / (1 + .4 * lossUnits * 180 / seconds / REFERENCE.objective);
}
export function playground(work, own, enemy, gain, events, seconds) {
  const share = concessionShare(own.filter(Boolean).length, enemy.filter(Boolean).length, own[0], gain);
  const loss = share * nonnegative(events);
  const p = consequence(loss, seconds);
  const parts = PARTS.map(part => ({ ...part, gross: component(work[part.key], part.limit), final: component(work[part.key], part.limit) * p }));
  return { share, loss, p, parts, gross: parts.reduce((n, part) => n + part.gross, 0), score: parts.reduce((n, part) => n + part.final, 0) };
}
export function validBounds(b) {
  return Array.isArray(b) && b.length === 2 && b.every(Number.isFinite) && b[0] >= 0 && b[0] <= b[1] && b[1] <= 100;
}
export function interval(b) { return validBounds(b) && b[1] - b[0] > EPS; }
export function formatBounds(b, digits = 1) {
  if (!validBounds(b)) return 'Unavailable';
  if (!interval(b)) return b[0].toFixed(digits);
  const scale = 10 ** digits;
  return `${(Math.floor(b[0] * scale) / scale).toFixed(digits)}–${(Math.ceil(b[1] * scale) / scale).toFixed(digits)}`;
}
export function ranks(all, index) {
  if (!all.every(validBounds) || !all[index]) throw new Error('Invalid roster bounds');
  const self = all[index];
  return [1 + all.filter((b, i) => i !== index && b[0] > self[1]).length,
    1 + all.filter((b, i) => i !== index && b[1] > self[0]).length];
}
export function rankLabel(b) { return b[0] === b[1] ? `#${b[0]}` : `#${b[0]}–#${b[1]}`; }
export function average(rows) {
  if (!rows.length || !rows.every(validBounds)) throw new Error('Every supplied evaluation needs bounds');
  const bounds = [0, 1].map(i => rows.reduce((n, b) => n + b[i], 0) / rows.length);
  return { bounds, score: interval(bounds) ? null : (bounds[0] + bounds[1]) / 2, games: rows.length };
}
export const FLOW = Object.freeze({
  cached: { path: [0, 1, 5], ending: 'ready', exact: false, source: 'archive' },
  score: { path: [0, 1, 2, 3, 4, 5], ending: 'ready', exact: true, source: 'new evaluation' },
  range: { path: [0, 1, 2, 3, 4, 5], ending: 'ready', exact: false, source: 'new evaluation' },
  missing: { path: [0, 1, 2], ending: 'metadata unavailable', source: null },
  unsupported: { path: [0, 1, 2, 3], ending: 'unsupported mode', source: null },
});
export function flowState(key, index) {
  const flow = FLOW[key];
  if (!flow || !Number.isInteger(index) || index < 0 || index >= flow.path.length) throw new Error('Invalid process step');
  return { step: flow.path[index], visited: flow.path.slice(0, index + 1), complete: index === flow.path.length - 1,
    status: index === flow.path.length - 1 ? flow.ending : 'in progress', ...flow };
}
