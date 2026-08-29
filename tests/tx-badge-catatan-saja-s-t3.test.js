'use strict';
// tests/tx-badge-catatan-saja-s-t3.test.js — Sesi T3 (RENCANA-KERJA-toggle-hitungkas-dan-
// proyeksi-kas.md Track 1, lanjutan Sesi T1 akun.js + Sesi T2 modules-render.js). Cakupan:
// badge "📝 Catatan saja" di txHTML() (modules/finance/tx-list-cashflow.js) utk transaksi
// t.hitungKas===false, + skenario gabungan T1(saldo akun)+T2(dashboard inc/exp)+T3(badge)
// dari 1 objek D yang sama supaya benar2 saling konsisten (bukan cuma masing2 lolos sendiri).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, extractFunction } = require('./helpers/loadSource');

function makeCtx(D, extra) {
  return loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        getAllCats: () => [{ name: 'Gaji', emoji: '💼' }, { name: 'Makan', emoji: '🍚' }],
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
      extra || {}
    ),
    []
  );
}

function makeD() {
  return { accounts: [{ id: 'a1', name: 'Kas', emoji: '💵' }], transactions: [], products: [], cobek: [] };
}

// ---- Badge txHTML() ----

test('txHTML() — hitungKas:false render badge "📝 Catatan saja"', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't1', type: 'expense', amount: 20000, category: 'Makan', date: '2026-08-05', accountId: 'a1', hitungKas: false };
  const html = ctx.txHTML(t);
  assert.match(html, /acc-chip">📝 Catatan saja/);
});

test('txHTML() — hitungKas absen (backward-compat) -> TIDAK ada badge sama sekali', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't2', type: 'expense', amount: 20000, category: 'Makan', date: '2026-08-05', accountId: 'a1' };
  const html = ctx.txHTML(t);
  assert.doesNotMatch(html, /Catatan saja/);
});

test('txHTML() — hitungKas:true eksplisit -> TIDAK ada badge', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't3', type: 'income', amount: 500000, category: 'Gaji', date: '2026-08-05', accountId: 'a1', hitungKas: true };
  const html = ctx.txHTML(t);
  assert.doesNotMatch(html, /Catatan saja/);
});

test('txHTML() — badge muncul BERBARENGAN dgn badge lain (mis. pmBadge) tanpa saling menimpa', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't4', type: 'expense', amount: 200000, category: 'Makan', date: '2026-08-05', accountId: 'a1', payMethod: 'tagihan', hitungKas: false };
  const html = ctx.txHTML(t);
  assert.match(html, /Catatan saja/);
  assert.match(html, /🧾 tagihan/);
});

// ---- Skenario gabungan T1 (akun.js) + T2 (modules-render.js) + T3 (tx-list-cashflow.js) ----
// Dari 1 objek D yang sama: transaksi hitungKas:false harus KONSISTEN di-skip dari saldo akun
// (T1) DAN Pemasukan/Pengeluaran Dashboard (T2), SEKALIGUS tetap muncul di Riwayat Transaksi
// dgn badge "📝 Catatan saja" (T3) -- bukan hilang dari tampilan, cuma tidak ikut dihitung.

test('Skenario gabungan T1+T2+T3 — transaksi hitungKas:false: skip saldo akun (T1), skip dashboard inc/exp (T2), TAPI tetap tampil di Riwayat dgn badge (T3)', () => {
  const D = {
    accounts: [{ id: 'a1', name: 'Kas', baseBalance: 100000, includeInBalance: true }],
    transactions: [
      { id: 'tx1', accountId: 'a1', type: 'income', amount: 500000, category: 'Gaji', date: '2026-08-05' }, // normal, dihitung
      { id: 'tx2', accountId: 'a1', type: 'expense', amount: 30000, category: 'Makan', date: '2026-08-06', hitungKas: false }, // catatan saja
    ],
    assets: [],
  };

  // T1: recalcAccBalance() skip tx2
  const akunCtx = loadSource(['modules/finance/akun.js'], { D }, ['_accBalCache', '_totalSaldoCache']);
  assert.equal(akunCtx.recalcAccBalance('a1'), 600000, '100000+500000, tx2 (hitungKas:false) diabaikan dari saldo');

  // T2: _dashMonthlyIncExp() skip tx2 dari exp
  const dashInc = extractFunction('modules/shared/modules-render-b.js', '_dashMonthlyIncExp');
  const rInc = dashInc(D.transactions);
  assert.equal(rInc.inc, 500000);
  assert.equal(rInc.exp, 0, 'tx2 (hitungKas:false) tidak ikut Pengeluaran Dashboard');

  // T3: txHTML() tx2 TETAP muncul di Riwayat, dgn badge "Catatan saja"
  const txCtx = makeCtx(D);
  const htmlTx2 = txCtx.txHTML(D.transactions[1]);
  assert.match(htmlTx2, /Catatan saja/, 'tx2 tetap tampil di Riwayat (bukan disembunyikan), dgn badge penanda');
  const htmlTx1 = txCtx.txHTML(D.transactions[0]);
  assert.doesNotMatch(htmlTx1, /Catatan saja/, 'tx1 (transaksi normal) tidak dapat badge');
});
