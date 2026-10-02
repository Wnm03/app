const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('S2261: self-test harness is lazy while preserving the 2.5s auto-run contract', () => {
  const build = read('scripts/build.js');
  const boot = read('modules/shared/boot-early.js');
  const self = read('self-test.js');
  const groupB=(build.match(/const GROUP_B = \[(.*?)\n\];/s)||[])[1]||'';
  assert.ok(!groupB.includes("'self-test.js',"));
  assert.match(boot, /function ensureSelfTest\(\)/);
  assert.match(boot, /_loadScriptOnce\('self-test\.js\?v=/);
  assert.match(boot, /setTimeout\(\(\)=>\{/);
  assert.match(boot, /autoRunSelfTestIfNeeded\(\)/);
  assert.match(self, /auto-run dijadwalkan oleh ensureSelfTest/);
  assert.doesNotMatch(self, /setTimeout\(autoRunSelfTestIfNeeded,2500\)/);
});
