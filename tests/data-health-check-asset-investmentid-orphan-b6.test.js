'use strict';
// tests/data-health-check-asset-investmentid-orphan-b6.test.js — Sesi B6 (gap sama
// persis cek accountId orphan Aset yang sudah ada), follow-up B1-B5 Aset<->Investasi
// bridge: a.investmentId (B1) bisa jadi ORPHAN kalau holding-nya sudah dihapus dari
// Investasi. Cek murni baca D.assets/D.investments, pola harness sama persis
// tests/data-health-check-catalog-dup-s268.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(assets, investments) {
  return {
    assets, investments,
    accounts: [], vehicles: [], transactions: [], bills: [], bbmLogs: [], piutang: [],
    partsStock: [], debts: [], budgets: [], categories: { income: [], expense: [] },
    cobek: [], lifeBalanceSnapshots: [], products: [], servisLogs: [], wealthSnapshots: [],
    wishlist: [], workDays: [],
  };
}

function run(assets, investments) {
  const D = makeD(assets, investments);
  const ctx = loadSource(
    ['data-health-check.js'],
    {
      D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s),
      // PERUBAHAN SESI B8: pesan warn sekarang menyertakan fmtFull(a.nilai) --
      // lihat komentar update teks di data-health-check.js.
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    },
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: TIDAK warn kalau investmentId kosong', () => {
  const issues = run([{ id: 'a1', name: 'Tanah', nilai: 1 }], []);
  const found = issues.filter((i) => i.title === 'Aset tertaut ke Holding Investasi yang sudah dihapus');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau investmentId valid (holding masih ada)', () => {
  const issues = run(
    [{ id: 'a1', name: 'RDPU X', nilai: 1, investmentId: 'inv1' }],
    [{ id: 'inv1', name: 'RDPU X' }],
  );
  const found = issues.filter((i) => i.title === 'Aset tertaut ke Holding Investasi yang sudah dihapus');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: warn kalau investmentId orphan (holding sudah dihapus)', () => {
  const issues = run(
    [{ id: 'a1', name: 'RDPU X', nilai: 10000000, investmentId: 'inv_ghost' }],
    [],
  );
  const found = issues.filter((i) => i.title === 'Aset tertaut ke Holding Investasi yang sudah dihapus');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /RDPU X/);
  // PERUBAHAN SESI B8: teks sekarang juga menyebut nilai aset yg sementara
  // tidak ikut dihitung di Kekayaan Bersih/Zakat Maal (konsekuensi fix B8).
  assert.match(found[0].detail, /10\.000\.000|10000000/);
  assert.match(found[0].detail, /Kekayaan Bersih/);
});

test('runDataHealthCheck: cek accountId orphan Aset lama tetap jalan (regresi)', () => {
  const issues = run(
    [{ id: 'a1', name: 'Rumah', nilai: 1, accountId: 'acc_ghost' }],
    [],
  );
  const found = issues.filter((i) => i.title === 'Aset dengan akun tautan tidak valid');
  assert.equal(found.length, 1);
});
