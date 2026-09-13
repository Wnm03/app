'use strict';
// tests/investasi-dasar-aibus-investment-updated-sesi-c.test.js — Sesi C
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2j urutan poin 1): `investasi.js`
// dasar — event `investment.updated` BARU di 7 titik yang SEBELUMNYA 0% emit,
// di luar CRUD holding utama (investasi-list-view.js/investasi-tx-view.js/
// investasi-view.js) yang sudah emit sejak preseden lama. Listener
// `AIService.wireEvents()` SUDAH subscribe `investment.updated` sejak sesi
// wiring sebelumnya (§2f/§2h) — 0 perubahan listener di sesi ini.
//
// 7 titik, 5 file:
//   - investasi-watch-view.js (2x): InvestmentWatchUI.save() (create/edit),
//     .deleteFromModal()
//   - aset-misc.js (2x): migrateAssetInvestmentsToHoldings() (batch, migrated>0),
//     unmigrateAssetFromInvestment()
//   - aset.js (1x): saveUnified() — waris ownership aset ke holding baru
//   - tx-list-cashflow.js (1x): cascade investmentTxLinkId di
//     runTxDeleteCascades() (dipanggil dari delTx())
//   - realokasi-sisa-kuota.js (1x): RealokasiSisaKuota.applyAllocationRow()
//     cabang holding (bukan cabang asset — beda event)
//
// Semua guard `typeof AIBus!=='undefined'`, payload pola `{...id}` konsisten
// dgn preseden (investasi-list-view.js/investasi-view.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ====================================================================
// Bagian 1 — investasi-watch-view.js (InvestmentWatchUI.save()/deleteFromModal())
// ====================================================================
function makeWatchDom(values) {
  const els = {};
  function makeEl(id) {
    return {
      id,
      value: values[id] !== undefined ? values[id] : '',
      textContent: '', innerHTML: '', style: {},
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    };
  }
  return { getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; } };
}

function makeWatchCtx({ domValues, investmentStub, askConfirmResult } = {}) {
  const events = [];
  const ctx = loadSource(
    ['modules/asset/investasi-watch-view.js'],
    {
      Investment: investmentStub,
      document: makeWatchDom(domValues || {}),
      window: {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      parseDecStr: (s) => (s === '' || s == null ? 0 : parseFloat(s) || 0),
      toast: () => {},
      openModal: () => {},
      closeModal: () => {},
      askConfirm: async () => (askConfirmResult !== undefined ? askConfirmResult : true),
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    ['InvestmentWatchUI'],
  );
  ctx._events = events;
  return ctx;
}

test('InvestmentWatchUI.save() mode Tambah -- emit investment.updated {kind:"watch",action:"create"}', () => {
  const added = { id: 'w1' };
  const investmentStub = {
    getWatchlist() { return []; },
    addWatch() { return added; },
    updateWatch() { throw new Error('tidak dipanggil di mode Tambah'); },
  };
  const ctx = makeWatchCtx({
    domValues: { watchName: 'BBCA', watchJenis: 'Saham', watchLastPrice: '9000', watchTargetPrice: '8500' },
    investmentStub,
  });
  ctx.InvestmentWatchUI.editId = null;
  ctx.InvestmentWatchUI.save();
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'investment.updated');
  assert.equal(ctx._events[0].payload.kind, 'watch');
  assert.equal(ctx._events[0].payload.action, 'create');
  assert.equal(ctx._events[0].payload.watchId, 'w1');
});

test('InvestmentWatchUI.save() mode Edit -- emit investment.updated {kind:"watch",action:"edit"}', () => {
  const edited = { id: 'w2' };
  const investmentStub = {
    getWatchlist() { return [{ id: 'w2', name: 'Lama' }]; },
    updateWatch() { return edited; },
    addWatch() { throw new Error('tidak dipanggil di mode Edit'); },
  };
  const ctx = makeWatchCtx({
    domValues: { watchName: 'BBRI', watchJenis: 'Saham', watchLastPrice: '5000', watchTargetPrice: '4500' },
    investmentStub,
  });
  ctx.InvestmentWatchUI.editId = 'w2';
  ctx.InvestmentWatchUI.save();
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.kind, 'watch');
  assert.equal(ctx._events[0].payload.action, 'edit');
  assert.equal(ctx._events[0].payload.watchId, 'w2');
});

test('InvestmentWatchUI.save() gagal (Investment.addWatch melempar Error) -- 0 emit', () => {
  const investmentStub = {
    getWatchlist() { return []; },
    addWatch() { throw new Error('Nama instrumen wajib diisi'); },
  };
  const ctx = makeWatchCtx({ domValues: { watchName: '' }, investmentStub });
  ctx.InvestmentWatchUI.editId = null;
  ctx.InvestmentWatchUI.save();
  assert.equal(ctx._events.length, 0);
});

test('InvestmentWatchUI.deleteFromModal() -- emit investment.updated {kind:"watch",action:"delete"}', async () => {
  const investmentStub = { removeWatch() { return true; } };
  const ctx = makeWatchCtx({ investmentStub, askConfirmResult: true });
  ctx.InvestmentWatchUI.editId = 'w9';
  await ctx.InvestmentWatchUI.deleteFromModal();
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.kind, 'watch');
  assert.equal(ctx._events[0].payload.action, 'delete');
  assert.equal(ctx._events[0].payload.deletedId, 'w9');
});

test('InvestmentWatchUI.deleteFromModal() -- user batal konfirmasi -- 0 emit', async () => {
  const investmentStub = { removeWatch() { throw new Error('tidak boleh dipanggil'); } };
  const ctx = makeWatchCtx({ investmentStub, askConfirmResult: false });
  ctx.InvestmentWatchUI.editId = 'w9';
  await ctx.InvestmentWatchUI.deleteFromModal();
  assert.equal(ctx._events.length, 0);
});

// ====================================================================
// Bagian 2 — aset-misc.js (migrateAssetInvestmentsToHoldings()/unmigrateAssetFromInvestment())
// ====================================================================
function makeMiscCtx(D, investmentStub) {
  const events = [];
  const ctx = loadSource(
    ['modules/asset/aset-misc.js'],
    {
      D,
      Investment: investmentStub,
      save: () => {},
      isAssetOwnershipSelf: () => true,
      // gap harness (v1674, SESSION-NOTE-sesi-c-investasi-dasar-...): file
      // asli `aset-misc.js` SELALU dimuat SETELAH `aset.js`/`aset-reports.js`
      // di app nyata -- baris terakhir file (`Object.assign(window,{...})`)
      // merujuk sederet nama yang didefinisikan di file-file LAIN itu.
      // Harness yang memuat file ini SENDIRIAN belum meniru urutan load
      // tsb, jadi perlu stub permisif di sini utk semua nama itu. Stub
      // kosong cukup: tidak ada logic di bagian yang DITES (migrate/
      // unmigrate) yang MEMBACA nama-nama ini, cuma diekspos ke window di
      // baris terakhir file.
      Aset: {},
      Penyusutan: {},
      PajakAset: {},
      LaporanAset: {},
      IDBStore: {},
      PORTFOLIO_LABELS: {},
      TimelineW: {},
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    [],
  );
  ctx._events = events;
  return ctx;
}

test('migrateAssetInvestmentsToHoldings() migrated>0 -- emit investment.updated {kind:"migrate-from-asset"}', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Reksadana Lama', jenis: 'Reksadana', nilai: 1000000, hargaBeli: 1000000, jumlahUnit: 1 },
    ],
  };
  const investmentStub = { addHolding(opts) { return Object.assign({ id: 'hold_1' }, opts); } };
  const ctx = makeMiscCtx(D, investmentStub);
  const res = ctx.migrateAssetInvestmentsToHoldings();
  assert.equal(res.migrated, 1);
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'investment.updated');
  assert.equal(ctx._events[0].payload.kind, 'migrate-from-asset');
  assert.equal(ctx._events[0].payload.migrated, 1);
});

test('migrateAssetInvestmentsToHoldings() 0 kandidat -- 0 emit', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', jenis: 'Tanah', nilai: 500000000 }] };
  const ctx = makeMiscCtx(D, { addHolding() { throw new Error('tidak dipanggil'); } });
  const res = ctx.migrateAssetInvestmentsToHoldings();
  assert.equal(res.migrated, 0);
  assert.equal(ctx._events.length, 0);
});

test('unmigrateAssetFromInvestment() -- emit investment.updated {kind:"unmigrate-to-asset"}', () => {
  const D = { assets: [{ id: 'a1', name: 'Reksadana', jenis: 'Reksadana', _migratedToInvestmentId: 'hold_1' }] };
  const deleteCalls = [];
  const investmentStub = { deleteHolding(id) { deleteCalls.push(id); } };
  const ctx = makeMiscCtx(D, investmentStub);
  const ok = ctx.unmigrateAssetFromInvestment('a1');
  assert.equal(ok, true);
  assert.deepEqual(deleteCalls, ['hold_1']);
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.kind, 'unmigrate-to-asset');
  assert.equal(ctx._events[0].payload.deletedId, 'hold_1');
  assert.equal(ctx._events[0].payload.assetId, 'a1');
});

test('unmigrateAssetFromInvestment() aset tidak ditemukan/belum migrasi -- 0 emit', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', jenis: 'Tanah' }] };
  const ctx = makeMiscCtx(D, { deleteHolding() { throw new Error('tidak dipanggil'); } });
  const ok = ctx.unmigrateAssetFromInvestment('a1');
  assert.equal(ok, false);
  assert.equal(ctx._events.length, 0);
});

// ====================================================================
// Bagian 3 — aset.js (saveUnified() -- waris ownership aset ke holding baru)
// ====================================================================
function makeAsetDom(values) {
  const els = {};
  function makeEl(id) {
    return {
      id,
      value: values[id] !== undefined ? values[id] : '',
      textContent: '', innerHTML: '', style: {},
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    };
  }
  return { getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; } };
}

function makeAsetCtx({ domValues, ownersResult } = {}) {
  const events = [];
  const setOwnersCalls = [];
  const D = { assets: [], accounts: [] };
  const Investment = {
    addHolding(opts) { return Object.assign({ id: 'hold_new' }, opts); },
    setOwners(id, owners) { setOwnersCalls.push({ id, owners }); return { id }; },
  };
  const MultiOwnerEngine = { getOwners() { return ownersResult; } };
  const ctx = loadSource(
    // gap harness (v1674): `_saveInner()` -> `renderList()` memanggil 2
    // dependency dari file LAIN yang belum ter-load kalau `aset.js` dimuat
    // sendirian:
    //   - `FilterPrefsStore.loadOnce(Aset)` (S716,
    //     modules/shared/filter-prefs-store.js) -- murni (localStorage,
    //     sudah di-stub permisif oleh loadSource()), dimuat dari source asli.
    //   - `migrateAssetInvestmentsToHoldings()` (s476a,
    //     modules/asset/aset-misc.js, dites terpisah di Bagian 2 di atas)
    //     -- dipanggil UNCONDITIONAL tiap renderList(); dgn D.assets=[] di
    //     harness ini early-exit murni (0 kandidat, 0 emit), aman dimuat
    //     dari source asli juga. Urutan muat: aset.js DULU baru aset-misc.js
    //     -- kebalikan urutan real app (lihat docs/FILE-MAP.md: aset.js #22
    //     sebelum aset-misc.js #24) -- supaya `Aset` (dirujuk aset-misc.js
    //     di baris expose window terakhir) sudah ada sbg binding saat
    //     aset-misc.js dieksekusi; aman krn migrateAssetInvestmentsToHoldings
    //     baru DIPANGGIL belakangan (dari dalam renderList(), saat test
    //     jalan), bukan saat file dimuat -- urutan definisi vs urutan
    //     panggil tidak masalah selama keduanya sudah didefinisikan
    //     sebelum saveUnified() dipanggil test.
    ['modules/shared/filter-prefs-store.js', 'modules/asset/aset.js', 'modules/asset/aset-misc.js'],
    {
      D,
      Investment,
      MultiOwnerEngine,
      document: makeAsetDom(domValues || {}),
      window: {},
      // gap harness (v1674, followup): `_saveInner()` (CRUD Aset inti, di
      // luar cakupan 7 titik sesi ini) SUDAH emit `asset.updated` di jalur
      // yang sama (create/delete) -- preseden lama, bukan bagian dari
      // sesi ini. Filter di sini biar assertion `ctx._events` cuma
      // menangkap `investment.updated` (subjek 7 titik yang DITES),
      // konsisten dgn maksud test Bagian 3 (waris ownership -> holding).
      AIBus: { emit(name, payload) { if (name === 'investment.updated') events.push({ name, payload }); } },
      uid: (() => { let n = 0; return () => 'a' + (++n); })(),
      sameId: (a, b) => String(a) === String(b),
      parsePzNum: (s) => (s === '' || s == null ? 0 : Number(String(s).replace(/[^\d.-]/g, '')) || 0),
      parseDecStr: (s) => (s === '' || s == null ? 0 : parseFloat(s) || 0),
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      fmt: (n) => String(n),
      toast: () => {},
      closeModal: () => {},
      openModal: () => {},
      save: () => {},
      withSaveGuard: (key, modalId, fn) => fn(),
      recalcAccBalance: () => 0,
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderAccGrid: () => {},
      renderDashAccList: () => {},
      renderLapAccList: () => {},
      // `resolve` ditambahkan: `isAssetOwnershipSelf()` (fungsi ASLI di
      // aset-misc.js, dimuat via source -- lihat catatan di atas)
      // memanggil `OwnershipEngine.resolve(a).type` dari dalam
      // `migrateAssetInvestmentsToHoldings()` (dipanggil unconditional di
      // `renderList()`). Aset test di sini semua ownership SELF/default.
      OwnershipEngine: {
        isValidType: () => true,
        normalize: (v) => v,
        DEFAULT: 'SELF',
        resolve: (a) => ({ type: (a && a.ownership) || 'SELF' }),
      },
      TitipanSync: { reconcile: () => {} },
      AssetOwnersMixin: {},
      // gap harness (v1674): deps lain aset-misc.js (dimuat setelah aset.js
      // di sini, lihat catatan di atas) yang HANYA dirujuk di baris expose
      // window terakhir file itu, bukan dibaca logic yang dites -- stub
      // kosong cukup, sama pola Bagian 2 (makeMiscCtx) di atas.
      Penyusutan: {},
      PajakAset: {},
      LaporanAset: {},
      IDBStore: {},
      PORTFOLIO_LABELS: {},
      TimelineW: {},
      // `AssetInsight.render()` dipanggil dari cabang `!list.length`/
      // `!filteredList.length` renderList() (D.assets=[] di semua test
      // Bagian 3 ini) -- stub no-op, murni display, di luar cakupan tes.
      AssetInsight: { render: () => {} },
    },
    ['Aset'],
  );
  // gap harness (v1674): `renderList()` (dipanggil dari dalam `_saveInner()`)
  // cabang `!list.length`/`!filteredList.length` juga memanggil
  // `Aset.renderDashboard()`/`Aset.renderInvestasi()`/`Aset._safeRenderReports()`
  // -- ketiganya method render ASLI di `aset.js` sendiri (bukan dependency
  // file lain), tapi masing2 punya rantai dependency formatting lanjutan
  // (`fmtFullSigned` dkk) yang tidak relevan dgn logic emit yang dites di
  // sini. Di-override no-op SETELAH load (murni display, sama alasan stub
  // `renderKekayaanBersih`/`renderAccGrid`/dkk di atas), SEBELUM test
  // memanggil `saveUnified()`.
  ctx.Aset.renderDashboard = () => {};
  ctx.Aset.renderInvestasi = () => {};
  ctx.Aset._safeRenderReports = () => {};
  ctx._events = events;
  ctx._setOwnersCalls = setOwnersCalls;
  ctx._D = D;
  return ctx;
}

test('Aset.saveUnified() waris ownership non-SELF ke holding baru -- emit investment.updated {ownersUpdated:true}', () => {
  const ownersResult = {
    ok: true,
    owners: [
      { ownerId: 'SELF', ownerName: 'Budi', porsi: 60, isSelf: true },
      { ownerId: 'owner1', ownerName: 'Ayah', porsi: 40, isSelf: false },
    ],
  };
  const ctx = makeAsetCtx({
    domValues: {
      // gap harness (v1674, followup): SENGAJA TIDAK isi assetHargaBeli/
      // assetJumlahUnit (beda dari draft awal sesi ini). Temuan sesi
      // followup: kalau kedua field ini diisi (>0) DAN jenis cocok mapping
      // migrasi (`ASSET_JENIS_TO_INVESTMENT_TYPE`, aset-misc.js), asset
      // BARU yg baru dibuat lewat `_saveInner()` (dipanggil dari `Aset.
      // save()` DI DALAM `saveUnified()`, SEBELUM blok pembuatan holding
      // eksplisit di bawahnya jalan) ke-deteksi sbg kandidat sah oleh
      // `migrateAssetInvestmentsToHoldings()` (dipanggil unconditional di
      // `renderList()`) -- KARENA guard `if(savedAsset.investmentId)
      // return` di saveUnified() cek field `investmentId`, BUKAN
      // `_migratedToInvestmentId` yg justru ditulis migrasi itu. Akibatnya
      // 2 Holding Investasi terduplikasi utk 1 aset (bug produksi nyata,
      // BUKAN artefak harness -- dikonfirmasi manual, lihat catatan
      // "Belum dikerjakan" di bawah §2l roadmap utk sesi followup).
      // Isu ini DI LUAR cakupan "7 gap harness" (murni soal stub test) --
      // sesuai keputusan eksplisit W, sesi INI cukup ubah data test supaya
      // TIDAK memicu race tsb (hargaBeli/jumlahUnit dibiarkan 0/kosong,
      // tidak relevan dgn logic ownersUpdated yg DITES di sini), perbaikan
      // bug produksinya sendiri DITUNDA ke sesi terpisah.
      assetName: 'Reksadana Warisan', assetJenis: 'Reksadana', assetNilai: '1000000',
      assetTanggal: '2026-01-01', assetOwnership: 'SELF',
    },
    ownersResult,
  });
  ctx.Aset._tradableState = true;
  const saved = ctx.Aset.saveUnified();
  assert.ok(saved);
  assert.ok(saved.investmentId || saved._migratedToInvestmentId);
  assert.equal(ctx._setOwnersCalls.length, 1);
  assert.equal(ctx._setOwnersCalls[0].id, 'hold_new');
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'investment.updated');
  assert.equal(ctx._events[0].payload.ownersUpdated, true);
  assert.equal(ctx._events[0].payload.holdingId, 'hold_new');
});

test('Aset.saveUnified() owners SELF 100% -- 0 waris dipanggil, 0 emit', () => {
  const ownersResult = { ok: true, owners: [{ ownerId: 'SELF', ownerName: 'Budi', porsi: 100, isSelf: true }] };
  const ctx = makeAsetCtx({
    domValues: {
      // gap harness (v1674, followup): sama alasan seperti test di atas --
      // assetHargaBeli/assetJumlahUnit SENGAJA dikosongkan supaya asset
      // baru ini tidak ke-deteksi sbg kandidat migrateAssetInvestmentsTo
      // Holdings() (yg jalan lebih dulu lewat renderList() di dalam
      // Aset.save()), murni supaya test ini fokus ke logic ownersUpdated
      // yg DITES (0 waris dipanggil krn owners SELF 100%), bukan soal
      // harga/unit holding.
      assetName: 'Saham Sendiri', assetJenis: 'Saham', assetNilai: '2000000',
      assetTanggal: '2026-01-01', assetOwnership: 'SELF',
    },
    ownersResult,
  });
  ctx.Aset._tradableState = true;
  ctx.Aset.saveUnified();
  assert.equal(ctx._setOwnersCalls.length, 0);
  assert.equal(ctx._events.length, 0);
});

test('Aset.saveUnified() aset baru jenis tradable + hargaBeli/jumlahUnit terisi -- TIDAK bikin 2 Holding terduplikasi (fix bug produksi ROADMAP §2m)', () => {
  // Reproduksi bug ditemukan v1677 (lihat SESSION-NOTE-sesi-c-followup-
  // investasi-dasar-gap-harness-v1677.md): aset baru jenis Reksadana +
  // hargaBeli/jumlahUnit>0 -- Aset.save() (dipanggil di dalam saveUnified())
  // memicu renderList()->migrateAssetInvestmentsToHoldings() yang mendeteksi
  // aset ini sbg kandidat migrasi sah SEBELUM blok holding-creation eksplisit
  // saveUnified() jalan -- bikin Holding #1 + tandai `_migratedToInvestmentId`
  // (BUKAN `investmentId`). Guard lama `if(savedAsset.investmentId)return`
  // tidak menangkap ini -- saveUnified() lanjut bikin Holding #2. Fix: guard
  // cek JUGA `_migratedToInvestmentId`.
  const ownersResult = { ok: true, owners: [{ ownerId: 'SELF', ownerName: 'Budi', porsi: 100, isSelf: true }] };
  const addHoldingCalls = [];
  const ctx = makeAsetCtx({
    domValues: {
      assetName: 'Reksadana Baru', assetJenis: 'Reksadana', assetNilai: '1000000',
      assetHargaBeli: '1000000', assetJumlahUnit: '1',
      assetTanggal: '2026-01-01', assetOwnership: 'SELF',
    },
    ownersResult,
  });
  // Bungkus Investment.addHolding bawaan makeAsetCtx supaya bisa hitung
  // berapa kali holding benar-benar dibuat (bug lama -> 2x, fixed -> 1x).
  const origAddHolding = ctx.Investment.addHolding;
  ctx.Investment.addHolding = (opts) => { addHoldingCalls.push(opts); return origAddHolding(opts); };
  ctx.Aset._tradableState = true;
  const saved = ctx.Aset.saveUnified();
  assert.ok(saved);
  // Hanya 1 Holding yang boleh dibuat -- bukan 2 (double-holding). Holding
  // #1 dibuat oleh migrateAssetInvestmentsToHoldings() (dipanggil di dalam
  // Aset.save() lewat renderList(), SEBELUM guard baru saveUnified() cek
  // `_migratedToInvestmentId` dan return lebih awal -- blok holding-creation
  // eksplisit di bawah guard TIDAK PERNAH dijalankan, jadi `investmentId`
  // (field yang DITULIS blok itu) tetap kosong; migrasi menandai field BEDA
  // (`_migratedToInvestmentId`), sesuai desain lama fungsi migrasi.
  assert.equal(addHoldingCalls.length, 1);
  assert.ok(saved._migratedToInvestmentId);
  assert.equal(saved.investmentId, undefined);
});

test('Aset.saveUnified() bukan tradable (toggle nonaktif) -- 0 holding dibuat, 0 emit', () => {
  const ctx = makeAsetCtx({
    domValues: { assetName: 'Tanah Kavling', assetJenis: 'Tanah', assetNilai: '500000000', assetOwnership: 'SELF' },
  });
  ctx.Aset._tradableState = false;
  const saved = ctx.Aset.saveUnified();
  assert.ok(saved);
  assert.equal(saved.investmentId, undefined);
  assert.equal(ctx._events.length, 0);
});

// ====================================================================
// Bagian 4 — tx-list-cashflow.js (cascade investmentTxLinkId di runTxDeleteCascades())
// ====================================================================
function makeTxCascadeCtx(D, investmentStub) {
  const events = [];
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    {
      D,
      Investment: investmentStub,
      toast: () => {},
      renderShop: () => {}, renderShopRecent: () => {}, renderStockList: () => {},
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    [],
  );
  ctx._events = events;
  return ctx;
}

test('runTxDeleteCascades() cascade investmentTxLinkId (beli/jual) -- emit investment.updated {kind:"tx-cascade"}', () => {
  const D = {
    investmentTx: [{ id: 'itx1', type: 'beli', investmentId: 'hold_5' }],
  };
  const recomputeCalls = [];
  const investmentStub = { recomputeHolding(id) { recomputeCalls.push(id); } };
  const ctx = makeTxCascadeCtx(D, investmentStub);
  const t = { id: 'tx1', investmentTxLinkId: 'itx1' };
  ctx.runTxDeleteCascades(t, {});
  assert.deepEqual(recomputeCalls, ['hold_5']);
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'investment.updated');
  assert.equal(ctx._events[0].payload.kind, 'tx-cascade');
  assert.equal(ctx._events[0].payload.action, 'delete');
  assert.equal(ctx._events[0].payload.deletedTxLinkId, 'itx1');
  assert.equal(ctx._events[0].payload.holdingId, 'hold_5');
});

test('runTxDeleteCascades() transaksi tanpa investmentTxLinkId -- 0 emit investment.updated', () => {
  const D = { investmentTx: [] };
  const ctx = makeTxCascadeCtx(D, { recomputeHolding() { throw new Error('tidak dipanggil'); } });
  const t = { id: 'tx2' };
  ctx.runTxDeleteCascades(t, {});
  assert.equal(ctx._events.length, 0);
});

// ====================================================================
// Bagian 5 — realokasi-sisa-kuota.js (RealokasiSisaKuota.applyAllocationRow() cabang holding)
// ====================================================================
function makeRealokasiCtx({ D, investmentStub, multiOwnerStub }) {
  const events = [];
  const ctx = loadSource(
    ['modules/shared/realokasi-sisa-kuota.js'],
    {
      D,
      Investment: investmentStub,
      MultiOwnerEngine: multiOwnerStub,
      sameId: (a, b) => String(a) === String(b),
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    ['RealokasiSisaKuota'],
  );
  ctx._events = events;
  return ctx;
}

test('RealokasiSisaKuota.applyAllocationRow() cabang holding -- emit investment.updated {ownersUpdated:true}', () => {
  const holding = { id: 'hold_7', name: 'BBCA' };
  const investmentStub = {
    getHolding(id) { return id === 'hold_7' ? holding : null; },
    holdingValue() { return 10000000; },
    setOwners(id, owners) { this._lastCall = { id, owners }; return { id }; },
  };
  const multiOwnerStub = {
    getOwners() {
      return { ok: true, owners: [{ ownerId: 'SELF', ownerName: 'Budi', porsi: 100, isSelf: true }] };
    },
  };
  const ctx = makeRealokasiCtx({ D: {}, investmentStub, multiOwnerStub });
  const res = ctx.RealokasiSisaKuota.applyAllocationRow({ type: 'holding', id: 'hold_7', alloc: 1000000 }, 'owner1', 'Ibu');
  assert.equal(res.ok, true);
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'investment.updated');
  assert.equal(ctx._events[0].payload.ownersUpdated, true);
  assert.equal(ctx._events[0].payload.holdingId, 'hold_7');
});

test('RealokasiSisaKuota.applyAllocationRow() cabang asset -- 0 emit investment.updated', () => {
  const asset = { id: 'a1', name: 'Tanah', nilai: 10000000 };
  const D = { assets: [asset] };
  const AsetStub = { _applyOwnersToAsset() { return { ok: true }; } };
  const multiOwnerStub = {
    getOwners() {
      return { ok: true, owners: [{ ownerId: 'SELF', ownerName: 'Budi', porsi: 100, isSelf: true }] };
    },
  };
  const ctx = makeRealokasiCtx({ D, investmentStub: {}, multiOwnerStub });
  const script = 'this.Aset = ' + 'undefined;';
  ctx.Aset = AsetStub;
  const res = ctx.RealokasiSisaKuota.applyAllocationRow({ type: 'asset', id: 'a1', alloc: 1000000 }, 'owner1', 'Ibu');
  assert.equal(res.ok, true);
  assert.equal(ctx._events.length, 0);
});

test('RealokasiSisaKuota.applyAllocationRow() gagal (writeBack throw) -- 0 emit', () => {
  const holding = { id: 'hold_8', name: 'BBRI' };
  const investmentStub = {
    getHolding(id) { return id === 'hold_8' ? holding : null; },
    holdingValue() { return 10000000; },
    setOwners() { throw new Error('gagal simpan'); },
  };
  const multiOwnerStub = {
    getOwners() {
      return { ok: true, owners: [{ ownerId: 'SELF', ownerName: 'Budi', porsi: 100, isSelf: true }] };
    },
  };
  const ctx = makeRealokasiCtx({ D: {}, investmentStub, multiOwnerStub });
  const res = ctx.RealokasiSisaKuota.applyAllocationRow({ type: 'holding', id: 'hold_8', alloc: 1000000 }, 'owner1', 'Ibu');
  assert.equal(res.ok, false);
  assert.equal(ctx._events.length, 0);
});
