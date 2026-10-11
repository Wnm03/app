const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('BUG-01: settings self-test result renderer tolerates lazy self-test symbol', () => {
  const s = read('modules/shared/modules-render-b.js');
  assert.match(s, /typeof _lastSelfTestData!=='undefined'&&_lastSelfTestData/);
});

test('BUG-02: Dashboard Hub feature tab delegates to the actual Hero owner', () => {
  const s = read('modules/dashboard-hub/dashboard-hub.js');
  assert.match(s, /DashboardHubHero\.renderFeatureGrid\(\)/);
});

test('BUG-03: proactive reminders do not print an undefined bill kind', () => {
  const s = read('modules/vehicle/vehicle-core.js');
  assert.equal((s.match(/b\.kind\|\|'tagihan'/g) || []).length, 2);
});

test('BUG-04: product sale price must be finite and positive', () => {
  const s = read('modules/shop/cobek-etalase.js');
  assert.match(s, /!Number\.isFinite\(hargaJual\)\|\|hargaJual<=0/);
});

test('BUG-05: asset current value must be finite and positive', () => {
  const s = read('modules/asset/aset.js');
  assert.match(s, /!Number\.isFinite\(nilai\)\|\|nilai<=0/);
});

test('BUG-09: restore awaits a guarded lazy init facade and preserves original rollback error', () => {
  const s = read('modules/shared/backup-restore.js');
  assert.match(s, /async function _restoreEnsureInit\(\)/);
  assert.match(s, /await _restoreEnsureInit\(\)/);
  assert.match(s, /error restore asli dipertahankan/);
  assert.doesNotMatch(s, /if\(typeof init!=='function'&&typeof ensureSelfTest==='function'\)await ensureSelfTest\(\);\s*if\(typeof init!=='function'&&typeof ensureSelfTest==='function'\)await ensureSelfTest\(\)/);
});
