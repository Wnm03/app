const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const build = read('scripts/build.js');
const boot = read('modules/shared/boot-early.js');
const self = read('self-test.js');
const dispatch = read('modules/shared/features-helpers-global-security.js');

test('S2254/S2261 diagnostic harness and case modules are lazy-resident', () => {
  const groupB=(build.match(/const GROUP_B = \[(.*?)\n\];/s)||[])[1]||'';
  const lines=new Set(groupB.split(/\r?\n/).map(x=>x.trim()));
  assert.ok(!lines.has("'self-test.js',"));
  assert.ok(!lines.has("'modules/shared/self-test-cases-a.js',"));
  assert.ok(!lines.has("'modules/shared/self-test-cases-b.js',"));
  assert.match(boot, /function ensureSelfTest\(\)/);
  assert.match(boot, /function ensureDiagnosticCases\(\)/);
  assert.match(boot, /self-test-cases-a\.js/);
  assert.match(boot, /self-test-cases-b\.js/);
  assert.match(self, /await ensureDiagnosticCases\(\)/);
  assert.match(dispatch, /runSelfTest: typeof ensureSelfTest/);
  assert.match(dispatch, /copySelfTestResults: typeof ensureSelfTest/);
  assert.ok(lines.has("'modules/ai/ai-service.js',"), 'AIService stays eager because app-init-runtime wires it during boot');
});

