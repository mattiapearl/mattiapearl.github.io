import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULTS, explain } from '../walkthrough.mjs';
import { REFERENCE, ratios, component, playground } from '../math.mjs';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('worked example traces raw counters through the unchanged teaching math', () => {
  const x = explain();
  close(x.health, 11.5);
  close(x.share, 6000 / (18000 + REFERENCE.tau));
  close(x.objectiveUnits, x.share * 3);
  close(x.farmRate, 2700);
  const work = ratios({physical:11.5*180/1200,participation:12*180/1200,objective:[x.share*3*180/1200],economy:2700});
  const expected = playground(work, [true,true,true,false,false,false], [true,false,false,false,false,false], true, 1, 1200);
  x.parts.forEach((n,i) => close(n, expected.parts[i].gross));
  close(x.score, expected.score);
  close(x.score, 52.85052984060177);
  close(x.gross - x.deduction, x.score);
});

test('each visible input changes its own work component, not hidden extra bonuses', () => {
  const baseline = explain();
  for (const [field,index] of [['damage',0],['healing',0],['barriers',0],['takedowns',0],['boss',1],['gold',2]]) {
    const raised = explain({...DEFAULTS,[field]:DEFAULTS[field]+100});
    assert.ok(raised.parts[index] > baseline.parts[index]);
    raised.parts.forEach((n,i) => { if (i !== index) close(n,baseline.parts[i]); });
    close(raised.p,baseline.p);
  }
  close(explain({...DEFAULTS,healing:3000}).parts[0],explain({...DEFAULTS,barriers:4000}).parts[0]);
});

test('zero work stays zero and no enemy gain means no deduction', () => {
  const zero = explain({...DEFAULTS,damage:0,healing:0,barriers:0,takedowns:0,boss:0,gold:0});
  assert.deepEqual(zero.parts,[0,0,0]);
  assert.equal(zero.score,0);
  const noGain = explain({...DEFAULTS,gain:false});
  assert.equal(noGain.p,1); assert.equal(noGain.deduction,0); close(noGain.score,noGain.gross);
  assert.throws(()=>explain({...DEFAULTS,boss:18001}));
  assert.throws(()=>explain({...DEFAULTS,gold:-1}));
  [0,1,2,4].forEach((r,i)=>close(component(r,40),[0,20,80/3,32][i]));
});

test('home prioritizes visual calculation, with research only a secondary link', async () => {
  const html = await readFile(new URL('../index.html',import.meta.url),'utf8');
  const app = await readFile(new URL('../walkthrough.mjs',import.meta.url),'utf8');
  assert.equal([...html.matchAll(/role="tab"/g)].length,3);
  assert.equal([...html.matchAll(/class="step(?: points)?"/g)].length,12);
  assert.ok(html.indexOf('id="score"') < html.indexOf('role="tabpanel"'));
  assert.ok(html.indexOf('Research results') > html.indexOf('<footer>'));
  assert.doesNotMatch(html, /18,741|24 variants|Spearman|<table|id="benchmark"/);
  assert.match(html,/INVENTED 20-MINUTE EXAMPLE/);
  assert.match(html,/Missing relevant evidence can produce a range/);
  assert.match(html,/claim-timing proxy, not a pickup timestamp/);
  assert.doesNotMatch(app,/fetch\(|innerHTML|localStorage|https?:\/\//);
  assert.doesNotMatch(html,/deadchaps|statlocker|\bedl\b|(?:src|href)="https?:\/\//i);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for (const key of Object.keys(DEFAULTS)) assert.ok(ids.includes(key));
});
