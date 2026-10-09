'use strict';
// S2041.8: the shared withSaveGuard stale-write preflight protects every module that uses it (servis, aset, kasir, etalase, ...),
// so its toast must not say "Finance". Also e2e/*.js must lint as Node (process/__dirname), otherwise release gate lint fails.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const guard = fs.readFileSync(path.join(root, 'modules/shared/features-helpers-global-security.js'), 'utf8');

test('S2041.8: stale-write toast is module-neutral and the block behaviour is unchanged', () => {
  const a = guard.indexOf('function _financeMutationBlockedByStaleState(){');
  const b = guard.indexOf('function _announcePersistenceWrite', a);
  assert.ok(a > 0 && b > a);
  const body = guard.slice(a, b);
  assert.ok(!/Finance/.test(body.match(/const _msg='([^']*)'/)[1]), 'message must not mention Finance');
  assert.ok(/Muat ulang aplikasi sebelum menyimpan perubahan agar data lama/.test(body));
  assert.ok(/_crossTabStateStale/.test(body) && /return true;/.test(body) && /return false;/.test(body));
  // both wrappers still preflight
  assert.strictEqual((guard.match(/if\(_financeMutationBlockedByStaleState\(\)\)return false;/g) || []).length, 2);
});

test('S2041.8: eslint treats e2e/**/*.js as Node commonjs', () => {
  const cfg = fs.readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
  assert.ok(/'e2e\/\*\*\/\*\.js'/.test(cfg));
});
