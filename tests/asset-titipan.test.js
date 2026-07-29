'use strict';
// tests/asset-titipan.test.js — cakupan fitur Dana Titipan (permintaan user):
// 1 instrumen investasi di Buku Aset (modules/asset/aset.js) bisa campuran dana
// sendiri & dana titipan investor/keluarga dalam SATU aset yang sama (beda dari
// Kepemilikan/OwnershipEngine yang all-or-nothing per aset).
//
// Target: Aset._syncTitipanDebt(a) — pola REUSE PERSIS dari
// Investment._syncTitipanDebt() (modules/asset/investasi.js, sudah ada lebih
// dulu tapi tidak pernah dipakai UI manapun): porsi titipan (a.titipanAmount)
// otomatis disinkron sbg 1 entry Buku Utang (D.debts) supaya Kekayaan Bersih =
// Nilai Aset − Utang Titipan, TANPA mengubah a.nilai (nilai instrumen tetap
// dicatat penuh & transparan).
//
// RULE yang dites di sini:
//   - titipanAmount > 0 & belum ada debtLinkId -> bikin 1 entry utang baru,
//     titipanDebtLinkId ke-set ke id utang itu.
//   - titipanAmount diubah (masih > 0) & sudah ada debtLinkId -> entry utang
//     lama di-UPDATE (nilai/nama/catatan), bukan bikin entry baru/duplikat.
//   - titipanAmount jadi 0 (toggle dimatikan) & ada debtLinkId lama -> entry
//     utang lama DIHAPUS, titipanDebtLinkId di-reset ke null.
//   - a null/undefined, atau D.debts tidak ada -> no-op, tidak error.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { assets: [], debts: [] };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s), uid: () => 'debt_' + (makeCtx._n = (makeCtx._n || 0) + 1), todayStr: () => '2026-07-25' },
    ['OwnershipEngine', 'Aset']
  );
}

test('_syncTitipanDebt() — titipanAmount 0 (default) -> tidak bikin utang apa pun', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 0 };
  D.assets.push(a);
  Aset._syncTitipanDebt(a);
  assert.equal(D.debts.length, 0);
  assert.equal(a.titipanDebtLinkId, undefined);
});

test('_syncTitipanDebt() — titipanAmount > 0 -> bikin 1 entry utang baru sebesar nominal titipan', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi' };
  D.assets.push(a);
  Aset._syncTitipanDebt(a);
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].nilai, 4000000);
  assert.match(D.debts[0].name, /Pak Budi/);
  assert.match(D.debts[0].name, /Investor/);
  assert.match(D.debts[0].catatan, /Reksadana Campuran/);
  assert.equal(a.titipanDebtLinkId, D.debts[0].id);
  // nilai instrumen (a.nilai) TIDAK berubah -- tetap dicatat penuh
  assert.equal(a.nilai, 10000000);
});

test('_syncTitipanDebt() — tanpa nama pemilik (opsional kosong) -> label pakai jenis sumber dana saja', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a2', name: 'Emas Titipan', nilai: 5000000, titipanAmount: 5000000, titipanOwnerType: 'keluarga', titipanOwnerName: '' };
  D.assets.push(a);
  Aset._syncTitipanDebt(a);
  assert.equal(D.debts[0].name, 'Keluarga');
});

test('_syncTitipanDebt() — dipanggil ulang dgn nominal berubah -> UPDATE entry lama, bukan bikin baru', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi' };
  D.assets.push(a);
  Aset._syncTitipanDebt(a);
  const firstDebtId = a.titipanDebtLinkId;

  a.titipanAmount = 6000000;
  Aset._syncTitipanDebt(a);

  assert.equal(D.debts.length, 1, 'tidak boleh ada entry utang duplikat');
  assert.equal(a.titipanDebtLinkId, firstDebtId, 'debtLinkId tetap sama, cuma nilainya di-update');
  assert.equal(D.debts[0].nilai, 6000000);
});

test('_syncTitipanDebt() — titipanAmount balik ke 0 -> entry utang lama dihapus, debtLinkId direset', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi' };
  D.assets.push(a);
  Aset._syncTitipanDebt(a);
  assert.equal(D.debts.length, 1);

  a.titipanAmount = 0;
  Aset._syncTitipanDebt(a);

  assert.equal(D.debts.length, 0, 'entry utang titipan lama harus ikut terhapus');
  assert.equal(a.titipanDebtLinkId, null);
});

test('_syncTitipanDebt() — entry utang lain (bukan titipan) di D.debts tidak ikut terganggu', () => {
  const D = makeD();
  D.debts.push({ id: 'debt_manual', name: 'Bank ABC', nilai: 20000000, bunga: 1.5, cicilanBulanan: 0, tanggal: '2026-01-01', jatuhTempo: '', catatan: '', lunas: false });
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Saham Campuran', nilai: 8000000, titipanAmount: 3000000, titipanOwnerType: 'lainnya', titipanOwnerName: '' };
  D.assets.push(a);
  Aset._syncTitipanDebt(a);

  assert.equal(D.debts.length, 2);
  const manualDebt = D.debts.find((d) => d.id === 'debt_manual');
  assert.ok(manualDebt, 'utang manual lama tetap ada');
  assert.equal(manualDebt.nilai, 20000000, 'utang manual lama tidak ikut berubah');
});

test('_syncTitipanDebt() — guard: a null/undefined atau D.debts tidak ada -> no-op, tidak error', () => {
  const D = { assets: [] }; // D.debts sengaja tidak ada
  const { Aset } = makeCtx(D);
  assert.doesNotThrow(() => Aset._syncTitipanDebt(null));
  assert.doesNotThrow(() => Aset._syncTitipanDebt(undefined));
  assert.doesNotThrow(() => Aset._syncTitipanDebt({ id: 'a1', name: 'X', nilai: 1000, titipanAmount: 500 }));
});
