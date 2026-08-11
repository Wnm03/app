'use strict';
// tests/asset-titipan.test.js — cakupan fitur Dana Titipan (permintaan user):
// 1 instrumen investasi di Buku Aset (modules/asset/aset.js) bisa campuran dana
// sendiri & dana titipan investor/keluarga dalam SATU aset yang sama (beda dari
// Kepemilikan/OwnershipEngine yang all-or-nothing per aset).
//
// Target: Aset._syncOwnerDebts(a) — Sesi B (gantiin Aset._syncTitipanDebt() lama,
// lihat komentar header method di source): dibangun DI ATAS
// MultiOwnerEngine.getOwners() (Sesi 390/406b) supaya 1 entry utang dibuat PER
// OWNER non-SELF (bukan cuma 1 slot titipan tunggal spt versi lama), owner
// non-SELF di sini SEMUANYA masih datang dari sintesis titipanAmount legacy
// (Sesi 406b) krn aset di test ini belum punya field `owners` eksplisit —
// itu kerjaan Sesi C. Debt ditandai `linkedAssetId`/`linkedOwnerId` (bukan
// `a.titipanDebtLinkId` tunggal spt dulu — field itu skrg cuma dipakai jalur
// migrasi 1x, lihat test migrasi di bawah).
//
// RULE yang dites di sini:
//   - titipanAmount > 0 & belum ada debt tertaut -> bikin 1 entry utang baru,
//     ditandai linkedAssetId=a.id & linkedOwnerId='titipan_<tipe>'.
//   - titipanAmount diubah (masih > 0) & sudah ada debt tertaut -> entry utang
//     lama di-UPDATE (nilai/nama/catatan), bukan bikin entry baru/duplikat.
//   - titipanAmount jadi 0 (toggle dimatikan) & ada debt tertaut lama -> entry
//     utang lama DIHAPUS.
//   - a null/undefined, atau D.debts tidak ada -> no-op, tidak error.
//   - migrasi 1x dari field lama a.titipanDebtLinkId (peninggalan
//     _syncTitipanDebt() <=Sesi 406b) -> debt yang sama ditandai
//     linkedAssetId/linkedOwnerId, TIDAK bikin entry duplikat, field lama
//     di-null-kan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { assets: [], debts: [] };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s), uid: () => 'debt_' + (makeCtx._n = (makeCtx._n || 0) + 1), todayStr: () => '2026-07-25' },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset']
  );
}

test('_syncOwnerDebts() — titipanAmount 0 (default) -> tidak bikin utang apa pun', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 0 };
  D.assets.push(a);
  Aset._syncOwnerDebts(a);
  assert.equal(D.debts.length, 0);
});

test('_syncOwnerDebts() — titipanAmount > 0 -> bikin 1 entry utang baru sebesar nominal titipan', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi' };
  D.assets.push(a);
  Aset._syncOwnerDebts(a);
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].nilai, 4000000);
  assert.match(D.debts[0].name, /Pak Budi/);
  assert.match(D.debts[0].name, /Investor/);
  assert.match(D.debts[0].catatan, /Reksadana Campuran/);
  assert.equal(D.debts[0].linkedAssetId, 'a1');
  assert.equal(D.debts[0].linkedOwnerId, 'titipan_investor');
  // nilai instrumen (a.nilai) TIDAK berubah -- tetap dicatat penuh
  assert.equal(a.nilai, 10000000);
});

test('_syncOwnerDebts() — tanpa nama pemilik (opsional kosong) -> label pakai jenis sumber dana saja', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a2', name: 'Emas Titipan', nilai: 5000000, titipanAmount: 5000000, titipanOwnerType: 'keluarga', titipanOwnerName: '' };
  D.assets.push(a);
  Aset._syncOwnerDebts(a);
  assert.equal(D.debts[0].name, 'Keluarga');
});

test('_syncOwnerDebts() — dipanggil ulang dgn nominal berubah -> UPDATE entry lama, bukan bikin baru', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi' };
  D.assets.push(a);
  Aset._syncOwnerDebts(a);
  const firstDebtId = D.debts[0].id;

  a.titipanAmount = 6000000;
  Aset._syncOwnerDebts(a);

  assert.equal(D.debts.length, 1, 'tidak boleh ada entry utang duplikat');
  assert.equal(D.debts[0].id, firstDebtId, 'debt yang sama, cuma nilainya di-update');
  assert.equal(D.debts[0].nilai, 6000000);
});

test('_syncOwnerDebts() — titipanAmount balik ke 0 -> entry utang lama dihapus', () => {
  const D = makeD();
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Campuran', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi' };
  D.assets.push(a);
  Aset._syncOwnerDebts(a);
  assert.equal(D.debts.length, 1);

  a.titipanAmount = 0;
  Aset._syncOwnerDebts(a);

  assert.equal(D.debts.length, 0, 'entry utang titipan lama harus ikut terhapus');
});

test('_syncOwnerDebts() — entry utang lain (bukan titipan, atau titipan aset LAIN) tidak ikut terganggu', () => {
  const D = makeD();
  D.debts.push({ id: 'debt_manual', name: 'Bank ABC', nilai: 20000000, bunga: 1.5, cicilanBulanan: 0, tanggal: '2026-01-01', jatuhTempo: '', catatan: '', lunas: false });
  D.debts.push({ id: 'debt_other_asset', name: 'Investor', nilai: 1000000, bunga: 0, cicilanBulanan: 0, tanggal: '2026-01-01', jatuhTempo: '', catatan: '', lunas: false, linkedAssetId: 'a-lain', linkedOwnerId: 'titipan_investor' });
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Saham Campuran', nilai: 8000000, titipanAmount: 3000000, titipanOwnerType: 'lainnya', titipanOwnerName: '' };
  D.assets.push(a);
  Aset._syncOwnerDebts(a);

  assert.equal(D.debts.length, 3);
  const manualDebt = D.debts.find((d) => d.id === 'debt_manual');
  assert.ok(manualDebt, 'utang manual lama tetap ada');
  assert.equal(manualDebt.nilai, 20000000, 'utang manual lama tidak ikut berubah');
  const otherAssetDebt = D.debts.find((d) => d.id === 'debt_other_asset');
  assert.ok(otherAssetDebt, 'utang titipan aset LAIN tetap ada, tidak ikut kehapus');
  assert.equal(otherAssetDebt.nilai, 1000000);
});

test('_syncOwnerDebts() — guard: a null/undefined atau D.debts tidak ada -> no-op, tidak error', () => {
  const D = { assets: [] }; // D.debts sengaja tidak ada
  const { Aset } = makeCtx(D);
  assert.doesNotThrow(() => Aset._syncOwnerDebts(null));
  assert.doesNotThrow(() => Aset._syncOwnerDebts(undefined));
  assert.doesNotThrow(() => Aset._syncOwnerDebts({ id: 'a1', name: 'X', nilai: 1000, titipanAmount: 500 }));
});

// --- migrasi 1x dari a.titipanDebtLinkId (peninggalan _syncTitipanDebt(), <=Sesi 406b) ---

test('_syncOwnerDebts() — migrasi a.titipanDebtLinkId lama: debt yang sama ditandai linkedAssetId/linkedOwnerId, TIDAK duplikat', () => {
  const D = makeD();
  D.debts.push({ id: 'debt_legacy', name: 'Pak Budi (Investor)', nilai: 4000000, bunga: 0, cicilanBulanan: 0, tanggal: '2026-01-01', jatuhTempo: '', catatan: 'Dana titipan aset: Reksadana Lama', lunas: false });
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Lama', nilai: 10000000, titipanAmount: 4000000, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi', titipanDebtLinkId: 'debt_legacy' };
  D.assets.push(a);

  Aset._syncOwnerDebts(a);

  assert.equal(D.debts.length, 1, 'debt lama diadopsi, bukan dibikin baru');
  assert.equal(D.debts[0].id, 'debt_legacy');
  assert.equal(D.debts[0].linkedAssetId, 'a1');
  assert.equal(D.debts[0].linkedOwnerId, 'titipan_investor');
  assert.equal(a.titipanDebtLinkId, null, 'field lama dipensiunkan setelah migrasi');
});

test('_syncOwnerDebts() — migrasi lalu owner dicabut (titipanAmount jadi 0) -> debt legacy ikut terhapus', () => {
  const D = makeD();
  D.debts.push({ id: 'debt_legacy', name: 'Pak Budi (Investor)', nilai: 4000000, bunga: 0, cicilanBulanan: 0, tanggal: '2026-01-01', jatuhTempo: '', catatan: '', lunas: false });
  const { Aset } = makeCtx(D);
  const a = { id: 'a1', name: 'Reksadana Lama', nilai: 10000000, titipanAmount: 0, titipanOwnerType: 'investor', titipanOwnerName: 'Pak Budi', titipanDebtLinkId: 'debt_legacy' };
  D.assets.push(a);

  Aset._syncOwnerDebts(a);

  assert.equal(D.debts.length, 0);
  assert.equal(a.titipanDebtLinkId, null);
});
