'use strict';
// tests/s515-dana-titipan-owner-nominal-asset-kuota-porsi.test.js — Sesi 515
// (Dana Titipan Owner -> Nominal -> Asset -> Kuota -> Porsi).
//
// READ-BEFORE-WRITE menemukan Owner (OwnerRegistry/listExistingOwners),
// Nominal (saveCommitment), Kuota (allocatedExcluding, S504/S505), dan
// Porsi (MultiOwnerEngine.splitByPorsi/Aset.saveOwners) SUDAH lengkap dari
// sesi-sesi sebelumnya. Satu gap nyata: tidak ada jalur UI dari kartu
// owner Dana Titipan LANGSUNG ke assetOwnersModal utk 1 aset tertentu
// (langkah "Asset"). Sesi ini MURNI menambal gap itu (0 SSOT baru, 0
// rumus baru):
//   - Aset.openOwnersModalById(assetId) (aset.js) -- wrapper tipis,
//     100% delegasi ke Aset.openOwnersModal() existing (S392a).
//   - DanaTitipanPortfolioPresenter._assetOptionsHtml() (presenter) --
//     pure, baca D.assets apa adanya.
//   - DanaTitipanCommitmentUI.openAssetPorsi(i) (presenter) -- baca
//     picker DOM, delegasi ke Aset.openOwnersModalById().
//
// Semua test di bawah menjalankan SOURCE ASLI lewat loadSource (bukan
// re-implementasi logic) -- pola sama tests/s514-*.test.js &
// tests/asset-owners-flow-e2e-392a-to-392e.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- DOM tiruan STATEFUL (pola sama asset-owners-flow-e2e-392a-to-392e.test.js
// & s485d-titipan-commitment-ui.test.js) -- getElementById auto-vivify +
// menyimpan .value/.innerHTML/.textContent antar panggilan, supaya
// "isi <select>, baca .value" beneran nyambung.
function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '',
      placeholder: '', disabled: false, style: {},
      classList: { toggle() {}, contains() { return false; }, add() {}, remove() {} },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// --- Ctx gabungan: OwnershipEngine + MultiOwnerEngine + Investment (dana
// titipan presenter butuh 3 ini persis pola s514) + aset.js (S515, domain
// Asset) + owner-registry.js (S489, domain Owner) + dana-titipan-portfolio-
// presenter.js itu sendiri, SEMUA dalam SATU sandbox vm bersama (D yang
// sama dibaca/ditulis lintas file, persis app asli).
function makeCtx(D, dom) {
  let _n = 0;
  const openModalCalls = [];
  const toastMessages = [];
  const ctx = loadSource(
    [
      'modules/shared/owner-registry.js',
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/aset-owners.js', 'modules/asset/aset.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      document: dom,
      escapeHtml,
      openModal: (id) => { openModalCalls.push(id); },
      closeModal: () => {},
      uid: () => 'u' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      todayStr: () => '2026-08-09',
      parsePzNum: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
      updateAmtPreview: () => {},
    },
    ['Aset', 'OwnerRegistry', 'OwnershipEngine', 'MultiOwnerEngine', 'Investment', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanCommitmentUI'],
  );
  ctx.Aset.renderList = () => {};
  ctx.openModalCalls = openModalCalls;
  ctx.toastMessages = toastMessages;
  return ctx;
}

function baseD() {
  return {
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], ownerRegistry: [],
  };
}

// ============================================================
// LANGKAH 1 — OWNER: OwnerRegistry.findOrCreate() dipakai Aset.saveOwners()
// (existing, TIDAK diubah sesi ini) -- ownerId dipastikan konsisten &
// TIDAK duplikat kalau nama sama dipakai ulang.
// ============================================================

test('1. OWNER: ownerId dari OwnerRegistry.findOrCreate() konsisten (dipanggil 2x nama sama -> id sama, TIDAK duplikat)', () => {
  const D = baseD();
  const ctx = makeCtx(D, makeStatefulDom());
  const id1 = ctx.OwnerRegistry.findOrCreate('Budi');
  const id2 = ctx.OwnerRegistry.findOrCreate('Budi');
  assert.equal(id1, id2, 'nama sama harus balik ownerId yang sama, bukan identity baru');
  assert.equal(D.ownerRegistry.length, 1, 'tidak boleh ada duplikat entri registry utk nama yang sama');
});

// ============================================================
// LANGKAH 2 — NOMINAL: saveCommitment() existing-owner-only, principal
// exact (invariant S513/S514 diverifikasi ULANG di sini scoped ke flow
// penuh S515, BUKAN mengulang S514 -- lihat HARD RULE 8).
// ============================================================

test('2. NOMINAL: saveCommitment() menyimpan principalAmount EXACT 1700000000, existing-owner-only', () => {
  const D = baseD();
  const ctx = makeCtx(D, makeStatefulDom());
  const ownerId = ctx.OwnerRegistry.findOrCreate('Budi');
  // owner baru dari registry HARUS lolos listExistingOwners() (S492, union
  // holding + registry) supaya saveCommitment() menerimanya.
  const known = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.ok(known.some((o) => o.ownerId === ownerId), 'owner dari OwnerRegistry harus muncul di listExistingOwners()');
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Budi', principalAmount: 1700000000 });
  assert.equal(rec.principalAmount, 1700000000);
  assert.equal(D.titipanCommitments[0].principalAmount, 1700000000);
});

test('2b. NOMINAL: saveCommitment() menolak ownerId yang TIDAK dikenal (mencegah identity hantu di luar Owner Registry/holding)', () => {
  const D = baseD();
  const ctx = makeCtx(D, makeStatefulDom());
  assert.throws(() => {
    ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'ownerId_ngarang', principalAmount: 1000000 });
  }, /Owner tidak ditemukan/);
});

// ============================================================
// LANGKAH 3 — ASSET: Aset.openOwnersModalById() (BARU, S515) -- wrapper
// navigasi, 100% delegasi ke Aset.openOwnersModal() existing.
// ============================================================

test('3. ASSET: Aset.openOwnersModalById(assetId) valid -> set Aset.editId, buka assetOwnersModal, draft owners terisi dari MultiOwnerEngine.getOwners()', () => {
  const D = baseD();
  D.assets.push({ id: 'a1', name: 'Ruko Warisan', jenis: 'Ruko', nilai: 500000000, owners: [{ ownerId: 'budi', porsi: 60, ownerName: 'Budi', isSelf: false }, { ownerId: 'SELF', porsi: 40, ownerName: 'Milik Sendiri', isSelf: true }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('a1');
  assert.equal(ctx.Aset.editId, 'a1');
  assert.deepEqual(ctx.openModalCalls, ['assetOwnersModal']);
  assert.equal(ctx.Aset._ownersDraft.length, 2);
  assert.ok(ctx.Aset._ownersDraft.some((o) => o.ownerId === 'budi' && o.porsi === 60));
});

test('3b. ASSET: Aset.openOwnersModalById(assetId) tidak ditemukan -> toast, TIDAK membuka modal, TIDAK mengubah Aset.editId', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = null;
  ctx.Aset.openOwnersModalById('tidak-ada');
  assert.equal(ctx.openModalCalls.length, 0, 'modal tidak boleh terbuka kalau aset tidak ditemukan');
  assert.equal(ctx.Aset.editId, null, 'editId tidak boleh berubah kalau aset tidak ditemukan');
  assert.ok(ctx.toastMessages.some((m) => /tidak ditemukan/.test(m)));
});

test('3c. ASSET: DanaTitipanPortfolioPresenter._assetOptionsHtml() murni baca D.assets, escapeHtml nama aset', () => {
  const D = baseD();
  D.assets.push({ id: 'a1', name: 'Tanah <Kavling> & "Kebun"' });
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.DanaTitipanPortfolioPresenter._assetOptionsHtml();
  assert.match(html, /<option value="">/, 'opsi placeholder kosong harus ada di posisi pertama');
  assert.match(html, /<option value="a1">/);
  assert.doesNotMatch(html, /<Kavling>/, 'nama aset wajib di-escape (mencegah HTML injection)');
  assert.match(html, /&lt;Kavling&gt;/);
});

test('3d. ASSET: DanaTitipanCommitmentUI.openAssetPorsi(i) baca picker DOM lalu delegasi ke Aset.openOwnersModalById() (0 logic porsi baru di presenter)', () => {
  const D = baseD();
  D.assets.push({ id: 'a1', name: 'Ruko', jenis: 'Ruko', nilai: 500000000 });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('titipanAssetPick_0').value = 'a1';
  ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  assert.equal(ctx.Aset.editId, 'a1', 'openAssetPorsi harus benar2 memanggil Aset.openOwnersModalById, bukan cuma toast/no-op');
  assert.deepEqual(ctx.openModalCalls, ['assetOwnersModal']);
});

test('3e. ASSET: DanaTitipanCommitmentUI.openAssetPorsi(i) tanpa pilihan aset -> toast peringatan, TIDAK memanggil Aset sama sekali', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('titipanAssetPick_0').value = '';
  ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  assert.equal(ctx.openModalCalls.length, 0);
  assert.ok(ctx.toastMessages.some((m) => /Pilih aset/.test(m)));
});

// ============================================================
// LANGKAH 4 — KUOTA: allocatedExcluding() (S504, TIDAK disentuh sesi ini)
// dipakai lintas domain Aset -- diverifikasi di sini scoped ke flow S515
// penuh: owner sudah commit principal, sudah punya 1 alokasi aset, kuota
// sisa (principal - allocatedExcluding - draft aset ITU SENDIRI) harus
// konsisten dgn definisi S505 (basis di aset.js, DITEST DI SINI via API
// allocatedExcluding langsung + build(), bukan re-test UI kuota S505).
// ============================================================

test('4. KUOTA: allocatedExcluding(ownerId, {assetId}) mengecualikan aset yang sedang dibuka, tapi tetap menjumlah aset LAIN', () => {
  const D = baseD();
  D.assets.push(
    { id: 'a1', name: 'Ruko A', jenis: 'Ruko', nilai: 400000000, owners: [{ ownerId: 'budi', porsi: 25, ownerName: 'Budi', isSelf: false }, { ownerId: 'SELF', porsi: 75, ownerName: 'Milik Sendiri', isSelf: true }] },
    { id: 'a2', name: 'Tanah B', jenis: 'Tanah', nilai: 200000000, owners: [{ ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false }, { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true }] },
  );
  const ctx = makeCtx(D, makeStatefulDom());
  // a1: budi porsi 25% x 400jt = 100jt. a2: budi porsi 50% x 200jt = 100jt.
  const totalBoth = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', null);
  assert.equal(totalBoth, 200000000);
  const excludingA1 = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { assetId: 'a1' });
  assert.equal(excludingA1, 100000000, 'hanya a2 yang harus dihitung kalau a1 dikecualikan');
  const excludingA2 = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { assetId: 'a2' });
  assert.equal(excludingA2, 100000000, 'hanya a1 yang harus dihitung kalau a2 dikecualikan');
});

// ============================================================
// LANGKAH 5 — PORSI: MultiOwnerEngine.splitByPorsi() (existing, TIDAK
// disentuh) -- build() memakainya lintas domain Aset, hasil split HARUS
// proporsional & principal SSOT (D.titipanCommitments) TIDAK PERNAH
// dimutasi oleh perhitungan porsi/kuota/alokasi (HARD RULE 8/11).
// ============================================================

test('5. PORSI: build() split allocatedPrincipal proporsional porsi via MultiOwnerEngine.splitByPorsi() -- 0 rumus baru, principalAmount SSOT tidak berubah', () => {
  const D = baseD();
  const ctx = makeCtx(D, makeStatefulDom());
  const ownerId = ctx.OwnerRegistry.findOrCreate('Budi');
  D.assets.push({ id: 'a1', name: 'Ruko', jenis: 'Ruko', nilai: 400000000, owners: [{ ownerId, porsi: 25, ownerName: 'Budi', isSelf: false }, { ownerId: 'SELF', porsi: 75, ownerName: 'Milik Sendiri', isSelf: true }] });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Budi', principalAmount: 1700000000 });
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const budi = projection.owners.find((o) => o.ownerId === ownerId);
  assert.equal(budi.allocatedPrincipal, 400000000 * 0.25, 'alokasi aset harus persis nilai x porsi (splitByPorsi, 0 rumus baru)');
  // Invariant PENUH: principal SSOT tidak berubah walau sudah dialokasikan
  // ke aset & di-split porsi (langkah "Asset"+"Porsi" gabungan).
  assert.equal(budi.principalAmount, 1700000000, 'principal SSOT tidak boleh berubah krn alokasi/porsi aset');
  assert.equal(D.titipanCommitments[0].principalAmount, 1700000000, 'D.titipanCommitments tetap exact, tidak dimutasi oleh build()/splitByPorsi');
});

// ============================================================
// END-TO-END: Owner -> Nominal -> Asset -> Kuota -> Porsi, SATU alur
// penuh dgn D yang sama, lintas semua 5 langkah, via source asli.
// ============================================================

test('6. [E2E] flow penuh Owner->Nominal->Asset->Kuota->Porsi: 0 SSOT baru, principal exact end-to-end, tidak ada duplikat/overwrite', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  // (1) OWNER — findOrCreate lewat OwnerRegistry (dipakai Aset.saveOwners
  // di app asli; di sini dipanggil langsung persis kontrak yang sama).
  const ownerId = ctx.OwnerRegistry.findOrCreate('Cici');
  assert.equal(D.ownerRegistry.length, 1);

  // (2) NOMINAL — commit pokok exact 1.700.000.000 (invariant global).
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Cici', principalAmount: 1700000000 });
  assert.equal(rec.principalAmount, 1700000000);

  // (3) ASSET — tambah aset & set porsi Cici lewat MultiOwnerEngine
  // (Aset.saveOwners() sendiri sudah di-cover test lain S392d, di sini
  // fokus WIRING navigasi S515: openOwnersModalById harus benar2 dipakai
  // dari picker presenter).
  D.assets.push({ id: 'a1', name: 'Apartemen', jenis: 'Rumah/Bangunan', nilai: 1000000000, owners: [] });
  dom.getElementById('titipanAssetPick_0').value = 'a1';
  ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  assert.equal(ctx.Aset.editId, 'a1', 'langkah Asset harus benar2 membuka assetOwnersModal utk aset yang dipilih');
  // Simulasikan user set porsi 30% via saveOwners() existing (0 logic
  // baru) -- ownerId HARUS SAMA dgn ownerId dari OwnerRegistry (langkah 1),
  // bukan identity baru (menutup loop Owner -> Asset).
  ctx.Aset._ownersDraft = [
    { ownerId, ownerName: 'Cici', porsi: 30, isSelf: false },
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 70, isSelf: true },
  ];
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners.length, 2);
  assert.equal(D.assets[0].owners.find((o) => o.ownerId === ownerId).porsi, 30);

  // (4) KUOTA — allocatedExcluding harus mencerminkan alokasi baru (30% x
  // 1M = 300jt), TIDAK termasuk aset yang sedang dibuka.
  const kuotaExcludingSelf = ctx.DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, { assetId: 'a1' });
  assert.equal(kuotaExcludingSelf, 0, 'aset yg sedang dibuka wajib dikecualikan dari kuota');
  const kuotaTotal = ctx.DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, null);
  assert.equal(kuotaTotal, 300000000);

  // (5) PORSI — build() proyeksi akhir: allocatedPrincipal sesuai porsi,
  // principal SSOT tetap exact, TIDAK ada duplikat owner/commitment.
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(projection.owners.length, 1, 'tidak boleh ada duplikat owner di proyeksi akhir');
  const cici = projection.owners[0];
  assert.equal(cici.ownerId, ownerId);
  assert.equal(cici.allocatedPrincipal, 300000000);
  assert.equal(cici.principalAmount, 1700000000, '[INVARIANT] principal exact SSOT utuh di ujung flow E2E penuh');
  assert.equal(D.titipanCommitments.length, 1, 'saveCommitment tidak boleh push duplikat utk owner yang sama');
  assert.equal(D.ownerRegistry.length, 1, 'findOrCreate tidak boleh push duplikat utk nama yang sama');

  // saveCommitment() dipanggil ULANG dgn ownerId sama (mis. user
  // update pokok) -- HARUS upsert in place, bukan push baru.
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Cici', principalAmount: 1800000000 });
  assert.equal(D.titipanCommitments.length, 1, 'update pokok owner yang sama harus upsert, bukan duplikat baris baru');
  assert.equal(D.titipanCommitments[0].principalAmount, 1800000000);
});
