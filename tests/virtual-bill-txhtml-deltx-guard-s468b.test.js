'use strict';
// tests/virtual-bill-txhtml-deltx-guard-s468b.test.js — cakupan sesi s468b
// dari s468-PLAN-virtual-bill-item-tx-list.md: branch txHTML() untuk item
// virtual (id berprefix 'vbill_', dari generateVirtualBillItemsForMonth())
// + guard defense-in-depth di baris pertama delTx(). Pola makeCtx sama
// tests/tx-transfer-audit-s432.test.js (loadSource file source asli).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, extra) {
  const toastMessages = [];
  const confirmCalls = [];
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        getAllCats: () => [{ name: 'Tagihan', emoji: '🧾' }],
        fmt: (n) => 'Rp ' + Math.round(n || 0),
        toast: (msg) => { toastMessages.push(msg); },
        askConfirm: async (msg) => { confirmCalls.push(msg); return true; },
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
  ctx.toastMessages = toastMessages;
  ctx.confirmCalls = confirmCalls;
  return ctx;
}

function makeD() {
  return { accounts: [], transactions: [], products: [], cobek: [] };
}

test('txHTML() — item virtual (prefix vbill_) render badge "⏳ Terjadwal", data-action openBillModal dgn billId asli', () => {
  const ctx = makeCtx(makeD());
  const vItem = { id: 'vbill_b1_202608', billId: 'b1', virtual: true, name: 'Listrik', category: 'Tagihan', amount: 150000, date: '2026-08-05' };
  const html = ctx.txHTML(vItem);
  assert.match(html, /⏳ Terjadwal/);
  assert.match(html, /data-action="openBillModal"/);
  assert.match(html, /data-args="\[&quot;b1&quot;\]"|data-args='\["b1"\]'|b1/);
  assert.doesNotMatch(html, /data-action="delTx"/, 'kartu virtual tidak boleh punya tombol delTx');
  assert.doesNotMatch(html, /data-action="editTx"/, 'kartu virtual tidak boleh routing ke editTx');
});

test('txHTML() — transaksi asli (tanpa flag virtual) tetap render seperti biasa (0 regresi)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 'tx1', type: 'expense', category: 'Tagihan', amount: 150000, date: '2026-08-05', accountId: null };
  const html = ctx.txHTML(t);
  assert.match(html, /data-action="editTx"/);
  assert.match(html, /data-action="delTx"/);
  assert.doesNotMatch(html, /⏳ Terjadwal/);
});

test('delTx() — id virtual (prefix vbill_) ditolak SEBELUM askConfirm dipanggil, toast peringatan muncul', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.delTx('vbill_b1_202608');
  assert.equal(ctx.confirmCalls.length, 0, 'askConfirm TIDAK BOLEH terpanggil untuk id virtual');
  assert.match(ctx.toastMessages.join(' '), /belum dibayar/i);
});

test('delTx() — id transaksi asli tetap berjalan normal lewat askConfirm (0 regresi)', async () => {
  const D = makeD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 10000, accountId: null, date: '2026-08-05' });
  const ctx = makeCtx(D);
  await ctx.delTx('tx1');
  assert.equal(ctx.confirmCalls.length, 1, 'askConfirm harus tetap terpanggil utk id asli');
  assert.equal(D.transactions.length, 0, 'transaksi asli tetap terhapus normal');
});
