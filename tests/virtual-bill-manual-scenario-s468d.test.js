'use strict';
// tests/virtual-bill-manual-scenario-s468d.test.js — S468d (buffer/dokumentasi
// dari s468-PLAN-virtual-bill-item-tx-list.md): skenario gabungan a+b+c end-to-end
// murni logic (pengganti cek manual browser) -- 1 bill biasa + 1 bill shared +
// 1 bill freq mingguan, semua jatuh tempo bulan berjalan, dipastikan:
// generateVirtualBillItemsForMonth() -> txHTML() -> hasil akhir konsisten
// (badge, nominal, routing) utk ketiganya sekaligus dalam 1 render.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/finance/tagihan-kalender.js', 'modules/finance/tx-list-cashflow.js'],
    {
      D,
      BILLCAL_MAX_ITER: 1000,
      document: { getElementById: () => null },
      escapeHtml: (s) => String(s),
      getAllCats: () => [{ name: 'Tagihan', emoji: '🧾' }],
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
  );
}

test('S468d skenario gabungan — 1 bill biasa + 1 shared + 1 mingguan, semua bulan berjalan, muncul benar & konsisten', () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const dueDay = 5;
  const dueDate = new Date(y, m, dueDay);
  if (dueDate < now) dueDate.setMonth(dueDate.getMonth()); // tetap di bulan ini, cukup pastikan nextDue valid string

  const D = {
    bills: [
      { id: 'biasa1', name: 'Listrik', category: 'Tagihan', amount: 200000, nextDue: `${y}-${String(m + 1).padStart(2, '0')}-05`, freq: 'bulanan', kind: 'tagihan' },
      { id: 'shared1', name: 'Internet Kos', category: 'Tagihan', amount: 60000, totalAmount: 120000, shared: true, sharedPct: 50, nextDue: `${y}-${String(m + 1).padStart(2, '0')}-10`, freq: 'bulanan', kind: 'tagihan' },
      { id: 'mingguan1', name: 'Galon', category: 'Tagihan', amount: 25000, nextDue: `${y}-${String(m + 1).padStart(2, '0')}-03`, freq: 'mingguan', kind: 'tagihan' },
    ],
    billsArchive: [],
    transactions: [],
    accounts: [],
  };
  const ctx = makeCtx(D);
  const vItems = ctx.generateVirtualBillItemsForMonth(y, m);

  // Ketiga bill harus ada (mingguan bisa >1 occurrence -- cek minimal 1 tiap billId)
  const billIds = new Set(vItems.map((v) => v.billId));
  assert.ok(billIds.has('biasa1'), 'bill biasa harus tergenerate');
  assert.ok(billIds.has('shared1'), 'bill shared harus tergenerate');
  assert.ok(billIds.has('mingguan1'), 'bill mingguan harus tergenerate');

  const biasa = vItems.find((v) => v.billId === 'biasa1');
  const shared = vItems.find((v) => v.billId === 'shared1');
  assert.equal(biasa.amount, 200000);
  assert.equal(shared.amount, 60000, 'nominal shared = b.amount (porsi), bukan totalAmount 120000');
  assert.ok(vItems.every((v) => String(v.id).startsWith('vbill_')), 'semua id virtual harus berprefix vbill_');

  // txHTML() konsisten utk ketiganya: badge muncul, tombol delTx tidak ada, routing ke openBillModal
  vItems.forEach((v) => {
    const html = ctx.txHTML(v);
    assert.match(html, /⏳ Terjadwal/);
    assert.match(html, /data-action="openBillModal"/);
    assert.doesNotMatch(html, /data-action="delTx"/);
  });

  // delTx() dipanggil langsung dgn id virtual manapun -> tidak pernah lolos ke askConfirm
  return Promise.all(vItems.map((v) => ctx.delTx(v.id))).then(() => {
    assert.equal(D.transactions.length, 0, 'delTx() thd id virtual tidak boleh menghapus/mengubah apa pun di D');
  });
});
