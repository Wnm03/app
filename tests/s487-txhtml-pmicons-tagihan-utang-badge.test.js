'use strict';
// tests/s487-txhtml-pmicons-tagihan-utang-badge.test.js — cakupan FIX
// BUG-004 (TODO.md, "Bill/Piutang/Debt — dari Sesi Audit 2026-08-01"):
// `pmIcons` di txHTML() (modules/finance/tx-list-cashflow.js) sebelumnya
// cuma punya {cicilan, langganan, tunai} — payMethod 'tagihan'/'utang'
// (dihasilkan markBillPaid(), payMethod:b.kind, lihat
// modules/finance/tagihan-kalender.js) jatuh ke ikon kosong. Dropdown
// filter #kfMethod (index.html) sudah lebih dulu punya opsi 🧾 Tagihan/
// 📕 Utang -- fix ini menyamakan ikon badge kartu transaksi dgn ikon yang
// SUDAH dipakai di dropdown itu (0 ikon baru diciptakan). Pola makeCtx
// sama tests/virtual-bill-txhtml-deltx-guard-s468b.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, extra) {
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        getAllCats: () => [{ name: 'Tagihan', emoji: '🧾' }, { name: 'Cicilan', emoji: '💳' }],
        fmt: (n) => 'Rp ' + Math.round(n || 0),
        toast: () => {},
        askConfirm: async () => true,
        save: () => {},
        renderKeuangan: () => {},
        renderDashboard: () => {},
        renderCnTab: () => {},
        renderProductList: () => {},
        renderStockList: () => {},
        renderShop: () => {},
        renderShopRecent: () => {},
        populateKeuFilters: () => {},
        openBillModal: () => {},
      },
      extra || {},
    ),
    [],
  );
  return ctx;
}

function makeD() {
  return { accounts: [{ id: 'a1', name: 'Kas', emoji: '💵' }], transactions: [], products: [], cobek: [] };
}

test('txHTML() — payMethod "tagihan" render badge dgn ikon 🧾 (bukan kosong)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't1', type: 'expense', amount: 150000, category: 'Tagihan', date: '2026-08-05', payMethod: 'tagihan', accountId: 'a1' };
  const html = ctx.txHTML(t);
  assert.match(html, /acc-chip">🧾 tagihan/);
});

test('txHTML() — payMethod "utang" render badge dgn ikon 📕 (bukan kosong)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't2', type: 'expense', amount: 200000, category: 'Utang', date: '2026-08-05', payMethod: 'utang', accountId: 'a1' };
  const html = ctx.txHTML(t);
  assert.match(html, /acc-chip">📕 utang/);
});

test('txHTML() — payMethod "cicilan"/"langganan" tetap 💳/🔁 (regresi, ikon lama tidak berubah)', () => {
  const ctx = makeCtx(makeD());
  const tCicilan = { id: 't3', type: 'expense', amount: 100000, category: 'Cicilan', date: '2026-08-05', payMethod: 'cicilan', accountId: 'a1' };
  const tLangganan = { id: 't4', type: 'expense', amount: 50000, category: 'Cicilan', date: '2026-08-05', payMethod: 'langganan', accountId: 'a1' };
  assert.match(ctx.txHTML(tCicilan), /acc-chip">💳 cicilan/);
  assert.match(ctx.txHTML(tLangganan), /acc-chip">🔁 langganan/);
});

test('txHTML() — payMethod "tunai" tetap tidak menampilkan badge payMethod (regresi, beda dgn badge nama akun yg tetap ada)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't5', type: 'expense', amount: 30000, category: 'Makan', date: '2026-08-05', payMethod: 'tunai', accountId: 'a1' };
  assert.doesNotMatch(ctx.txHTML(t), /acc-chip">[^<]*tunai/);
});

test('txHTML() — payMethod kosong/undefined tidak error & tidak menampilkan badge payMethod (regresi)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't6', type: 'expense', amount: 30000, category: 'Makan', date: '2026-08-05', accountId: 'a1' };
  assert.doesNotThrow(() => ctx.txHTML(t));
  assert.doesNotMatch(ctx.txHTML(t), /acc-chip">[^<]*undefined/);
});

test('txHTML() — payMethod tidak dikenal (kind masa depan/typo) fallback ikon kosong, bukan crash (regresi guard ||"")', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't7', type: 'expense', amount: 30000, category: 'Makan', date: '2026-08-05', payMethod: 'entahApa', accountId: 'a1' };
  const html = ctx.txHTML(t);
  assert.match(html, /acc-chip"> entahApa/);
});
