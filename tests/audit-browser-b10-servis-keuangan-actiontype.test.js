'use strict';
// AUDIT-BROWSER B10: servis yang dibuat lewat form Keuangan (tx-servis.js) tidak menyimpan actionType -> reset Pengingat
// hanya menghitung ganti/pasang/overhaul, jadi servis oli dari Keuangan tidak pernah me-reset pengingat. Form Car Notes
// memakai default 'ganti' (servis.js). recordServisLog kini menyimpan actionType; update tidak menimpa nilai yang sudah ada.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function mk() {
  const ctx = {
    console, toast() {}, escapeHtml: (s) => s, todayStr: () => '2026-11-11', window: {}, save() {}, uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    document: { getElementById: () => null },
    D: { partsStock: [], transactions: [], servisLogs: [], sparepartCats: [], vehicles: [{ id: 'v' }] },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['modules/vehicle/stock-command-sot.js', 'modules/finance/finance-tx-sot.js', 'modules/finance/tx-stok-sparepart.js', 'modules/finance/tx-servis.js']
    .forEach((s) => vm.runInContext(R(s), ctx, { filename: s }));
  return ctx;
}
const base = { vehicleId: 'v', date: '2026-11-11', item: 'Oli', km: 1000, cost: 1, note: '', accountId: 'a1', txId: 't1' };

test('B10: log baru dari Keuangan menyimpan actionType yang diberikan', () => {
  const c = mk();
  c.recordServisLog({ ...base, idempotencyKey: 'tx:t1', actionType: 'ganti' });
  assert.strictEqual(c.D.servisLogs[0].actionType, 'ganti');
});

test('B10: tanpa actionType (mis. paket pengingat) -> null seperti sebelumnya', () => {
  const c = mk();
  c.recordServisLog({ ...base, idempotencyKey: 'tx:t1' });
  assert.strictEqual(c.D.servisLogs[0].actionType, null);
});

test('B10: update tidak menimpa actionType yang sudah dipilih dari Car Notes', () => {
  const c = mk();
  const id = c.recordServisLog({ ...base, idempotencyKey: 'tx:t1', actionType: 'periksa' });
  c.recordServisLog({ ...base, existingServisId: id, idempotencyKey: 'tx:t1', actionType: 'ganti', km: 1100 });
  assert.strictEqual(c.D.servisLogs[0].actionType, 'periksa');
});

test('B10: sumber memanggil recordServisLog dengan default ganti hanya utk pembuatan baru tanpa paket', () => {
  assert.match(R('modules/finance/tx-servis.js'), /actionType:\(!existingServisId&&!pkgState\.id\)\?'ganti':null/);
});
