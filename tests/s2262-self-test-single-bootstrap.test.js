const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('S2262: self-test auto-run has one guarded bootstrap entry point', () => {
  const boot = read('modules/shared/boot-early.js');
  const sources = [
    'modules/shared/features-helpers-global-security.js',
    'modules/finance/features-helpers-global-security.js',
    'modules/asset/features-helpers-global-security.js',
    'modules/shop/features-helpers-global-security.js',
  ].map(read);
  assert.match(boot, /ensureSelfTest\(\)\.then\(\(\)\s*=>\s*\{/);
  assert.match(boot, /typeof autoRunSelfTestIfNeeded===.function./);
  assert.ok(sources.every(source => !/setTimeout\(autoRunSelfTestIfNeeded\s*,/.test(source)),
    'legacy direct timers must not race the lazy-loaded self-test harness');
});
