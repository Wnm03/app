'use strict';
// tests/s587-cross-module-owner-registry-invariant.test.js — S583 sesi-12:
// Rekomendasi #5 (test invarian lintas modul), sisa dari 5 rekomendasi awal
// yang dicatat "belum dikerjakan" di PATCH-NOTES.md sesi-10a/10b.
//
// Beda dari test yang SUDAH ADA (titipan-reconcile.test.js,
// s585-titipan-reconcile-saveowners-enforce.test.js, dst): test-test itu
// menguji SATU domain per test (Aset saja, atau spy TitipanReconcile tanpa
// logic asli). File ini menguji INVARIAN yang harus tetap benar ketika
// >=3 domain (Aset, Investasi, Akun) menulis lewat titik TULIS ASLI-nya
// masing-masing (Aset.saveOwners()/Investment.setOwners()/AccOwners.save()),
// pakai OwnerRegistry.findOrCreate()/rename() ASLI (bukan mock) + logic
// TitipanReconcile ASLI (bukan spy) sebagai wasit lintas-domain.
//
// Invarian yang diuji:
//   1. Identitas ownerId kanonik SATU untuk 1 nama, dipakai bareng oleh
//      Aset & Investasi (findOrCreate() dedup by nama, lintas domain).
//   2. Setelah nulis lewat ke-3 titik (Aset, Investasi, Akun-tertaut-Aset),
//      TitipanReconcile.checkAll() -- yang membaca D.assets + D.investments
//      + D.debts SEKALIGUS -- tetap ok:true (gabungan 3 domain reconcile
//      sebagai SATU, bukan cuma benar per-domain diuji terpisah).
//   3. checkOwnerIdConsistency() mendeteksi divergensi nama SAMA -> ownerId
//      BEDA walau sumbernya campuran Aset+Investasi (bukan cuma 1 domain).
//   4. checkDebtNameStaleness() mendeteksi staleness snapshot nama di Buku
//      Utang pasca OwnerRegistry.rename(), utk debt yang lahir dari CABANG
//      Investasi (bukan cuma cabang Aset yang sudah dites file lain).
//   5. checkAll() adalah AND murni: gap di ownerIdConsistency SAJA (sync
//      cabang Aset/Investasi tetap ok) tidak "tertelan"/diabaikan oleh
//      sub-check lain -- provable lewat shape return checkAll() lengkap.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { assets: [], investments: [], debts: [], accounts: [], transactions: [], ownerRegistry: [] };
}

function baseGlobals(D, extra) {
  let _n = 0;
  return Object.assign(
    {
      D,
      document: { getElementById: () => null },
      escapeHtml: (s) => String(s),
      uid: () => 'id_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      openModal: () => {},
      closeModal: () => {},
      withSaveGuard: (key, modalId, fn) => fn(),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-13',
    },
    extra || {}
  );
}

// Load semua modul domain SEKALIGUS ke satu sandbox supaya cross-reference
// global (Aset<->OwnerRegistry<->Investment<->MultiOwnerEngine<->
// TitipanReconcile, semua lewat `typeof X!=='undefined'`) benar-benar
// nyambung persis seperti runtime app asli (bukan potong-potong per test).
function loadFullStack(D, extra) {
  return loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/shared/ownership-engine.js',
      'modules/shared/owner-registry.js',
      'modules/asset/aset.js',
      'modules/asset/investasi.js',
      'modules/finance/titipan-reconcile.js',
    ],
    baseGlobals(D, extra),
    ['Aset', 'Investment', 'MultiOwnerEngine', 'OwnerRegistry', 'TitipanReconcile']
  );
}

test('Invarian #1: OwnerRegistry.findOrCreate("Budi") dari jalur Aset.saveOwners() & Investment.setOwners() balik ownerId SAMA (identitas 1, dipakai 2 domain)', () => {
  const D = makeD();
  D.assets = [{ id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'SELF', porsi: 60, isSelf: true }] }];
  D.investments = [{ id: 'h1', kategori: 'saham', harga: 10000000, jumlah: 1, owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }];
  const ctx = loadFullStack(D);
  ctx.Aset.renderList = () => {};

  // Domain 1: Aset -- baris baru non-SELF "Budi" tanpa ownerId -> findOrCreate().
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true },
    { ownerId: '', ownerName: 'Budi', porsi: 40, isSelf: false },
  ];
  ctx.Aset.saveOwners();
  const budiIdFromAset = D.assets[0].owners.find((o) => !o.isSelf).ownerId;

  // Domain 2: Investasi -- nama SAMA "Budi", jalur setOwners() Investment
  // (bukan Aset), findOrCreate() harus dedup ke ownerId yang SAMA.
  const budiIdFromRegistry = ctx.OwnerRegistry.findOrCreate('Budi');

  assert.equal(budiIdFromRegistry, budiIdFromAset, 'findOrCreate("Budi") harus balik ownerId yang sama persis dgn yang sudah dibuat lewat Aset.saveOwners()');
  assert.equal(D.ownerRegistry.filter((o) => o.name === 'Budi').length, 1, 'registry tidak boleh punya 2 entri "Budi" terpisah cuma karena disentuh dari 2 domain berbeda');
});

test('Invarian #2: setelah Aset + Investasi + Akun-tertaut-Aset menulis owners non-SELF, TitipanReconcile.checkAll() gabungan 3 domain tetap ok:true', () => {
  const D = makeD();
  D.assets = [
    { id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'SELF', porsi: 60, isSelf: true }, { ownerId: 'owner_budi', ownerName: 'Budi', porsi: 40, isSelf: false }] },
    { id: 'a2', name: 'Rumah', nilai: 50000000, accountId: 'acc1', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] },
  ];
  D.investments = [{ id: 'h1', kategori: 'saham', harga: 20000000, jumlah: 1, owners: [{ ownerId: 'SELF', porsi: 70, isSelf: true }, { ownerId: 'owner_budi', ownerName: 'Budi', porsi: 30, isSelf: false }] }];
  D.accounts = [{ id: 'acc1', name: 'Rekening Rumah', includeInBalance: true, balance: 50000000, baseBalance: 50000000 }];
  D.ownerRegistry = [{ id: 'owner_budi', name: 'Budi' }];
  const ctx = loadFullStack(D);
  ctx.Aset.renderList = () => {};

  // Sync manual sekali lewat jalur ASLI tiap domain (bukan hand-craft D.debts)
  // supaya D.debts benar-benar lahir dari _syncOwnerDebts()/_syncTitipanDebt().
  ctx.Aset._syncOwnerDebts(D.assets[0]);
  ctx.Investment._syncTitipanDebt(D.investments[0]);

  const r = ctx.TitipanReconcile.checkAll();
  assert.equal(r.ok, true, 'checkAll() gabungan Aset+Investasi harus ok:true: ' + JSON.stringify(r));
  assert.equal(r.sync.ok, true);
  assert.equal(r.ownerIdConsistency.ok, true);
  assert.equal(r.debtNameStaleness.ok, true);
  // 2 debt titipan lahir (1 dari Aset, 1 dari Investasi), nama & linkedOwnerId
  // konsisten dgn nama Budi di kedua domain sumber -- bukti gabungan nyata,
  // bukan cuma dua checkAll() terpisah yang kebetulan sama-sama ok.
  const budiDebts = D.debts.filter((d) => d.linkedOwnerId === 'owner_budi');
  assert.equal(budiDebts.length, 2, 'harus ada 2 entri Buku Utang Budi, 1 dari Aset & 1 dari Investasi');
});

test('Invarian #3: checkOwnerIdConsistency() mendeteksi "Budi" dgn ownerId BEDA walau sumbernya campuran Aset + Investasi (bukan cuma 1 domain)', () => {
  const D = makeD();
  // "Budi" di Aset pakai ownerId lama (pra-migrasi registry), "Budi" di
  // Investasi pakai ownerId lain -- skenario S444/migrateOwnersToRegistry()
  // asli yang jadi alasan checkOwnerIdConsistency() dibuat sesi-4.
  D.assets = [{ id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'SELF', porsi: 60, isSelf: true }, { ownerId: 'legacy_budi_1', ownerName: 'Budi', porsi: 40, isSelf: false }] }];
  D.investments = [{ id: 'h1', kategori: 'saham', harga: 10000000, jumlah: 1, owners: [{ ownerId: 'legacy_budi_2', ownerName: 'Budi', porsi: 30, isSelf: false }, { ownerId: 'SELF', porsi: 70, isSelf: true }] }];
  const ctx = loadFullStack(D);

  const r = ctx.TitipanReconcile.checkOwnerIdConsistency();
  assert.equal(r.ok, false);
  assert.equal(r.divergent.length, 1);
  assert.equal(r.divergent[0].name, 'Budi');
  assert.deepEqual(new Set(r.divergent[0].ids), new Set(['legacy_budi_1', 'legacy_budi_2']));

  // checkAll() harus meneruskan gap ini (bukan ditelan diam-diam).
  const all = ctx.TitipanReconcile.checkAll();
  assert.equal(all.ok, false);
  assert.equal(all.ownerIdConsistency.ok, false);
});

test('Invarian #4: checkDebtNameStaleness() mendeteksi staleness dari debt CABANG INVESTASI (bukan cuma cabang Aset), saat registry berubah di luar jalur rename()', () => {
  const D = makeD();
  D.investments = [{ id: 'h1', kategori: 'saham', harga: 10000000, jumlah: 1, owners: [{ ownerId: 'owner_budi', ownerName: 'Budi', porsi: 40, isSelf: false }, { ownerId: 'SELF', porsi: 60, isSelf: true }] }];
  D.ownerRegistry = [{ id: 'owner_budi', name: 'Budi' }];
  const ctx = loadFullStack(D);

  ctx.Investment._syncTitipanDebt(D.investments[0]);
  const debtBefore = D.debts.find((d) => d.linkedOwnerId === 'owner_budi');
  assert.ok(debtBefore, 'debt titipan cabang Investasi harus tersinkron dulu');
  assert.equal(debtBefore.name.includes('Budi'), true);

  // rename() ASLI (sejak fix sesi-5, lihat komentar rename() di
  // owner-registry.js) SUDAH ikut propagasi ke D.debts[].name -- jadi
  // dipakai `rename()` langsung TIDAK akan menghasilkan staleness lagi.
  // Skenario staleness yang MASIH mungkin (persis yang checkDebtNameStaleness()
  // didesain tangkap): entri registry berubah lewat jalur LAIN yang bukan
  // rename() -- mis. migrasi data lama/import yang menulis D.ownerRegistry
  // langsung. Simulasikan itu di sini (mutasi registry TANPA lewat rename()),
  // supaya tetap murni "baca data", 0 duplikasi logic rename().
  const entry = D.ownerRegistry.find((o) => o.id === 'owner_budi');
  entry.name = 'Budi Santoso';

  const r = ctx.TitipanReconcile.checkDebtNameStaleness();
  assert.equal(r.ok, false, 'staleness harus terdeteksi walau debt-nya lahir dari cabang Investasi, bukan Aset');
  assert.equal(r.stale.length, 1);
  assert.equal(r.stale[0].registryName, 'Budi Santoso');
  assert.equal(r.stale[0].debtName.includes('Budi Santoso'), false);
});

test('Invarian #5: checkAll() = AND murni -- gap ownerIdConsistency SAJA (sync & debtNameStaleness tetap ok) tidak menular/hilang di sub-check lain', () => {
  const D = makeD();
  D.assets = [{ id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'legacy_budi_1', ownerName: 'Budi', porsi: 40, isSelf: false }, { ownerId: 'SELF', porsi: 60, isSelf: true }] }];
  D.investments = [{ id: 'h1', kategori: 'saham', harga: 10000000, jumlah: 1, owners: [{ ownerId: 'legacy_budi_2', ownerName: 'Budi', porsi: 30, isSelf: false }, { ownerId: 'SELF', porsi: 70, isSelf: true }] }];
  D.ownerRegistry = [];
  const ctx = loadFullStack(D);

  ctx.Aset._syncOwnerDebts(D.assets[0]);
  ctx.Investment._syncTitipanDebt(D.investments[0]);

  const r = ctx.TitipanReconcile.checkAll();
  assert.equal(r.sync.ok, true, 'sync harus tetap ok -- kedua debt titipan tersinkron benar, gap-nya murni identitas nama, bukan nilai/kelengkapan');
  assert.equal(r.debtNameStaleness.ok, true, 'debtNameStaleness ok -- linkedOwnerId 2 owner ini belum ada di D.ownerRegistry sama sekali, jadi di luar scope check itu (dilewati by design)');
  assert.equal(r.ownerIdConsistency.ok, false, 'ownerIdConsistency HARUS gagal -- ini satu-satunya sub-check yang relevan utk skenario ini');
  assert.equal(r.ok, false, 'checkAll().ok harus false walau 2 dari 3 sub-check ok -- AND murni, 1 gagal cukup');
});
