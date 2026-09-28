import { REFERENCE, component, completionShare, concessionShare, consequence } from './math.mjs';

// A deliberately simple, resolved 20-minute example—not metadata ingestion.
// Constant team median HP, one 180s damage interval containing 3 friendly completions.
export const DEFAULTS = Object.freeze({ damage: 20000, healing: 2000, barriers: 2000, takedowns: 12, boss: 6000, gold: 18000, gain: true });
export function explain(input = DEFAULTS) {
  for (const key of ['damage', 'healing', 'barriers', 'takedowns', 'boss', 'gold']) {
    if (!Number.isFinite(input[key]) || input[key] < 0) throw new Error('Nonnegative recorded work required');
  }
  const health = (input.damage + input.healing + .5 * input.barriers) / 2000;
  const physicalRatio = health * 180 / 1200 / REFERENCE.physical;
  const participationRatio = input.takedowns * 180 / 1200 / REFERENCE.participation;
  const fightRatio = .8 * physicalRatio + .2 * participationRatio;
  const share = completionShare(input.boss, 18000, 180);
  const objectiveRatio = share * 3 * 180 / 1200 / REFERENCE.objective;
  const economyRatio = input.gold * 180 / 1200 / REFERENCE.economy;
  const parts = [component(fightRatio, 40), component(objectiveRatio, 40), component(economyRatio, 20)];
  const gross = parts.reduce((a, b) => a + b, 0);
  const p = consequence(concessionShare(3, 1, true, input.gain), 1200);
  return { health, physicalRatio, participationRatio, ratios: [fightRatio, objectiveRatio, economyRatio], share,
    objectiveUnits: share * 3, farmRate: input.gold * 180 / 1200, parts, gross, p, deduction: gross * (1 - p), score: gross * p };
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const number = n => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fixed = (n, d = 1) => n.toFixed(d);
  function text(id, value) { $(id).textContent = value; }
  function render() {
    const input = Object.fromEntries(Object.keys(DEFAULTS).map(key => [key, key === 'gain' ? $('gain').checked : Number($(key).value)]));
    const result = explain(input);
    for (const key of Object.keys(input).filter(key => key !== 'gain')) text(`${key}-value`, number(input[key]));
    result.parts.forEach((value, i) => {
      text(`part-${i}`, fixed(value)); text(`points-${i}`, fixed(value));
      $(`fill-${i}`).style.width = `${100 * value / [40, 40, 20][i]}%`;
      text(`ratio-${i}`, `${fixed(result.ratios[i], 2)}×`);
      const domain = Math.max(3, result.ratios[i]);
      $(`ratio-bar-${i}`).style.width = `${100 * result.ratios[i] / domain}%`;
      $(`reference-mark-${i}`).style.left = `${100 / domain}%`;
    });
    text('health-count', fixed(result.health));
    text('health-rate', fixed(result.health * 180 / 1200, 2));
    text('physical-ratio', `${fixed(result.physicalRatio, 2)}×`);
    text('participation-ratio', `${fixed(result.participationRatio, 2)}×`);
    text('participation-rate', fixed(input.takedowns * .15, 2));
    text('damage-health', fixed(input.damage / 2000));
    text('support-health', fixed((input.healing + .5 * input.barriers) / 2000));
    text('share-percent', `${fixed(result.share * 100, 1)}%`);
    $('share-fill').style.width = `${result.share * 100}%`;
    text('objective-units', fixed(result.objectiveUnits, 2));
    text('objective-rate', fixed(result.objectiveUnits * .15, 3));
    text('farm-rate', number(result.farmRate)); text('farm-comparison', number(result.farmRate));
    text('gross', fixed(result.gross)); text('deduction', fixed(result.deduction)); text('score', fixed(result.score));
    text('retained', `${fixed(result.p * 100, 2)}% kept`);
    text('deduction-percent', `${fixed(100 * (1 - result.p), 2)}%`);
    text('event-state', input.gain ? 'Enemy capture · you are dead · 3 own dead vs 1 enemy dead' : 'No enemy capture → no deduction');
    $('loss-strip').style.width = `${100 * (1 - result.p)}%`;
    const pieces = $('score-strip').children;
    result.parts.forEach((value, i) => { pieces[i].style.width = `${value * result.p}%`; });
    text('score-announcement', `Example score ${fixed(result.score)} out of 100. Fighting ${fixed(result.parts[0])}, objectives ${fixed(result.parts[1])}, economy ${fixed(result.parts[2])}, minus ${fixed(result.deduction)} points.`);
  }
  function select(key, focus = false) {
    document.querySelectorAll('[role=tab]').forEach(tab => { const active = tab.dataset.part === key; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; if (active && focus) tab.focus(); });
    document.querySelectorAll('[role=tabpanel]').forEach(panel => { panel.hidden = panel.id !== key; });
  }
  document.querySelectorAll('[role=tab]').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => select(tab.dataset.part));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(tabs[next].dataset.part, true); }
    });
  });
  document.querySelectorAll('input').forEach(input => input.addEventListener('input', render));
  $('reset').addEventListener('click', () => { for (const [key, value] of Object.entries(DEFAULTS)) { if (key === 'gain') $(key).checked = value; else $(key).value = value; } render(); });
  $('zero').addEventListener('click', () => { for (const key of Object.keys(DEFAULTS).filter(key => key !== 'gain')) $(key).value = 0; render(); });
  let printState;
  window.addEventListener('beforeprint', () => { printState = [...document.querySelectorAll('[role=tabpanel]')].map(p => p.hidden); document.querySelectorAll('[role=tabpanel]').forEach(p => { p.hidden = false; }); });
  window.addEventListener('afterprint', () => { document.querySelectorAll('[role=tabpanel]').forEach((p, i) => { p.hidden = printState?.[i] ?? p.hidden; }); });
  render(); document.body.dataset.ready = 'true';
}
