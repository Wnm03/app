'use strict';
// S2750 — log BBM kanonis/karantina untuk estimator & kalibrasi.
// Kontrak utama: D.bbmLogs (dan transaksi keuangan) TIDAK PERNAH diubah; duplikat lintas impor dan
// isi melebihi kapasitas hanya dikecualikan dari perhitungan estimator.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const PROFILE = { tankCapacityLiter: 5.5, fuelBarCount: 9, reserveLiter: 0, tankShape: 'linear' };
function makeCtx(bbmLogs, extra = {}) {
  const D = { vehicles: [{ id: 'v1', name: 'Vario', fuelTankProfile: PROFILE, ...extra }], bbmLogs, kmLogs: [], servisLogs: [], transactions: [] };
  const ctx = loadSource(
    ['modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/fuel-state-estimator.js'],
    { D, document: { getElementById: () => null, querySelectorAll: () => [] }, window: {} },
    ['FuelStorage', 'FuelTankProfile', 'FuelStateEstimator', 'FuelAdaptiveCalibration', 'getFuelCanonicalLogs', 'getFuelFullTankSegments', 'getFuelSuspectSegmentIndexes', 'getFuelDataQuality', 'fuelEfficiency', 'estimateRpPerKm'],
  );
  return { ctx, D };
}
let nextId = 1000;
const log = (date, km, liter, o = {}) => ({ id: o.id || ++nextId, vehicleId: 'v1', date, km, liter, harga: 10000, cost: Math.round(liter * 10000), spbu: 'x', fullTank: o.fullTank !== false, note: o.note || '', txLinkId: o.txLinkId || null });

function series(n, kmStep = 220, liter = 4) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(log(`2026-01-${String(i + 1).padStart(2, '0')}`, 1000 + i * kmStep, liter));
  return rows;
}

test('duplikat lintas batch (ID beda, isi sama) dikarantina dan tidak menggandakan liter', () => {
  const base = series(6);
  const dups = base.map((b, i) => ({ ...b, id: 9000 + i, note: 'Import: batch 2' }));
  const { ctx, D } = makeCtx([...base, ...dups]);
  const c = ctx.getFuelCanonicalLogs('v1');
  assert.equal(c.canonical.length, 6);
  assert.equal(c.quarantined.length, 6);
  assert.ok(c.quarantined.every(q => q.reason === 'duplicate'));
  const clean = makeCtx(series(6).map((b, i) => ({ ...b, id: base[i].id })));
  assert.equal(ctx.fuelEfficiency('v1').kmPerLiter, clean.ctx.fuelEfficiency('v1').kmPerLiter);
  assert.equal(D.bbmLogs.length, 12, 'data asli tidak boleh berubah');
});

test('log bertaut transaksi (txLinkId) dipertahankan sebagai kanonis, bukan salinan impor', () => {
  const a = log('2026-02-01', 2000, 4, { id: 5 });
  const b = { ...a, id: 3, txLinkId: 777 };
  const { ctx } = makeCtx([a, b]);
  const c = ctx.getFuelCanonicalLogs('v1');
  assert.equal(c.canonical.length, 1);
  assert.equal(c.canonical[0].txLinkId, 777);
  assert.equal(c.quarantined[0].duplicateOf, 3);
});

test('isi melebihi kapasitas x1.10 (40 L pada tangki 5,5 L) dikarantina tanpa mengubah log', () => {
  const rows = series(5);
  const bad = log('2026-01-03', 1300, 40);
  rows.splice(3, 0, bad);
  const { ctx, D } = makeCtx(rows);
  const q = ctx.getFuelCanonicalLogs('v1').quarantined;
  assert.equal(q.length, 1);
  assert.equal(q[0].reason, 'over-capacity');
  assert.equal(bad.liter, 40);
  assert.ok(D.bbmLogs.includes(bad));
  assert.ok(ctx.fuelEfficiency('v1').kmPerLiter > 40, 'km/L tidak boleh tertekan oleh 40 L');
});

test('isi tepat di toleransi kapasitas (<=6,05 L) tetap kanonis', () => {
  const rows = series(4); rows.push(log('2026-01-20', 1900, 6.0));
  const { ctx } = makeCtx(rows);
  assert.equal(ctx.getFuelCanonicalLogs('v1').quarantined.length, 0);
});

test('dua pengisian sah berbeda pada hari yang sama tidak dianggap duplikat', () => {
  const { ctx } = makeCtx([log('2026-03-01', 3000, 3, { fullTank: false }), log('2026-03-01', 3100, 3, { fullTank: false })]);
  assert.equal(ctx.getFuelCanonicalLogs('v1').quarantined.length, 0);
});

test('segmen 94-100 km/L ditandai suspect dan dikeluarkan dari sampel kalibrasi, total km/L tidak berubah', () => {
  const rows = [];
  let km = 1000; rows.push(log('2026-01-01', km, 4));
  const kms = [220, 220, 220, 380, 400, 220, 220, 220];
  kms.forEach((s, i) => { km += s; rows.push(log(`2026-02-${String(i + 1).padStart(2, '0')}`, km, 4)); });
  const { ctx } = makeCtx(rows);
  const segs = ctx.getFuelFullTankSegments('v1');
  assert.equal(ctx.getFuelSuspectSegmentIndexes(segs).size, 2);
  assert.ok(segs.every(s => !('suspect' in s)), 'bentuk segmen tidak berubah');
  const totalKm = segs.reduce((s, x) => s + x.km, 0), totalL = segs.reduce((s, x) => s + x.liter, 0);
  assert.ok(Math.abs(ctx.fuelEfficiency('v1').kmPerLiter - totalKm / totalL) < 1e-9);
  const sample = ctx.FuelAdaptiveCalibration._sampleSegments('v1');
  assert.ok(sample.every(x => x.kmPerLiter < 80));
});

test('kalibrasi tidak lagi diblokir oleh duplikat/over-kapasitas, tetapi tetap diblokir oleh ID ganda', () => {
  const base = series(8);
  const dups = base.map((b, i) => ({ ...b, id: 9000 + i }));
  const bad = log('2026-01-04', 1660, 40);
  const { ctx, D } = makeCtx([...base, ...dups, bad]);
  const trigger = base[base.length - 1];
  const r = ctx.FuelAdaptiveCalibration.calibrate('v1', trigger);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(D.vehicles[0].fuelEfficiencyCalibration);
  // ID ganda sungguhan tetap memblokir (tidak dapat dikarantina dgn aman).
  const same = makeCtx([...base, { ...base[0] }]);
  const r2 = same.ctx.FuelAdaptiveCalibration.calibrate('v1', base[base.length - 1]);
  assert.equal(r2.held, true);
  assert.deepEqual(Array.from(r2.flags), ['duplicate-id']);
});

test('pengisian parsial ganda tidak menggandakan addedLiter estimator', () => {
  const rows = series(5);
  const p = log('2026-02-01', 1950, 2, { fullTank: false });
  rows.push(p, { ...p, id: 8888 });
  const { ctx, D } = makeCtx(rows);
  D.vehicles[0].fuelState = { currentFuelBar: 9, currentFuelLiter: 5.5, correctedAt: '2026-01-05T00:00:00Z', estimatedSource: 'auto-bbm-log-full', confidenceScore: 90, referenceKm: 1880 };
  const parts = ctx.FuelStateEstimator._partialFillsSince('v1', 1880);
  assert.equal(parts.length, 1);
});

test('getFuelDataQuality melaporkan karantina dan calibrationBlockers kosong utk data bersih setelah penyaringan', () => {
  const base = series(6);
  const { ctx } = makeCtx([...base, ...base.map((b, i) => ({ ...b, id: 9000 + i }))]);
  const q = ctx.getFuelDataQuality('v1');
  assert.equal(q.quarantinedDuplicateCount, 6);
  assert.equal(q.canonicalLogCount, 6);
  assert.equal(q.calibrationBlockers.length, 0);
  assert.ok(q.flags.includes('possible-duplicate'), 'peringatan informatif tetap ada');
});

test('ekspor/pemulihan (JSON round-trip) menghasilkan hasil kanonis & km/L identik; impor ulang batch sama tidak mengubah km/L', () => {
  const base = series(7);
  const first = makeCtx([...base]);
  const kpl1 = first.ctx.fuelEfficiency('v1').kmPerLiter;
  const restored = makeCtx(JSON.parse(JSON.stringify([...base, ...base.map((b, i) => ({ ...b, id: 7000 + i, note: 'Import ulang' }))])));
  assert.equal(restored.ctx.fuelEfficiency('v1').kmPerLiter, kpl1);
  assert.equal(restored.ctx.getFuelCanonicalLogs('v1').canonical.length, 7);
});

test('S2752: log over-capacity membawa saran pergeseran desimal (40 -> 4,0 L) tanpa mengubah log', () => {
  const rows = series(5); const bad = log('2026-01-03', 1300, 40); bad.cost = 400000; rows.push(bad);
  const { ctx } = makeCtx(rows);
  const q = ctx.getFuelCanonicalLogs('v1').quarantined[0];
  assert.deepEqual({ liter: q.suggestion.liter, cost: q.suggestion.cost }, { liter: 4, cost: 40000 });
  assert.equal(bad.liter, 40); assert.equal(bad.cost, 400000);
  const none = makeCtx([...series(5), log('2026-01-03', 1300, 90)]).ctx.getFuelCanonicalLogs('v1').quarantined[0];
  assert.equal(none.suggestion, null, 'tanpa saran bila liter/10 pun tidak masuk akal');
});
