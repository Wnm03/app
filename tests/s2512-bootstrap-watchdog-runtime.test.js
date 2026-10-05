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

test('S2512 runtime: >15s slow boot is diagnostic only, then successful boot clears watchdogs', async () => {
  const timers = [];
  const cleared = [];
  const banners = [];
  let resolveBoot;
  const ctx = {
    window: {},
    Date,
    Promise,
    console: { warn() {}, error() {} },
    setTimeout(fn, ms) { const id = { fn, ms }; timers.push(id); return id; },
    clearTimeout(id) { cleared.push(id); },
    alert(msg) { banners.push(msg); },
    __kwPersistenceRecoveryRequired: false,
    __kwInitRuntime() { return new Promise(resolve => { resolveBoot = resolve; }); },
  };
  const fn = new Function(...Object.keys(ctx), watchdogBlock());
  fn(...Object.values(ctx));

  const soft = timers.find(t => t.ms === 15000);
  const hard = timers.find(t => t.ms === 30000);
  assert.ok(soft && hard, 'both watchdog stages must be installed');

  soft.fn();
  assert.equal(banners.length, 0, '15s threshold must not show a fatal banner');
  assert.equal(ctx.window.__kwBootState, 'starting');

  resolveBoot();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(ctx.window.__kwBootState, 'ready');
  assert.ok(cleared.includes(soft));
  assert.ok(cleared.includes(hard));

  hard.fn();
  assert.equal(banners.length, 0, 'settled boot must not trigger hard timeout');
});
