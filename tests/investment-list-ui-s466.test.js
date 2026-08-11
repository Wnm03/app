'use strict';
// tests/investment-list-ui-s466.test.js — Test coverage BARU untuk
// `InvestmentListUI` (modules/asset/investasi-list-view.js, Sesi 466, Fase 1
// dari BUG-INV-001 Opsi 3 — lihat docs/BUG_REGISTRY.md §BUG-INV-001).
//
// Kenapa file ini sebelumnya belum ada: PATCH-README.md Sesi 466 mencatat
// "Test coverage baru untuk InvestmentListUI (belum ada test file khusus —
// 2984 test lama tetap 100% pass krn perubahan ini murni aditif)" sbg salah
// satu item "Belum dikerjakan" — file ini menutup gap itu.
//
// Pola & harness SAMA PERSIS asset-owners-flow-e2e-392a-to-392e.test.js:
// dijalankan lewat source ASLI (loadSource(), bukan reimplementasi logic di
// test) dgn DOM tiruan STATEFUL (getElementById auto-vivify + MENYIMPAN
// state antar panggilan) supaya alur render() -> openModal() -> isi form ->
// save() -> baca ulang DOM benar-benar nyambung seperti browser asli.
//
// Cakupan yang diuji di sini:
//   1. render() — kartu ringkasan portofolio (_renderSummary, 100% reuse
//      Investment.portfolioSummary()) & daftar holding (_renderList),
//      termasuk empty-state saat D.investments kosong.
//   2. openModal() — mode Tambah (id kosong) vs mode Edit (prefill dari
//      holding yang sudah ada), toggle tombol Owners/Delete sesuai mode.
//   3. save() — jalur Tambah (Investment.addHolding()) & jalur Edit
//      (Investment.updateHolding() + tulis manual unit/avgPrice sesuai
//      catatan scope Fase 1 di kepala investasi-list-view.js), termasuk
//      jalur gagal (nama kosong -> toast peringatan, tidak menyentuh
//      D.investments).
//   4. deleteFromModal() — konfirmasi askConfirm (true/false), delegasi ke
//      Investment.deleteHolding(), efek samping (renderKekayaanBersih,
//      hitungZakatMaal, renderDebtList, AIBus.emit).
//   5. openOwnersModalForEdit() — delegasi ke InvestmentUI.openOwnersModal()
//      HANYA kalau editId terisi (guard "simpan dulu"), pola AUD-008.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- DOM tiruan STATEFUL (identik pola makeStatefulDom() di
// asset-owners-flow-e2e-392a-to-392e.test.js) — getElementById() auto-vivify
// & menyimpan state antar panggilan, minimal sesuai yang benar-benar dipakai
// investasi-list-view.js (value, textContent, innerHTML, classList.toggle).
function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
      },
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

function makeD() {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
}

function makeCtx(D, dom, overrides = {}) {
  const calls = {
    openModal: [], closeModal: [], toast: [],
    renderKekayaanBersih: 0, hitungZakatMaal: 0, renderDebtList: 0,
    aiEmit: [], openOwnersModal: [], askConfirmArgs: [],
  };
  let _n = 0;
  const ctx = loadSource(
    [
      'modules/asset/investasi.js',
      'modules/asset/investasi-list-view.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      parseDecStr: (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; },
      uid: () => 'inv_' + (_n += 1),
      save: () => {},
      openModal: (id) => { calls.openModal.push(id); },
      closeModal: (id) => { calls.closeModal.push(id); },
      toast: (msg) => { calls.toast.push(msg); },
      askConfirm: overrides.askConfirm || (async (msg) => { calls.askConfirmArgs.push(msg); return true; }),
      renderKekayaanBersih: () => { calls.renderKekayaanBersih += 1; },
      hitungZakatMaal: () => { calls.hitungZakatMaal += 1; },
      renderDebtList: () => { calls.renderDebtList += 1; },
      AIBus: { emit: (evt, payload) => { calls.aiEmit.push([evt, payload]); } },
      InvestmentUI: {
        openOwnersModal: (id) => { calls.openOwnersModal.push(id); },
      },
    },
    ['Investment', 'InvestmentListUI', 'INVESTMENT_TYPES'],
  );
  ctx.calls = calls;
  return ctx;
}

// ============================================================
// 1. render() — ringkasan portofolio & daftar holding
// ============================================================

test('[render] D.investments kosong -> kartu ringkasan angka nol & list tampilkan empty-state', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.render();

  assert.equal(dom.getElementById('investSummaryValue').textContent, 'Rp 0', 'total nilai portofolio harus 0 saat belum ada holding');
  assert.equal(dom.getElementById('investSummaryCost').textContent, 'Rp 0', 'total cost harus 0 saat belum ada holding');
  assert.match(dom.getElementById('investSummaryGain').innerHTML, /Rp 0/, 'untung/rugi harus 0 saat belum ada holding');
  assert.match(dom.getElementById('investSummaryMeta').textContent, /^0 holding/, 'meta harus bilang 0 holding');
  assert.match(dom.getElementById('investmentHoldingList').innerHTML, /Belum ada holding investasi tercatat/, 'list holding harus tampilkan empty-state');
});

test('[render] 2 holding (1 untung, 1 rugi) -> ringkasan & baris list sesuai Investment.portfolioSummary()/holdingValue()', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  const winner = ctx.Investment.addHolding({ name: 'Saham BBCA', type: 'Saham', unit: 100, avgPrice: 9000, currentPrice: 10000 });
  const loser = ctx.Investment.addHolding({ name: 'Kripto ETH', type: 'Kripto', unit: 2, avgPrice: 30000000, currentPrice: 25000000 });

  ctx.InvestmentListUI.render();

  const expected = ctx.Investment.portfolioSummary();
  assert.equal(dom.getElementById('investSummaryValue').textContent, 'Rp ' + Math.round(expected.totalValue).toLocaleString('id-ID'), 'nilai total harus 100% reuse Investment.portfolioSummary()');
  assert.match(dom.getElementById('investSummaryMeta').textContent, /^2 holding/, 'meta harus bilang 2 holding');

  const listHtml = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(listHtml, new RegExp(`InvestmentListUI\\.openModal.*${winner.id}`), 'baris winner harus punya data-args berisi id holding utk buka modal edit');
  assert.match(listHtml, new RegExp(`InvestmentListUI\\.openModal.*${loser.id}`), 'baris loser harus punya data-args berisi id holding utk buka modal edit');
  assert.match(listHtml, /Saham BBCA/, 'nama holding winner harus tampil');
  assert.match(listHtml, /Kripto ETH/, 'nama holding loser harus tampil');
  assert.match(listHtml, /green/, 'holding untung harus pakai class "green"');
  assert.match(listHtml, /red/, 'holding rugi harus pakai class "red"');
});

// ============================================================
// 2. openModal() — mode Tambah vs Edit
// ============================================================

test('[openModal] tanpa id (mode Tambah) -> form kosong, judul "Tambah Holding", tombol Owners/Delete disembunyikan', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.openModal();

  assert.equal(ctx.InvestmentListUI.editId, null, 'editId harus null di mode Tambah');
  assert.equal(dom.getElementById('investmentModalTitle').textContent, 'Tambah Holding');
  assert.equal(dom.getElementById('investName').value, '', 'field nama harus kosong di mode Tambah');
  assert.equal(dom.getElementById('investJenis').value, 'Saham', 'jenis default harus Saham');
  assert.equal(dom.getElementById('investUnit').value, '', 'field unit harus kosong di mode Tambah');
  assert.equal(dom.getElementById('investmentOwnersBtn').classList.contains('u-dnone'), true, 'tombol Owners harus disembunyikan di mode Tambah');
  assert.equal(dom.getElementById('investmentDeleteBtn').classList.contains('u-dnone'), true, 'tombol Delete harus disembunyikan di mode Tambah');
  assert.deepEqual(ctx.calls.openModal, ['investmentModal'], 'openModal("investmentModal") harus terpanggil tepat 1x');
});

test('[openModal] dgn id holding yang sudah ada (mode Edit) -> prefill semua field, judul "Edit Holding", tombol Owners/Delete tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({
    name: 'Reksadana Pasar Uang', type: 'Reksa Dana', unit: 500, avgPrice: 2000, currentPrice: 2100, notes: 'top up rutin',
  });

  ctx.InvestmentListUI.openModal(h.id);

  assert.equal(ctx.InvestmentListUI.editId, h.id, 'editId harus terisi id holding yang dibuka');
  assert.equal(dom.getElementById('investmentModalTitle').textContent, 'Edit Holding');
  assert.equal(dom.getElementById('investName').value, 'Reksadana Pasar Uang');
  assert.equal(dom.getElementById('investJenis').value, 'Reksa Dana');
  assert.equal(dom.getElementById('investUnit').value, 500);
  assert.equal(dom.getElementById('investAvgPrice').value, 2000);
  assert.equal(dom.getElementById('investCurrentPrice').value, 2100);
  assert.equal(dom.getElementById('investNotes').value, 'top up rutin');
  assert.equal(dom.getElementById('investmentOwnersBtn').classList.contains('u-dnone'), false, 'tombol Owners harus tampil di mode Edit');
  assert.equal(dom.getElementById('investmentDeleteBtn').classList.contains('u-dnone'), false, 'tombol Delete harus tampil di mode Edit');
});

test('[openModal] dropdown jenis harus dirender dari INVESTMENT_TYPES apa adanya (0 daftar duplikat)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.openModal();

  const jenisHtml = dom.getElementById('investJenis').innerHTML;
  for (const t of ctx.INVESTMENT_TYPES) {
    assert.match(jenisHtml, new RegExp(`<option value="${t}">${t}</option>`), `opsi dropdown harus memuat tipe "${t}" dari INVESTMENT_TYPES`);
  }
});

// ============================================================
// 3. save() — jalur Tambah & Edit
// ============================================================

test('[save] mode Tambah: isi form -> save() -> holding baru tercatat via Investment.addHolding(), modal ditutup, render ulang, efek samping terpanggil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.openModal();
  dom.getElementById('investName').value = 'Emas Batangan';
  dom.getElementById('investJenis').value = 'Emas';
  dom.getElementById('investUnit').value = '10';
  dom.getElementById('investAvgPrice').value = '1000000';
  dom.getElementById('investCurrentPrice').value = '1100000';
  dom.getElementById('investNotes').value = 'beli lelang';

  ctx.InvestmentListUI.save();

  assert.equal(D.investments.length, 1, 'save() mode Tambah harus menambah 1 holding baru');
  const h = D.investments[0];
  assert.equal(h.name, 'Emas Batangan');
  assert.equal(h.type, 'Emas');
  assert.equal(h.unit, 10);
  assert.equal(h.avgPrice, 1000000);
  assert.equal(h.currentPrice, 1100000);
  assert.equal(h.notes, 'beli lelang');
  assert.deepEqual(ctx.calls.closeModal, ['investmentModal'], 'save() sukses harus menutup investmentModal');
  assert.equal(ctx.calls.renderKekayaanBersih, 1, 'save() harus memicu renderKekayaanBersih()');
  assert.equal(ctx.calls.hitungZakatMaal, 1, 'save() harus memicu hitungZakatMaal()');
  assert.equal(ctx.calls.aiEmit.length, 1, 'save() harus emit event AIBus');
  assert.equal(ctx.calls.aiEmit[0][0], 'investment.updated');
  assert.equal(ctx.calls.aiEmit[0][1].holdingId, h.id, 'payload event harus memuat id holding yang baru dibuat');
  assert.match(ctx.calls.toast[ctx.calls.toast.length - 1], /✅.*tersimpan/, 'save() sukses harus toast konfirmasi');
});

test('[save] mode Edit: currentPrice/notes diupdate via updateHolding(), unit/avgPrice ditulis manual (sesuai scope Fase 1) & save() eksplisit dipanggil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'Saham TLKM', type: 'Saham', unit: 100, avgPrice: 3000, currentPrice: 3200 });

  ctx.InvestmentListUI.openModal(h.id);
  dom.getElementById('investUnit').value = '150';
  dom.getElementById('investAvgPrice').value = '3100';
  dom.getElementById('investCurrentPrice').value = '3500';
  dom.getElementById('investNotes').value = 'nambah unit manual';

  ctx.InvestmentListUI.save();

  const updated = ctx.Investment.getHolding(h.id);
  assert.equal(updated.currentPrice, 3500, 'currentPrice harus terupdate via updateHolding()');
  assert.equal(updated.notes, 'nambah unit manual', 'notes harus terupdate via updateHolding()');
  assert.equal(updated.unit, 150, 'unit harus ditulis manual langsung ke object holding (scope Fase 1, belum ada UI transaksi)');
  assert.equal(updated.avgPrice, 3100, 'avgPrice harus ditulis manual langsung ke object holding (scope Fase 1)');
  assert.equal(D.investments.length, 1, 'save() mode Edit TIDAK boleh menambah holding baru');
});

test('[save] nama kosong (mode Tambah) -> Investment.addHolding() melempar Error, save() toast peringatan & TIDAK menutup modal/menambah holding', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.openModal();
  dom.getElementById('investName').value = '   '; // kosong setelah trim

  ctx.InvestmentListUI.save();

  assert.equal(D.investments.length, 0, 'holding TIDAK boleh bertambah kalau nama kosong');
  assert.equal(ctx.calls.closeModal.length, 0, 'modal TIDAK boleh ditutup kalau save() gagal');
  assert.match(ctx.calls.toast[ctx.calls.toast.length - 1], /⚠️.*wajib diisi/, 'save() gagal harus toast peringatan dari pesan Error Investment.addHolding()');
});

test('[save] Investment belum dimuat (typeof undefined) -> toast peringatan, tidak melempar exception', () => {
  // Sengaja HANYA load investasi-list-view.js (bukan investasi.js) supaya
  // `typeof Investment` di source asli benar-benar resolve ke "undefined"
  // (binding global, bukan properti context yang di-override dari luar --
  // const Investment di investasi.js adalah lexical binding vm, menimpa
  // properti sandbox dari luar TIDAK memengaruhi binding itu kalau sudah
  // pernah di-load bareng; jadi cara benar mensimulasikan modul belum
  // dimuat adalah tidak me-load file itu sama sekali di context ini).
  const D = makeD();
  const dom = makeStatefulDom();
  const toastMsgs = [];
  const ctx = loadSource(
    ['modules/asset/investasi-list-view.js'],
    {
      D,
      document: dom,
      toast: (msg) => { toastMsgs.push(msg); },
    },
    ['InvestmentListUI'],
  );

  assert.doesNotThrow(() => ctx.InvestmentListUI.save());
  assert.match(toastMsgs[toastMsgs.length - 1], /⚠️.*belum siap dimuat/);
});

// ============================================================
// 4. deleteFromModal() — konfirmasi & delegasi ke Investment.deleteHolding()
// ============================================================

test('[deleteFromModal] user KONFIRMASI (askConfirm true) -> holding terhapus, modal ditutup, semua efek samping terpanggil', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, { askConfirm: async () => true });
  const h = ctx.Investment.addHolding({ name: 'Obligasi Ritel', type: 'Obligasi', unit: 1, avgPrice: 1000000, currentPrice: 1000000 });
  ctx.InvestmentListUI.editId = h.id;

  await ctx.InvestmentListUI.deleteFromModal();

  assert.equal(D.investments.length, 0, 'holding harus terhapus dari D.investments');
  assert.equal(ctx.InvestmentListUI.editId, null, 'editId harus direset setelah delete');
  assert.deepEqual(ctx.calls.closeModal, ['investmentModal'], 'deleteFromModal() harus menutup investmentModal');
  assert.equal(ctx.calls.renderKekayaanBersih, 1, 'harus memicu renderKekayaanBersih()');
  assert.equal(ctx.calls.hitungZakatMaal, 1, 'harus memicu hitungZakatMaal()');
  assert.equal(ctx.calls.renderDebtList, 1, 'harus memicu renderDebtList() (utk entry Buku Utang titipan tertaut, kalau ada)');
  assert.equal(ctx.calls.aiEmit.length, 1, 'harus emit event AIBus');
  assert.equal(ctx.calls.aiEmit[0][1].deletedId, h.id, 'payload event harus memuat id holding yang dihapus');
  assert.match(ctx.calls.toast[ctx.calls.toast.length - 1], /🗑️.*dihapus/, 'harus toast konfirmasi penghapusan');
});

test('[deleteFromModal] user BATAL (askConfirm false) -> holding TIDAK terhapus, tidak ada efek samping', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, { askConfirm: async () => false });
  const h = ctx.Investment.addHolding({ name: 'Deposito BCA', type: 'Deposito', unit: 1, avgPrice: 5000000, currentPrice: 5000000 });
  ctx.InvestmentListUI.editId = h.id;

  await ctx.InvestmentListUI.deleteFromModal();

  assert.equal(D.investments.length, 1, 'holding TIDAK boleh terhapus kalau user membatalkan konfirmasi');
  assert.equal(ctx.InvestmentListUI.editId, h.id, 'editId TIDAK boleh direset kalau batal');
  assert.equal(ctx.calls.closeModal.length, 0, 'modal TIDAK boleh ditutup kalau batal');
  assert.equal(ctx.calls.renderKekayaanBersih, 0, 'TIDAK boleh memicu renderKekayaanBersih() kalau batal');
});

test('[deleteFromModal] editId null (tidak ada holding sedang dibuka) -> no-op, tidak melempar & tidak menyentuh D.investments', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addHolding({ name: 'Saham Untouched', type: 'Saham', unit: 1, avgPrice: 100, currentPrice: 100 });
  ctx.InvestmentListUI.editId = null;

  await ctx.InvestmentListUI.deleteFromModal();

  assert.equal(D.investments.length, 1, 'D.investments tidak boleh berubah kalau editId null');
  assert.equal(ctx.calls.closeModal.length, 0, 'modal tidak boleh ditutup kalau editId null (fungsi return awal)');
});

// ============================================================
// 5. openOwnersModalForEdit() — delegasi ke InvestmentUI (guard "simpan dulu")
// ============================================================

test('[openOwnersModalForEdit] editId terisi -> delegasi penuh ke InvestmentUI.openOwnersModal(editId), 0 toast', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'Saham UNVR', type: 'Saham', unit: 10, avgPrice: 4000, currentPrice: 4200 });
  ctx.InvestmentListUI.editId = h.id;

  ctx.InvestmentListUI.openOwnersModalForEdit();

  assert.deepEqual(ctx.calls.openOwnersModal, [h.id], 'harus delegasi ke InvestmentUI.openOwnersModal() dgn id holding yang sedang diedit');
  assert.equal(ctx.calls.toast.length, 0, 'jalur normal (editId terisi) tidak boleh toast peringatan');
});

test('[openOwnersModalForEdit] editId null (holding belum disimpan) -> toast peringatan "simpan dulu", TIDAK memanggil InvestmentUI', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.editId = null;

  ctx.InvestmentListUI.openOwnersModalForEdit();

  assert.equal(ctx.calls.openOwnersModal.length, 0, 'InvestmentUI.openOwnersModal() TIDAK boleh terpanggil kalau holding belum disimpan');
  assert.match(ctx.calls.toast[ctx.calls.toast.length - 1], /⚠️.*Simpan holding ini dulu/);
});

test('[openOwnersModalForEdit] InvestmentUI belum dimuat (typeof undefined) -> toast peringatan lain, tidak melempar exception', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'Saham ASII', type: 'Saham', unit: 10, avgPrice: 4000, currentPrice: 4200 });
  ctx.InvestmentListUI.editId = h.id;
  ctx.InvestmentUI = undefined; // simulasikan investasi-view.js (InvestmentUI) belum dimuat di halaman

  assert.doesNotThrow(() => ctx.InvestmentListUI.openOwnersModalForEdit());
  assert.match(ctx.calls.toast[ctx.calls.toast.length - 1], /⚠️.*belum siap dimuat/);
});
