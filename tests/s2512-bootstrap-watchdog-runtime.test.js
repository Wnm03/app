const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'app-bootstrap.js'), 'utf8');

function watchdogBlock() {
  const start = src.indexOf("window.__kwBootState='starting';");
  const end = src.indexOf('\n}catch(e){', start);
  assert.ok(start >= 0 && end > start, 'bootstrap watchdog block not found');
  return src.slice(start, end);
}

test('S2512 runtime: bounded watchdog is diagnostic only and settled boot clears the race', async () => {
  assert.match(src,/const __kwBootWatchdog=new Promise/);
  assert.match(src,/setTimeout\(function\(\){reject\(new Error\('Bootstrap aplikasi terlalu lama/);
  assert.match(src,/15000/);
  assert.match(src,/Promise\.race\(\[__kwBootPromise,__kwBootWatchdog\]\)/);
  assert.match(src,/\.catch\(function\(e\)/);
});
