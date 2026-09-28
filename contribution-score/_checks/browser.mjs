// Dependency-free Chrome acceptance. Synthetic data only, no external page requests.
// node _checks/browser.mjs [https://.../contribution-score/] (default: isolated localhost server)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = await mkdtemp(join(tmpdir(), 'contribution-explainer-browser-'));
const chrome = process.env.CHROME_BIN || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');
let server, browser, cdp;
let stage = 'startup';
const errors = [], requests = [], blocked = [];
const sleep = ms => new Promise(done => setTimeout(done, ms));
async function until(check) {
  for (let i = 0; i < 160; i++) { const result = await check(); if (result) return result; await sleep(50); }
  throw new Error(`Condition timed out: ${stage}`);
}
async function connect(url) {
  const socket = new WebSocket(url), pending = new Map(), listeners = new Map();
  let sequence = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); }
    } else listeners.get(message.method)?.(message.params);
  };
  await new Promise((ok, fail) => { socket.onopen = ok; socket.onerror = fail; });
  return {
    send(method, params = {}) { return new Promise((resolvePromise, reject) => { const id = ++sequence; pending.set(id, { resolve: resolvePromise, reject }); socket.send(JSON.stringify({ id, method, params })); }); },
    on(method, callback) { listeners.set(method, callback); },
    close() { socket.close(); },
  };
}
async function evaluate(expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function settle() { await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); }
async function screenshot(name) {
  await settle();
  const image = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(output, name), Buffer.from(image.data, 'base64'), { flag: 'wx' });
}
async function choose(key) {
  await evaluate(`document.querySelector('[data-case="${key}"]').click()`);
}
try {
  let target = process.argv[2];
  if (!target) {
    const allowed = new Set(['index.html', 'style.css', 'app.mjs', 'math.mjs', 'cases.json']);
    const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' };
    server = createServer(async (req, res) => {
      const path = new URL(req.url, 'http://127.0.0.1').pathname;
      const file = path === '/contribution-score/' ? 'index.html' : path.replace(/^\/contribution-score\//, '');
      if (!path.startsWith('/contribution-score/') || !allowed.has(file)) { res.writeHead(404); res.end(); return; }
      try { res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Cache-Control': 'no-store' }); res.end(await readFile(join(root, file))); }
      catch { res.writeHead(500); res.end(); }
    });
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    target = `http://127.0.0.1:${server.address().port}/contribution-score/`;
  }
  const origin = new URL(target).origin;
  const profile = join(output, 'profile');
  browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  browser.on('error', error => errors.push(error.message));
  await until(() => existsSync(join(profile, 'DevToolsActivePort')));
  const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  cdp = await connect(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  cdp.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  cdp.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') errors.push(entry.text); });
  cdp.on('Fetch.requestPaused', event => {
    requests.push(event.request.url);
    const local = new URL(event.request.url).origin === origin;
    if (!local) blocked.push(event.request.url);
    cdp.send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: event.requestId } : { requestId: event.requestId, errorReason: 'BlockedByClient' }).catch(error => errors.push(String(error)));
  });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Log.enable');
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cdp.send('Page.bringToFront');
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: 'http*' }] });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: target });
  stage = 'page-ready';
  await until(() => evaluate('document.body.dataset.ready === "true"'));
  assert.equal(await evaluate('document.querySelectorAll("#roster li").length'), 12);
  assert.equal(await evaluate('document.getElementById("focus-score").textContent'), '18.5–27.8');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), true);
  await screenshot('desktop-overview.png');

  stage = 'process';
  for (const [key, status, evaluated] of [['cached', 'ready', true], ['score', 'ready', true], ['range', 'ready', true], ['missing', 'metadata unavailable', false], ['unsupported', 'unsupported mode', false]]) {
    const response = await evaluate(`(() => { const select=document.getElementById('scenario');select.value='${key}';select.dispatchEvent(new Event('change'));const next=document.getElementById('next-step');for(let i=0;i<8&&!next.disabled;i++) next.click();return JSON.parse(document.getElementById('flow-json').textContent); })()`);
    assert.equal(response.status, status); assert.equal(response.evaluated, evaluated);
    if (key === 'range' || key === 'cached') { assert.equal(response.score, null); assert.equal(response.point_score_available, false); }
    if (key === 'score') assert.equal(response.point_score_available, true);
  }
  await evaluate("document.getElementById('scenario').value='range';document.getElementById('scenario').dispatchEvent(new Event('change'));for(let i=0;i<5;i++)document.getElementById('next-step').click();document.getElementById('process').scrollIntoView()");
  await screenshot('desktop-process.png');

  stage = 'playground';
  await evaluate("document.getElementById('zero-work').click()");
  assert.equal(await evaluate("document.getElementById('final-score').textContent"), '0.00');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('#final-bar > span')].map(e=>e.style.width)"), ['0%', '0%', '0%']);
  await evaluate("document.getElementById('reset-work').click();document.getElementById('equal-exchange').click()");
  assert.equal(await evaluate("document.getElementById('presence').textContent"), '1.0000');
  await evaluate("document.getElementById('reset-event').click();document.querySelector('#own-team button').click()");
  assert.equal(await evaluate("document.getElementById('presence').textContent"), '1.0000');
  await evaluate("document.getElementById('reset-event').click();document.getElementById('enemy-gain').click()");
  assert.equal(await evaluate("document.getElementById('presence').textContent"), '1.0000');
  await evaluate("document.getElementById('reset-event').click();document.getElementById('fight-r').focus()");
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  assert.equal(await evaluate("document.getElementById('fight-r').value"), '2.05');
  await evaluate("document.getElementById('reset-work').click();document.getElementById('consequence').scrollIntoView()");
  await screenshot('desktop-consequences.png');

  stage = 'evidence';
  for (const [key, score, rank, coverage] of [['known', '27.8', '#7', '12 exact · 0 bounded'], ['duration', '18.5–27.8', '#7–#11', '11 exact · 1 bounded'], ['ordering', '22.2–27.8', '#7–#10', '11 exact · 1 bounded'], ['claimant', '27.7–39.2', '#6–#10', '1 exact · 11 bounded']]) {
    await choose(key);
    assert.equal(await evaluate("document.getElementById('focus-score').textContent"), score);
    assert.equal(await evaluate("document.getElementById('focus-rank').textContent"), rank);
    assert.equal(await evaluate("document.getElementById('coverage-label').textContent"), coverage);
    assert.equal(await evaluate("document.querySelectorAll('#ledger tr').length"), 2);
  }
  await choose('duration');
  await evaluate("document.getElementById('uncertainty').scrollIntoView()");
  await screenshot('desktop-uncertainty.png');

  stage = 'mobile';
  for (const width of [390, 320]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await settle();
    assert.equal(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), true, `overflow at ${width}`);
    await evaluate('window.scrollTo(0,0)');
    await screenshot(`mobile-${width}.png`);
    await evaluate("document.getElementById('uncertainty').scrollIntoView()");
    await screenshot(`mobile-evidence-${width}.png`);
  }
  stage = 'print';
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  const prior = await evaluate("[...document.querySelectorAll('details')].map(d=>d.open)");
  await evaluate("window.dispatchEvent(new Event('beforeprint'))");
  assert.equal(await evaluate("[...document.querySelectorAll('details')].every(d=>d.open)"), true);
  await evaluate("window.dispatchEvent(new Event('afterprint'))");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('details')].map(d=>d.open)"), prior);
  assert.equal(await evaluate('document.body.innerText.toLowerCase().includes("deadchaps")'), false);
  assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
  const result = { status: 'passed', target, process_routes: 5, oracle_scenarios: 4, roster: 12, keyboard_slider: true,
    zero_work: true, one_factor: true, viewport_widths: [1440, 390, 320], horizontal_overflow: false,
    print_disclosures: true, external_requests: blocked, runtime_errors: errors, page_requests: requests, output };
  await writeFile(join(output, 'RESULT.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const overflow = cdp ? await evaluate("[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,15).map(e=>({tag:e.tagName,id:e.id,cls:e.className,right:e.getBoundingClientRect().right}))").catch(() => null) : null;
  if (cdp) await screenshot('failed.png').catch(() => {});
  await writeFile(join(output, 'FAILED.json'), JSON.stringify({ stage, error: String(error), errors, blocked, overflow }, null, 2));
  console.error(JSON.stringify({ status: 'failed', stage, output, error: String(error), errors, overflow }, null, 2));
  process.exitCode = 1;
} finally {
  if (cdp) { await cdp.send('Browser.close').catch(() => {}); cdp.close(); }
  if (browser) browser.kill();
  if (server) await new Promise(ok => server.close(ok));
  await rm(join(output, 'profile'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
