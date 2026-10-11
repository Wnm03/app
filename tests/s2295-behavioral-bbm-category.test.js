'use strict';
// S2295 behavioural regression tests. Unlike the source-text assertions in
// s2295-backdate-legacy-category-regression.test.js, these execute the REAL
// BBM._saveInner (car-notes.js) and _saveTxInner (transaksi-b.js) inside a vm
// sandbox with a minimal DOM stub, and observe toasts / the point at which
// validation lets the save proceed (sentinel thrown by the first post-validation call).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const PASSED = 'S2295_PASSED_VALIDATION';

function baseSandbox() {
  const sb = { console, String, Number, Math, Date, JSON, Array, Object, Promise, Set, Map, RegExp, Error, Symbol, parseFloat, parseInt, isFinite, setTimeout, clearTimeout, Intl };
  sb.globalThis = sb; sb.window = sb;
  sb.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }) };
  sb.localStorage = { getItem: () => null, setItem() {} };
  return sb;
}
function fields(map, sentinelId) {
  return id => {
    if (id === sentinelId) throw new Error(PASSED);
    return id in map ? { value: String(map[id]), checked: true } : null;
  };
}

// ---------- BBM (real BBM._saveInner) ----------
function loadBBM() {
  const sb = baseSandbox();
  const ctx = vm.createContext(sb);
  const src = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');
  for (let i = 0; i < 20; i++) { // stub any not-yet-defined helper globals referenced at load time
    try { vm.runInContext(src + '\n;globalThis.__BBM=BBM;', ctx, { filename: 'car-notes.js' }); return { sb, BBM: ctx.__BBM }; }
    catch (e) { const m = /^(\w+) is not defined/.exec(e.message); if (!m) throw e; sb[m[1]] = function () { return sb[m[1]]; }; }
  }
  throw new Error('car-notes.js did not load in sandbox');
}
const LOGS = junk => [
  { id: 'l1', vehicleId: 'v1', date: '2026-09-01', km: 12000 },
  { id: 'l2', vehicleId: 'v1', date: '2026-10-01', km: 13000 },
  ...(junk ? [
    { id: 'x1', vehicleId: 'v2', date: '2026-09-10', km: 99999 }, // other vehicle: must be ignored
    { id: 'bad', vehicleId: 'v1', date: 'garbage', km: 1 },      // undated: must be ignored
  ] : []),
];
function bbmTry(date, km, editId = null, junk = false) {
  const { sb, BBM } = loadBBM();
  const toasts = [];
  sb.toast = m => toasts.push(String(m));
  sb.D = { bbmLogs: LOGS(junk) };
  sb.curVehicleId = 'v1';
  BBM.editId = editId;
  const f = { bbmKm: km, bbmLiter: 5, bbmCost: 50000, bbmHarga: 10000, bbmSpbu: '', bbmDate: date, bbmFull: 'on' };
  sb.document.getElementById = fields(f, 'bbmNote');
  let passed = false;
  try { BBM._saveInner(); } catch (e) { if (e.message === PASSED) passed = true; else throw e; }
  return { passed, toasts };
}

test('S2295 BBM: valid backdated entry between neighbours is accepted (R1)', () => {
  assert.equal(bbmTry('2026-09-15', 12500).passed, true);
});
test('S2295 BBM: KM equal to a neighbour is accepted', () => {
  assert.equal(bbmTry('2026-09-15', 12000).passed, true);
  assert.equal(bbmTry('2026-09-15', 13000).passed, true);
});
test('S2295 BBM: KM below previous or above next neighbour is rejected', () => {
  const lo = bbmTry('2026-09-15', 11000);
  assert.equal(lo.passed, false); assert.match(lo.toasts.join('|'), /lebih kecil dari catatan BBM sebelumnya \(12\.000/);
  const hi = bbmTry('2026-09-15', 13500);
  assert.equal(hi.passed, false); assert.match(hi.toasts.join('|'), /melebihi catatan BBM setelah tanggal ini \(13\.000/);
});
test('S2295 BBM: before-all and after-all entries respect the single neighbour', () => {
  assert.equal(bbmTry('2026-08-01', 11000).passed, true);
  assert.equal(bbmTry('2026-08-01', 12500).passed, false);
  assert.equal(bbmTry('2026-10-06', 13400).passed, true);
  assert.equal(bbmTry('2026-10-06', 100).passed, false);
});
test('S2295 BBM: future date rejected; other-vehicle and undated logs ignored', () => {
  const r = bbmTry('2099-01-01', 20000);
  assert.equal(r.passed, false); assert.match(r.toasts.join('|'), /masa depan/);
  assert.equal(bbmTry('2026-09-15', 12500, null, true).passed, true); // other-vehicle 99999 km and undated log must not block
  assert.equal(bbmTry('2026-09-15', 11000, null, true).passed, false); // ...but real neighbours still enforced
});
test('S2295 BBM: editing a record excludes itself from neighbour checks', () => {
  assert.equal(bbmTry('2026-09-01', 12900, 'l1').passed, true);
  assert.equal(bbmTry('2026-09-01', 13500, 'l1').passed, false);
});
test('S2295 BBM: non-positive or non-numeric input rejected', () => {
  assert.equal(bbmTry('2026-09-15', 0).passed, false);
  assert.equal(bbmTry('2026-09-15', 'abc').passed, false);
});

// ---------- Transaction category (real _saveTxInner) ----------
function txTry({ cat, editId = null, txs = [], cats = ['Makan', 'Gaji'] }) {
  const sb = baseSandbox();
  const ctx = vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'modules/finance/transaksi-b.js'), 'utf8') + '\n;globalThis.__save=_saveTxInner;', ctx, { filename: 'transaksi-b.js' });
  const toasts = [];
  sb.toast = m => toasts.push(String(m));
  sb.evalAmtExpr = () => {};
  sb.curTxType = 'expense'; sb.txEditId = editId; sb.curPayMethod = 'tunai';
  sb.D = { transactions: txs };
  sb.getCatsByType = () => cats.map(name => ({ name }));
  sb.resolveOwnerDefaultForAccount = () => { throw new Error(PASSED); };
  sb.document.getElementById = fields({ txAmt: 10000, txSubCat: '', txDate: '2026-10-01', txNote: '', txCat: cat, txAcc: 'a1', txAssetId: '', txDeductionOwner: '' }, null);
  return ctx.__save().then(() => ({ passed: false, toasts }), e => { if (e.message === PASSED) return { passed: true, toasts }; throw e; });
}
const LEGACY = [{ id: 't1', type: 'expense', category: 'Kategori Dihapus' }, { id: 't2', type: 'expense', category: 'Makan' }];

test('S2295 category: new transaction with unknown category is rejected', async () => {
  const r = await txTry({ cat: 'Ketik Bebas' });
  assert.equal(r.passed, false); assert.match(r.toasts.join('|'), /Pilih kategori dari daftar/);
});
test('S2295 category: known category passes the guard', async () => {
  assert.equal((await txTry({ cat: 'Makan' })).passed, true);
});
test('S2295 category: legacy (deleted) category stays editable when unchanged (R2)', async () => {
  assert.equal((await txTry({ cat: 'Kategori Dihapus', editId: 't1', txs: LEGACY })).passed, true);
  assert.equal((await txTry({ cat: 'Kategori Dihapus ', editId: 't1', txs: LEGACY })).passed, true); // trailing space
});
test('S2295 category: changing a legacy transaction to another unknown category is rejected', async () => {
  const r = await txTry({ cat: 'Ketik Bebas', editId: 't1', txs: LEGACY });
  assert.equal(r.passed, false);
});
test('S2295 category: a deleted category name cannot be reused on a NEW transaction or on a different transaction', async () => {
  assert.equal((await txTry({ cat: 'Kategori Dihapus', txs: LEGACY })).passed, false);
  assert.equal((await txTry({ cat: 'Kategori Dihapus', editId: 't2', txs: LEGACY })).passed, false);
});
