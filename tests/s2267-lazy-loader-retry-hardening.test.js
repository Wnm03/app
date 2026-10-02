const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const boot = fs.readFileSync(path.join(root, 'modules/shared/boot-early.js'), 'utf8');

test('S2267: diagnostic-case loader clears rejected promise for retry', () => {
  assert.match(boot, /window\.__kwDiagnosticCasesPromise=null; throw err;/);
  assert.match(boot, /window\.__kwDiagnosticCasesPromise=_loadScriptOnce\([^\n]+\)\s*\.then\(\(\)=>_loadScriptOnce/);
});

test('S2267: self-test loader clears rejected promise for retry', () => {
  assert.match(boot, /window\.__kwSelfTestPromise=_loadScriptOnce\('self-test\.js\?v='\+v\)\s*\.catch\(\(err\)=>\{ window\.__kwSelfTestPromise=null; throw err; \}\)/);
});

test('S2267: both lazy diagnostic loaders preserve promise dedup before failure', () => {
  assert.match(boot, /if\(window\.__kwDiagnosticCasesPromise\) return window\.__kwDiagnosticCasesPromise;/);
  assert.match(boot, /if\(window\.__kwSelfTestPromise\) return window\.__kwSelfTestPromise;/);
});
