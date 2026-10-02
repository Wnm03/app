'use strict';
// S2272 — lazy-boundary consumer hardening.
// Guards the eager Finance -> lazy Vehicle Scanner boundary and the diagnostic
// self-test/modal-sweep preloads so cold-start diagnostics cannot silently skip
// or falsely fail because a lazy global has not been demanded yet.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('S2272 txStockScanPartVia() demand-loads Vehicle Catalog feature before SparepartScanner.scan()', () => {
  const src = read('modules/finance/tx-stok-sparepart.js');
  const start = src.indexOf('async function txStockScanPartVia(adapterName)');
  assert.ok(start >= 0, 'txStockScanPartVia() harus ada');
  const end = src.indexOf('\n// txStockScanPart() —', start);
  const body = src.slice(start, end > start ? end : start + 5000);
  const loadPos = body.indexOf('await ensureVehicleCatalogFeatureScripts()');
  const scannerPos = body.indexOf('SparepartScanner.scan(adapterName)');
  assert.ok(loadPos >= 0, 'consumer stok sparepart wajib demand-load feature scanner');
  assert.ok(scannerPos > loadPos, 'SparepartScanner.scan() harus dijalankan setelah lazy feature selesai dimuat');
});

test('S2272 txStockScanPartVia() calls loader before scanner and remains functional', async () => {
  const order = [];
  const D = { partsStock: [], sparepartCats: [] };
  const ctx = loadSource(
    ['modules/finance/tx-stok-sparepart.js'],
    {
      D,
      codeFromName: () => 'SP',
      toast: () => {},
      save: () => {},
      escapeHtml: (s) => s,
      ensureVehicleCatalogFeatureScripts: async () => { order.push('loader'); },
      SparepartScanner: {
        scan: async () => { order.push('scan'); return null; },
      },
    },
    ['txStockScanPartVia']
  );
  await ctx.txStockScanPartVia('camera');
  assert.deepEqual(order, ['loader', 'scan']);
});

test('S2272 canonical self-test cases do not silently skip Data Health when lazy global is absent', () => {
  const a = read('modules/shared/self-test-cases-a.js');
  const b = read('modules/shared/self-test-cases-b.js');
  assert.doesNotMatch(a, /if\s*\(typeof runDataHealthCheck\s*!==\s*['"]function['"]\)\s*return\s*;/);
  assert.doesNotMatch(b, /if\s*\(typeof runDataHealthCheck\s*!==\s*['"]function['"]\)\s*return\s*;/);
  assert.match(a, /Data Health lazy feature harus sudah dimuat sebelum self-test dijalankan/);
  assert.match(b, /Data Health lazy feature harus sudah dimuat sebelum self-test dijalankan/);
});

test('S2272 self-test preloads diagnostic lazy boundaries before executing cases', () => {
  const src = read('self-test.js');
  const start = src.indexOf('async function computeSelfTestResults()');
  assert.ok(start >= 0);
  const body = src.slice(start, src.indexOf('\nasync function ', start + 20) > 0 ? src.indexOf('\nasync function ', start + 20) : start + 12000);
  for (const name of ['ensureDataHealthScripts', 'ensureVehicleCatalogFeatureScripts', 'ensureLaporanExportScripts']) {
    assert.match(body, new RegExp('await ' + name + '\\(\\)'));
  }
});

test('S2272 modal sweep preloads diagnostic/vehicle lazy boundaries before opener specs', () => {
  const src = read('self-test.js');
  const start = src.indexOf('async function computeModalSweepResults()');
  assert.ok(start >= 0);
  const loop = src.indexOf('const results=[];', start);
  assert.ok(loop > start);
  const pre = src.slice(start, loop);
  for (const name of ['ensureDataHealthScripts', 'ensureVehicleCatalogFeatureScripts', 'ensureLaporanExportScripts']) {
    assert.match(pre, new RegExp('await ' + name + '\\(\\)'));
  }
});
