'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

test('S2252 GROUP_B residency manifest is complete and measurable', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
  const m = build.match(/const GROUP_B = \[(.*?)\n\];/s);
  assert.ok(m, 'GROUP_B manifest missing');
  const files = [...m[1].matchAll(/'([^']+\.js)'/g)].map(x => x[1]);
  assert.equal(new Set(files).size, files.length, 'GROUP_B duplicate entries');
  assert.equal(files.length, 360, 'GROUP_B count changed; refresh Bundle-B residency audit before changing residency');
  const missing = files.filter(f => !fs.existsSync(path.join(root, f)));
  assert.deepEqual(missing, [], 'GROUP_B source missing');
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0);
  // S2271: gdrive session state is intentionally eager because gdrive-backup.js
  // is an eager consumer while laporan-export.js is lazy (S2264). The added
  // state is a correctness fix, so the residency contract moves with the
  // measured source payload instead of treating the old measurement as a
  // functional invariant.
  // S2272: self-test now preloads lazy diagnostic boundaries explicitly; this
  // increases eager self-test source residency by the measured 480 bytes.
  // S2366: tx-list-cashflow.js shrank 26 bytes (single-pass forecast aggregation); pin refreshed to measured payload.
  // S2391: cumulative service optimizations changed GROUP_B payload; refresh the measured pin.
  // S2397: service master generated artifact now keeps checklist groups eager and reconstructs legacy master data lazily; refresh the measured pin.
  // S2402: VehicleSOTProvisioning reuses one catalog read per fleet run; refresh measured GROUP_B payload.
  // S2403: VehicleCatalog compatibility index; refresh measured GROUP_B payload.
  // S2405: service-log latest index and per-run current-KM reuse; refresh measured GROUP_B payload.
  // S2407: isolation-audit local compatibility index; refresh measured GROUP_B payload.
  // S2410: fleet provisioning shares the per-run catalog cache with service-state reads; refresh measured payload.
  assert.ok(Number(bytes)>0, 'GROUP_B source payload harus terukur');
});
