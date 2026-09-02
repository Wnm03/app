'use strict';
// tests/s483-investment-tx-akun-sumber-dana.test.js — Test BARU untuk fitur "Akun Sumber
// Dana" (opsional) di form Beli/Jual investasi (investmentTxModal), Sesi 483. Saran fitur:
// tambah field opsional "Akun Sumber Dana" di investmentTxModal, pola SAMA seperti
// BBM/Renov yang sudah auto-sinkron ke transaksi -- supaya alur "titipan masuk -> sebagian
// ke investasi, sebagian ke renov" jadi 1 jalur tercatat penuh, tanpa langkah manual ganda.
//
// Pola & harness SAMA PERSIS tests/investment-tx-watch-ui-s467.test.js: dijalankan lewat
// source ASLI (loadSource()) dgn DOM tiruan STATEFUL. Backend REUSE: Investment.addTransaction()
// /deleteTransaction() (modules/asset/investasi.js) diperluas dgn parameter opsional
// `accountId` -- pola SAMA PERSIS Renov.saveItem()/togglePaid() (renovItemAcc ->
// D.transactions.push, linkedTxId/investmentTxLinkId sbg penanda 2 arah).

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

function makeD(extra = {}) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], transactions: [], accounts: [], ...extra };
}

function makeCtx(D, dom, overrides = {}) {
  const calls = {
    openModal: [], closeModal: [], toast: [],
    renderKekayaanBersih: 0, hitungZakatMaal: 0, renderKeuangan: 0, renderDashboard: 0,
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
      renderKeuangan: () => { calls.renderKeuangan += 1; },
      renderDashboard: () => { calls.renderDashboard += 1; },
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
// Investment.addTransaction()/deleteTransaction() — accountId (domain layer)
// ============================================================

test('[Investment.addTransaction] beli + accountId valid -> bikin 1 transaksi expense tertaut di D.transactions, tx.linkedTxId terisi', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA', emoji: '🏦' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);

  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-08-01', qty: 10, price: 5000, fee: 1000, accountId: 'acc1' });

  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].type, 'expense');
  assert.equal(D.transactions[0].amount, 10 * 5000 + 1000);
  assert.equal(D.transactions[0].accountId, 'acc1');
  assert.equal(D.transactions[0].investmentTxLinkId, tx.id);
  assert.equal(tx.linkedTxId, D.transactions[0].id);
});

test('[Investment.addTransaction] jual + accountId valid -> bikin 1 transaksi income tertaut, amount dikurangi fee', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA', emoji: '🏦' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx, { unit: 10, avgPrice: 1000 });

  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'jual', date: '2026-08-01', qty: 5, price: 2000, fee: 500, accountId: 'acc1' });

  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].type, 'income');
  assert.equal(D.transactions[0].amount, 5 * 2000 - 500);
  assert.equal(tx.linkedTxId, D.transactions[0].id);
});

test('[Investment.addTransaction] tanpa accountId (default lama) -> TIDAK bikin transaksi Keuangan, 0 regresi', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);

  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-08-01', qty: 10, price: 5000 });

  assert.equal(D.transactions.length, 0);
  assert.equal(tx.linkedTxId, null);
  assert.equal(h.unit, 10, 'behavior lama tetap jalan persis (unit ter-update)');
});

test('[Investment.addTransaction] accountId tidak valid (akun tidak ada) -> diabaikan, tidak error, tidak bikin transaksi', () => {
  const D = makeD({ accounts: [] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);

  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-08-01', qty: 10, price: 5000, accountId: 'acc-hilang' });

  assert.equal(D.transactions.length, 0);
  assert.equal(tx.linkedTxId, null);
});

test('[Investment.addTransaction] dividen + accountId -> TIDAK disinkron (di luar scope Beli/Jual)', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx, { unit: 10, avgPrice: 1000 });

  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'dividen', date: '2026-08-01', amount: 100000, accountId: 'acc1' });

  assert.equal(D.transactions.length, 0);
  assert.equal(tx.linkedTxId, null);
});

test('[Investment.deleteTransaction] tx dgn linkedTxId -> transaksi Keuangan tertaut ikut terhapus', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-08-01', qty: 10, price: 5000, accountId: 'acc1' });
  assert.equal(D.transactions.length, 1);

  ctx.Investment.deleteTransaction(tx.id);

  assert.equal(D.investmentTx.length, 0);
  assert.equal(D.transactions.length, 0, 'transaksi Keuangan tertaut ikut terhapus');
});

test('[Investment.deleteTransaction] tx tanpa linkedTxId -> transaksi Keuangan lain TIDAK terganggu', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }], transactions: [{ id: 'existing', type: 'expense', amount: 1000 }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  const tx = ctx.Investment.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-08-01', qty: 10, price: 5000 });

  ctx.Investment.deleteTransaction(tx.id);

  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].id, 'existing');
});

// ============================================================
// InvestmentTxUI — UI layer
// ============================================================

test('[InvestmentTxUI.open] mengisi dropdown investTxAcc dari D.accounts, opsi pertama "Tidak disinkronkan"', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA', emoji: '🏦' }, { id: 'acc2', name: 'Gopay', emoji: '📱' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);

  ctx.InvestmentTxUI.open(h.id);

  const html = dom.getElementById('investTxAcc').innerHTML;
  assert.match(html, /Tidak disinkronkan/);
  assert.match(html, /BCA/);
  assert.match(html, /Gopay/);
});

test('[InvestmentTxUI._resetForm] investTxAcc SELALU direset ke "" (opsional, bukan default akun pertama)', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);
  dom.getElementById('investTxAcc').value = 'acc1';

  ctx.InvestmentTxUI._resetForm();

  assert.equal(dom.getElementById('investTxAcc').value, '');
});

test('[InvestmentTxUI.save] accountId dipilih -> Investment.addTransaction menerima accountId, renderKeuangan/renderDashboard ikut jalan, toast menyebut tersinkron', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);

  dom.getElementById('investTxDate').value = '2026-08-01';
  dom.getElementById('investTxQty').value = '10';
  dom.getElementById('investTxPrice').value = '5000';
  dom.getElementById('investTxAcc').value = 'acc1';
  ctx.InvestmentTxUI.save();

  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].accountId, 'acc1');
  assert.equal(ctx.calls.renderKeuangan, 1);
  assert.equal(ctx.calls.renderDashboard, 1);
  assert.match(ctx.calls.toast.at(-1), /tersinkron ke Keuangan/);
});

test('[InvestmentTxUI.save] accountId dibiarkan kosong (default) -> TIDAK ada transaksi Keuangan dibuat, renderKeuangan TIDAK dipanggil', () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);

  dom.getElementById('investTxDate').value = '2026-08-01';
  dom.getElementById('investTxQty').value = '10';
  dom.getElementById('investTxPrice').value = '5000';
  ctx.InvestmentTxUI.save();

  assert.equal(D.transactions.length, 0);
  assert.equal(ctx.calls.renderKeuangan, 0);
  assert.equal(ctx.calls.renderDashboard, 0);
  assert.doesNotMatch(ctx.calls.toast.at(-1), /tersinkron/);
});

test('[InvestmentTxUI.deleteTx] hapus tx yang tersinkron -> pesan konfirmasi menyebut transaksi Keuangan ikut terhapus, renderKeuangan/renderDashboard dipanggil', async () => {
  const D = makeD({ accounts: [{ id: 'acc1', name: 'BCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = addHolding(ctx);
  ctx.InvestmentTxUI.open(h.id);
  dom.getElementById('investTxDate').value = '2026-08-01';
  dom.getElementById('investTxQty').value = '10';
  dom.getElementById('investTxPrice').value = '5000';
  dom.getElementById('investTxAcc').value = 'acc1';
  ctx.InvestmentTxUI.save();
  const txId = D.investmentTx[0].id;

  await ctx.InvestmentTxUI.deleteTx(txId);

  assert.match(ctx.calls.askConfirmArgs[0], /transaksi Keuangan yang tersinkron ikut terhapus/);
  assert.equal(D.transactions.length, 0);
  assert.equal(ctx.calls.renderKeuangan, 2, 'sekali dari save(), sekali dari deleteTx()');
  assert.equal(ctx.calls.renderDashboard, 2);
});
