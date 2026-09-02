'use strict';
// tests/investment-tx-watch-ui-s467.test.js — Test coverage BARU untuk `InvestmentTxUI`
// (modules/asset/investasi-tx-view.js, Fase 2) & `InvestmentWatchUI`
// (modules/asset/investasi-watch-view.js, Fase 3) dari BUG-INV-001 Opsi 3 -- lihat
// AUDIT-BUILD-UI-INVESTASI-OPSI3.md §3.3 & §3.5, dan docs/BUG_REGISTRY.md §BUG-INV-001.
//
// Pola & harness SAMA PERSIS tests/investment-list-ui-s466.test.js: dijalankan lewat source
// ASLI (loadSource(), bukan reimplementasi logic di test) dgn DOM tiruan STATEFUL supaya
// alur render() -> openModal()/open() -> isi form -> save()/delete -> baca ulang DOM benar-
// benar nyambung seperti browser asli.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

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
    renderKekayaanBersih: 0, hitungZakatMaal: 0,
    aiEmit: [], askConfirmArgs: [],
  };
  let _n = 0;
  const ctx = loadSource(
    [
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/investasi-list-view.js',
      'modules/asset/investasi-tx-view.js',
      'modules/asset/investasi-watch-view.js',
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
      AIBus: { emit: (evt, payload) => { calls.aiEmit.push([evt, payload]); } },
      InvestmentUI: { openOwnersModal: () => {} },
    },
    ['Investment', 'InvestmentListUI', 'InvestmentTxUI', 'InvestmentWatchUI', 'INVESTMENT_TYPES'],
  );
  ctx.calls = calls;
  return ctx;
}

function addHolding(ctx, over = {}) {
  return ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 0, avgPrice: 0, currentPrice: 0, ...over });
}

// ============================================================
// InvestmentTxUI
// ============================================================

test('[InvestmentTxUI.open] set holdingId, header nama+unit, reset form ke tipe beli & tanggal hari ini', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx, { unit: 5, avgPrice: 1000 });

  ctx.InvestmentTxUI.open(h.id);

  assert.equal(ctx.InvestmentTxUI.holdingId, h.id);
  assert.match(dom.getElementById('investmentTxHoldingName').textContent, /BBCA/);
  assert.match(dom.getElementById('investmentTxHoldingName').textContent, /5 unit/);
  assert.equal(ctx.InvestmentTxUI.type, 'beli');
  assert.equal(dom.getElementById('investTxQty').value, '');
  assert.deepEqual(calls_openModal(ctx), ['investmentTxModal']);
});
function calls_openModal(ctx) { return ctx.calls.openModal; }

test('[InvestmentTxUI.openFromEdit] editId kosong -> toast peringatan, TIDAK buka modal', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.editId = null;

  ctx.InvestmentTxUI.openFromEdit();

  assert.equal(ctx.calls.openModal.length, 0);
  assert.match(ctx.calls.toast[0], /Simpan holding ini dulu/);
});

test('[InvestmentTxUI.openFromEdit] editId terisi -> delegasi ke open(editId)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentListUI.editId = h.id;

  ctx.InvestmentTxUI.openFromEdit();

  assert.equal(ctx.InvestmentTxUI.holdingId, h.id);
  assert.deepEqual(ctx.calls.openModal, ['investmentTxModal']);
});

test('[InvestmentTxUI.render] belum ada transaksi -> empty-state', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);

  ctx.InvestmentTxUI.open(h.id);

  assert.match(dom.getElementById('investmentTxList').innerHTML, /Belum ada transaksi tercatat/);
});

test('[InvestmentTxUI.setType] toggle visibility qty/price vs amount sesuai tipe', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentTxUI.setType('dividen');
  assert.equal(dom.getElementById('investTxQtyPriceWrap').classList.contains('u-dnone'), true);
  assert.equal(dom.getElementById('investTxAmountWrap').classList.contains('u-dnone'), false);

  ctx.InvestmentTxUI.setType('beli');
  assert.equal(dom.getElementById('investTxQtyPriceWrap').classList.contains('u-dnone'), false);
  assert.equal(dom.getElementById('investTxAmountWrap').classList.contains('u-dnone'), true);
});

test('[InvestmentTxUI.save] beli -> Investment.addTransaction dipanggil, holding unit/avgPrice ter-update, list & summary di-refresh', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);
  ctx.InvestmentListUI.render();

  dom.getElementById('investTxDate').value = '2026-01-15';
  dom.getElementById('investTxQty').value = '10';
  dom.getElementById('investTxPrice').value = '5000';
  ctx.InvestmentTxUI.save();

  assert.equal(D.investmentTx.length, 1);
  assert.equal(D.investmentTx[0].type, 'beli');
  assert.equal(h.unit, 10);
  assert.equal(h.avgPrice, 5000);
  assert.match(dom.getElementById('investmentTxList').innerHTML, /Beli/);
  assert.equal(ctx.calls.renderKekayaanBersih, 1);
  assert.match(ctx.calls.toast.at(-1), /tersimpan/);
});

test('[InvestmentTxUI.save] dividen -> amount tercatat, unit/avgPrice holding TIDAK berubah', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx, { unit: 10, avgPrice: 5000 });
  ctx.InvestmentTxUI.open(h.id);
  ctx.InvestmentTxUI.setType('dividen');

  dom.getElementById('investTxAmount').value = '250000';
  ctx.InvestmentTxUI.save();

  assert.equal(D.investmentTx[0].type, 'dividen');
  assert.equal(D.investmentTx[0].amount, 250000);
  assert.equal(h.unit, 10, 'unit tidak berubah utk transaksi dividen');
});

test('[InvestmentTxUI.save] jual melebihi unit yang dipegang -> toast error dari Investment.addTransaction, TIDAK menyimpan', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx, { unit: 5, avgPrice: 1000 });
  ctx.InvestmentTxUI.open(h.id);
  ctx.InvestmentTxUI.setType('jual');

  dom.getElementById('investTxQty').value = '999';
  dom.getElementById('investTxPrice').value = '2000';
  ctx.InvestmentTxUI.save();

  assert.equal(D.investmentTx.length, 0);
  assert.match(ctx.calls.toast.at(-1), /melebihi unit/);
});

test('[InvestmentTxUI.deleteTx] confirm true -> Investment.deleteTransaction dipanggil, list di-refresh', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);
  dom.getElementById('investTxQty').value = '10';
  dom.getElementById('investTxPrice').value = '5000';
  ctx.InvestmentTxUI.save();
  const txId = D.investmentTx[0].id;

  await ctx.InvestmentTxUI.deleteTx(txId);

  assert.equal(D.investmentTx.length, 0);
  assert.equal(h.unit, 0, 'unit dihitung ulang jadi 0 setelah satu-satunya transaksi beli dihapus');
  assert.match(ctx.calls.toast.at(-1), /dihapus/);
});

test('[InvestmentTxUI.deleteTx] confirm false -> TIDAK menghapus', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, { askConfirm: async () => false });
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);
  dom.getElementById('investTxQty').value = '10';
  dom.getElementById('investTxPrice').value = '5000';
  ctx.InvestmentTxUI.save();
  const txId = D.investmentTx[0].id;

  await ctx.InvestmentTxUI.deleteTx(txId);

  assert.equal(D.investmentTx.length, 1, 'transaksi tidak boleh terhapus kalau konfirmasi dibatalkan');
});

// ============================================================
// InvestmentWatchUI
// ============================================================

test('[InvestmentWatchUI.render] kosong -> empty-state', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentWatchUI.render();

  assert.match(dom.getElementById('investmentWatchlist').innerHTML, /Belum ada instrumen dipantau/);
});

test('[InvestmentWatchUI.render] item dgn lastPrice<=targetPrice -> badge "Target tercapai" muncul; yang belum kena tidak', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4000, targetPrice: 4200 });
  ctx.Investment.addWatch({ name: 'TLKM', type: 'Saham', lastPrice: 3500, targetPrice: 3000 });

  ctx.InvestmentWatchUI.render();

  const html = dom.getElementById('investmentWatchlist').innerHTML;
  assert.match(html, /BBRI[\s\S]*Target tercapai/);
  const tlkmSection = html.split('TLKM')[1] || '';
  assert.doesNotMatch(tlkmSection.split('</div>')[0], /Target tercapai/);
});

test('[InvestmentWatchUI.openModal] mode Tambah (id kosong) -> form kosong, tombol Hapus disembunyikan', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentWatchUI.openModal();

  assert.equal(ctx.InvestmentWatchUI.editId, null);
  assert.equal(dom.getElementById('watchName').value, '');
  assert.equal(dom.getElementById('investmentWatchDeleteBtn').classList.contains('u-dnone'), true);
  assert.deepEqual(ctx.calls.openModal, ['investmentWatchModal']);
});

test('[InvestmentWatchUI.openModal] mode Edit -> prefill dari item watchlist, tombol Hapus tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const w = ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4000, targetPrice: 4200, notes: 'incar dividen' });

  ctx.InvestmentWatchUI.openModal(w.id);

  assert.equal(ctx.InvestmentWatchUI.editId, w.id);
  assert.equal(dom.getElementById('watchName').value, 'BBRI');
  assert.equal(dom.getElementById('watchLastPrice').value, 4000);
  assert.equal(dom.getElementById('investmentWatchDeleteBtn').classList.contains('u-dnone'), false);
});

test('[InvestmentWatchUI.save] mode Tambah -> Investment.addWatch dipanggil, modal ditutup, list di-refresh', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentWatchUI.openModal();

  dom.getElementById('watchName').value = 'ANTM';
  dom.getElementById('watchJenis').value = 'Saham';
  dom.getElementById('watchLastPrice').value = '2000';
  dom.getElementById('watchTargetPrice').value = '1800';
  ctx.InvestmentWatchUI.save();

  assert.equal(D.investmentWatchlist.length, 1);
  assert.equal(D.investmentWatchlist[0].name, 'ANTM');
  assert.deepEqual(ctx.calls.closeModal, ['investmentWatchModal']);
  assert.match(ctx.calls.toast.at(-1), /tersimpan/);
});

test('[InvestmentWatchUI.save] mode Edit -> Investment.updateWatch dipanggil, tidak menambah item baru', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const w = ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4000, targetPrice: 4200 });
  ctx.InvestmentWatchUI.openModal(w.id);

  dom.getElementById('watchLastPrice').value = '3900';
  ctx.InvestmentWatchUI.save();

  assert.equal(D.investmentWatchlist.length, 1, 'edit tidak boleh menambah item baru');
  assert.equal(w.lastPrice, 3900);
});

test('[InvestmentWatchUI.save] nama kosong -> toast error dari Investment.addWatch, TIDAK menambah', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentWatchUI.openModal();

  dom.getElementById('watchName').value = '';
  ctx.InvestmentWatchUI.save();

  assert.equal(D.investmentWatchlist.length, 0);
  assert.match(ctx.calls.toast.at(-1), /wajib diisi/);
});

test('[InvestmentWatchUI.deleteFromModal] editId terisi & confirm true -> Investment.removeWatch dipanggil', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const w = ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4000, targetPrice: 4200 });
  ctx.InvestmentWatchUI.editId = w.id;

  await ctx.InvestmentWatchUI.deleteFromModal();

  assert.equal(D.investmentWatchlist.length, 0);
  assert.equal(ctx.InvestmentWatchUI.editId, null);
  assert.deepEqual(ctx.calls.closeModal, ['investmentWatchModal']);
});

test('[InvestmentWatchUI.deleteFromModal] editId null -> tidak melakukan apa-apa', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4000, targetPrice: 4200 });
  ctx.InvestmentWatchUI.editId = null;

  await ctx.InvestmentWatchUI.deleteFromModal();

  assert.equal(D.investmentWatchlist.length, 1);
});

// ============================================================
// Integrasi: InvestmentListUI.render() ikut me-refresh InvestmentWatchUI (SSOT, lihat
// komentar header investasi-list-view.js)
// ============================================================

test('[InvestmentListUI.render] ikut memanggil InvestmentWatchUI.render() (watchlist ikut ter-refresh dari 1 entry point)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4000, targetPrice: 4200 });

  ctx.InvestmentListUI.render();

  assert.match(dom.getElementById('investmentWatchlist').innerHTML, /BBRI/);
});
