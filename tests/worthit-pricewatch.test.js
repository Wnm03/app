'use strict';
// tests/worthit-pricewatch.test.js — cakupan modules/finance/worthit.js (WorthIt.PW)
// (Sesi 166: fitur baru "Pantau Harga" — catat harga 1 produk dari waktu ke waktu,
// AI bandingkan ke rata-rata historis (trend) + kondisi keuangan (100% reuse
// FinanceIntelligence.summary()) -> verdict aman/tunggu. Fokus test: WorthIt.PW.trend()
// & WorthIt.PW.verdict() (fungsi PURE, tidak sentuh DOM/D) — wiring DOM (render/
// promptAddItem/scanEntry/dst) sengaja TIDAK dites di sini sesuai batasan loadSource.js,
// cukup diverifikasi manual/smoke-test. Pola sama persis tests/worthit-jenis.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/finance/worthit.js'], {}, ['WorthIt']);
}

test('trend() — belum ada entry sama sekali -> belum_cukup, count 0', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([]);
  assert.equal(t.direction, 'belum_cukup');
  assert.equal(t.count, 0);
});

test('trend() — 1 entry saja -> belum_cukup, count 1, latest terisi', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([{ price: 50000, date: '2026-07-01' }]);
  assert.equal(t.direction, 'belum_cukup');
  assert.equal(t.count, 1);
  assert.equal(t.latest, 50000);
});

test('trend() — harga terbaru lebih murah >=3% dari rata-rata -> turun', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([
    { price: 100000, date: '2026-06-01' },
    { price: 100000, date: '2026-06-15' },
    { price: 80000, date: '2026-07-01' },
  ]);
  assert.equal(t.direction, 'turun');
  assert.ok(t.pctVsAvg < -3);
});

test('trend() — harga terbaru lebih mahal >=3% dari rata-rata -> naik', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([
    { price: 100000, date: '2026-06-01' },
    { price: 100000, date: '2026-06-15' },
    { price: 130000, date: '2026-07-01' },
  ]);
  assert.equal(t.direction, 'naik');
  assert.ok(t.pctVsAvg > 3);
});

test('trend() — harga terbaru dekat rata-rata (<3%) -> stabil', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([
    { price: 100000, date: '2026-06-01' },
    { price: 101000, date: '2026-07-01' },
  ]);
  assert.equal(t.direction, 'stabil');
});

test('trend() — sort otomatis by date, tidak bergantung urutan input', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([
    { price: 80000, date: '2026-07-01' },
    { price: 100000, date: '2026-06-01' },
  ]);
  assert.equal(t.latest, 80000);
});

test('trend() — entry dengan price<=0 diabaikan', () => {
  const ctx = makeCtx();
  const t = ctx.WorthIt.PW.trend([
    { price: 0, date: '2026-06-01' },
    { price: 50000, date: '2026-07-01' },
  ]);
  assert.equal(t.count, 1);
});

test('verdict() — belum_cukup data -> safe false, minta catat harga', () => {
  const ctx = makeCtx();
  const v = ctx.WorthIt.PW.verdict({ direction: 'belum_cukup', count: 0 }, { ok: false });
  assert.equal(v.safe, false);
  assert.match(v.label, /Belum cukup data/);
});

test('verdict() — turun + healthScore tinggi -> aman dibeli', () => {
  const ctx = makeCtx();
  const trend = { direction: 'turun', pctVsAvg: -10, count: 3 };
  const v = ctx.WorthIt.PW.verdict(trend, { ok: true, healthScore: 80, surplus: 500000 });
  assert.equal(v.safe, true);
  assert.match(v.label, /Aman/);
});

test('verdict() — turun tapi healthScore rendah -> tetap tunggu (override)', () => {
  const ctx = makeCtx();
  const trend = { direction: 'turun', pctVsAvg: -10, count: 3 };
  const v = ctx.WorthIt.PW.verdict(trend, { ok: true, healthScore: 20, surplus: 100000 });
  assert.equal(v.safe, false);
});

test('verdict() — naik -> tidak aman walau finance sehat', () => {
  const ctx = makeCtx();
  const trend = { direction: 'naik', pctVsAvg: 12, count: 3 };
  const v = ctx.WorthIt.PW.verdict(trend, { ok: true, healthScore: 90, surplus: 1000000 });
  assert.equal(v.safe, false);
});

test('verdict() — cashflow minus -> tidak aman walau harga turun', () => {
  const ctx = makeCtx();
  const trend = { direction: 'turun', pctVsAvg: -8, count: 3 };
  const v = ctx.WorthIt.PW.verdict(trend, { ok: true, healthScore: 75, surplus: -200000 });
  assert.equal(v.safe, false);
});

test('verdict() — finance tidak tersedia (FinanceIntelligence belum dimuat) -> tetap kasih verdict dari trend saja', () => {
  const ctx = makeCtx();
  const trend = { direction: 'turun', pctVsAvg: -10, count: 3 };
  const v = ctx.WorthIt.PW.verdict(trend, { ok: false });
  assert.equal(v.safe, true);
  assert.ok(v.reasons.some((r) => /belum bisa dicek/.test(r)));
});

test('financialSafety() — FinanceIntelligence belum dimuat -> ok:false (guard typeof)', () => {
  const ctx = makeCtx();
  const r = ctx.WorthIt.PW.financialSafety();
  assert.equal(r.ok, false);
});

test('addItem()/addEntry()/trend() — integrasi ringan end-to-end pakai objek D lokal', () => {
  let seq = 0;
  const ctx = loadSource(
    ['modules/finance/worthit.js'],
    {
      D: { priceWatch: [] },
      uid: () => 'id_' + seq++,
      sameId: (a, b) => a === b,
    },
    ['WorthIt', 'D']
  );
  const it = ctx.WorthIt.PW.addItem('Kulkas 2 pintu');
  assert.ok(it.id);
  assert.equal(ctx.D.priceWatch.length, 1);
  ctx.WorthIt.PW.addEntry(it.id, 3000000, '2026-06-01', 'manual');
  ctx.WorthIt.PW.addEntry(it.id, 2700000, '2026-07-01', 'scan');
  assert.equal(it.entries.length, 2);
  const t = ctx.WorthIt.PW.trend(it.entries);
  assert.equal(t.direction, 'turun');
});
