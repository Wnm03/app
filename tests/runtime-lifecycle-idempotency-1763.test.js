const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'modules/shared/app-init-runtime.js'), 'utf8');
const persistence = fs.readFileSync(path.join(ROOT, 'modules/shared/features-helpers-global-security.js'), 'utf8');

test('runtime maintenance: global timer and persistence lifecycle installation are idempotent', () => {
  assert.match(runtime, /let __kwRuntimeMaintenanceTimer=null;/);
  assert.match(runtime, /if\(__kwRuntimeMaintenanceTimer!=null\)return;/);
  assert.equal((runtime.match(/setInterval\(/g) || []).length, 0,
    'maintenance tidak boleh memakai setInterval permanen');
  assert.equal((runtime.match(/setTimeout\(\(\)=>\{/g) || []).length, 1,
    'maintenance scheduler harus punya satu titik pemasangan');
  assert.equal((runtime.match(/addEventListener\(/g) || []).length, 0,
    'bootstrap runtime tidak boleh memasang global lifecycle listener kedua');
  assert.match(runtime, /__kwInstallRuntimeMaintenance\(\);/);
  assert.doesNotMatch(runtime, /__kwInstallRuntimeLifecycle\(\);/);

  assert.match(persistence, /let _lifecycleFlushInstalled=false;/);
  assert.match(persistence, /if\(_lifecycleFlushInstalled\|\|/);
  assert.match(persistence, /document\.addEventListener\('freeze',flush\)/);
  assert.match(persistence, /window\.addEventListener\('pagehide',flush\)/);
  assert.match(persistence, /window\.addEventListener\('beforeunload',flush\)/);
});
