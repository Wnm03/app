const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'modules/shared/modal-navigasi.js'), 'utf8');
const perf = fs.readFileSync(path.join(root, 'modules/shared/pwa-ux-performance.js'), 'utf8');

test('S2515 navigation: user tap commits page before expensive presenter render', () => {
  const start = nav.indexOf('function showPage(name,el,opts){');
  assert.ok(start >= 0);
  const body = nav.slice(start, nav.indexOf('\n/* moved to modules-render.js: renderPageContent */', start));
  assert.match(body, /const _isUserNav=/);
  assert.match(body, /_kwNavSchedule\(_renderNow\)/);
  assert.ok(body.indexOf('document\.querySelectorAll(\'.page\')'.replace('\\','')) >= 0 || body.includes("document.querySelectorAll('.page')"));
  assert.ok(body.indexOf('_kwNavSchedule(_renderNow)') < body.indexOf('}else{\n  _renderNow();'), 'user navigation must schedule presenter; sync path is fallback only');
});

test('S2515 navigation: stale queued render cannot repaint after a newer tap', () => {
  assert.match(nav, /let _kwNavRenderSeq=0/);
  assert.match(nav, /if\(_navSeq!==_kwNavRenderSeq\)return/);
  assert.match(nav, /const _currentRenderKey=_kwNavRenderKey\(name,pageEl\)/);
  assert.match(nav, /dataset\.kwRenderKey/);
});

test('S2515 storage monitor: no 60-second background polling', () => {
  assert.match(perf, /const PERIOD=300000/);
  assert.doesNotMatch(perf, /setInterval\(check,60000\)/);
  assert.match(perf, /visibilityState==='hidden'/);
  assert.match(perf, /visibilitychange/);
});
