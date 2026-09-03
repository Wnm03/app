'use strict';
// tests/cash-projection-piutang-jatuh-tempo.test.js — Sesi audit-kartu-proyeksi-kas-insight
// (medium win: "Piutang jatuh tempo bulan ini sbg info skenario optimis"). Cakupan:
// `piutangJatuhTempoBulanIni` (modules/finance/cash-projection.js) — SENGAJA field info
// TERPISAH, TIDAK ikut ke proyeksiKas/proyeksiSaldoAkhirBulan (piutang tidak menjamin
// cair tepat waktu, beda dari gaji/kewajiban yang relatif pasti).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    debts: [],
    piutang: [],
    profile: {},
  }, overrides);
}

function makeCtx(D) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D }
  );
}

function piutang(overrides) {
  return Object.assign({
    id: 'p1',
    name: 'Piutang test',
    nilai: 200000,
    tanggal: '2026-07-01',
    jatuhTempo: '2026-07-20',
    lunas: false,
  }, overrides);
}

test('getMonthlyCashProjection() — piutang jatuh tempo bulan target dijumlah ke piutangJatuhTempoBulanIni', () => {
  const D = makeD({ piutang: [piutang()] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {}); // Juli 2026 (0-indexed month 6)
  assert.equal(r.piutangJatuhTempoBulanIni, 200000);
});

test('getMonthlyCashProjection() — piutang jatuh tempo BULAN LAIN tidak ikut kehitung', () => {
  const D = makeD({ piutang: [piutang({ jatuhTempo: '2026-08-05' })] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.piutangJatuhTempoBulanIni, 0);
});

test('getMonthlyCashProjection() — piutang yang SUDAH lunas tidak ikut kehitung walau jatuhTempo bulan ini', () => {
  const D = makeD({ piutang: [piutang({ lunas: true })] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.piutangJatuhTempoBulanIni, 0);
});

test('getMonthlyCashProjection() — piutang TANPA jatuhTempo (kosong) tidak ikut kehitung (0 asumsi tanggal)', () => {
  const D = makeD({ piutang: [piutang({ jatuhTempo: '' })] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.piutangJatuhTempoBulanIni, 0);
});

test('getMonthlyCashProjection() — piutangJatuhTempoBulanIni SENGAJA TIDAK masuk proyeksiKas (info terpisah, skenario optimis)', () => {
  const D = makeD({
    piutang: [piutang({ nilai: 300000 })],
    bills: [{ id: 'b1', kind: 'tagihan', freq: 'bulanan', amount: 900000, nextDue: '2026-07-05' }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.piutangJatuhTempoBulanIni, 300000);
  // proyeksiKas = proyeksiGaji(0) - sisaKewajiban(900rb) - kiriman(0), TIDAK dikurangi/
  // ditambah piutang sama sekali.
  assert.equal(r.proyeksiKas, -900000);
});

test('getMonthlyCashProjection() — beberapa piutang jatuh tempo bulan ini dijumlah semua', () => {
  const D = makeD({
    piutang: [
      piutang({ id: 'p1', nilai: 200000, jatuhTempo: '2026-07-05' }),
      piutang({ id: 'p2', nilai: 150000, jatuhTempo: '2026-07-28' }),
      piutang({ id: 'p3', nilai: 999999, jatuhTempo: '2026-06-30' }), // bulan lain, exclude
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.piutangJatuhTempoBulanIni, 350000);
});

test('getMonthlyCashProjection() — 0 crash kalau D.piutang tidak ada sama sekali (backward-compat)', () => {
  const D = makeD();
  delete D.piutang;
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.getMonthlyCashProjection(6, 2026, {}));
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.piutangJatuhTempoBulanIni, 0);
});
