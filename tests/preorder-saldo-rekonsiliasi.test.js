'use strict';
// Rekonsiliasi saldo per rekening untuk pemenuhan preorder via Order (jalur nyata:
// Order._saveInner -> recordShopSale -> syncShopSalePayment -> FinanceTxSOT/BillDebtPiutangCanonicalWriter).
// Bukti yang diminta HOLD PRODUKSI: saldo akun sebelum/sesudah untuk preorder lunas dan DP/piutang.
// Batas: harness VM (bukan browser nyata).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function env({ dp = '', qty = 2, acc = 'a1' } = {}) {
  let n = 0;
  const els = {};
  const val = (id, v) => (els[id] = { value: v, innerHTML: '', style: {}, checked: true, textContent: '', classList: { toggle() {} } });
  const document = { getElementById: (id) => els[id] || null };
  const D = {
    accounts: [
      { id: 'a1', name: 'Kas', emoji: '💵', balance: 100000 },
      { id: 'a2', name: 'Bank', emoji: '🏦', balance: 500000 },
    ],
    products: [{ id: 'p1', name: 'Cobek', stock: 5, hargaBeli: 20000, hargaJual: 50000, preorder: { aktif: true, kuota: 10 } }],
    transactions: [], cobek: [], piutang: [], debts: [], preorders: [],
    categories: { income: [], expense: [] },
  };
  const toasts = [];
  const g = {
    D, document, uid: () => 'id' + (++n), todayStr: () => '2026-11-01', save: () => true,
    toast: (m) => toasts.push(String(m)), fmtFull: (n) => String(n), escapeHtml: (s) => String(s ?? ''), openModal() {}, closeModal() {},
    renderProductList() {}, renderShop() {}, renderSiapPulang() {}, withSaveGuard: (_a, _b, fn) => fn(),
    Etalase: { bundleAddonShape: () => null, bracketRange: () => null, renderModalStat() {} },
  };
  const ctx = loadSource(
    ['modules/finance/akun.js', 'modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-order.js', 'modules/shop/preorder.js'],
    g, ['Order', 'Preorder', 'recalcAccBalance', 'FinanceTxSOT'],
  );
  val('oCustName', 'Budi'); val('oCustPhone', '081'); val('oCustAddr', ''); val('oDate', '2026-11-01');
  val('oPriceType', 'jual'); val('oNote', ''); val('oDiskon', ''); val('oOngkir', ''); val('oAcc', acc); val('oDP', dp);
  els.oDelivered = { checked: true, value: '', style: {} };
  return { D, ctx, toasts, els };
}
const bal = (e, id) => { try { e.ctx.invalidateAccBalCache && e.ctx.invalidateAccBalCache(); } catch (_) { /* noop */ } return e.ctx.recalcAccBalance(id); };

function startFulfil(e, qty) {
  const r = e.ctx.Preorder.create({ productId: 'p1', qty, customer: { name: 'Budi', phone: '081' } });
  assert.ok(r.ok, 'preorder dibuat');
  e.D.products[0].stock = 5; // stok tiba
  e.ctx.Order.items = [{ productId: 'p1', qty, hargaOverride: null }];
  e.ctx.Order.editId = null; e.ctx.Order.preorderId = r.preorder.id; e.ctx.Order._preorderSubmitted = false;
  return r.preorder.id;
}

test('SALDO: membuat preorder tidak mengubah saldo akun maupun stok', () => {
  const e = env();
  const b1 = bal(e, 'a1'), b2 = bal(e, 'a2');
  e.ctx.Preorder.create({ productId: 'p1', qty: 2, customer: { name: 'Budi' } });
  assert.equal(bal(e, 'a1'), b1); assert.equal(bal(e, 'a2'), b2);
  assert.equal(e.D.transactions.length, 0);
});

test('SALDO: preorder LUNAS -> hanya akun terpilih +total, akun lain tetap, tanpa piutang', () => {
  const e = env({ dp: '', acc: 'a2' });
  const id = startFulfil(e, 2);
  const a1 = bal(e, 'a1'), a2 = bal(e, 'a2');
  e.ctx.Order._saveInner();
  const total = 2 * 50000;
  assert.equal(bal(e, 'a2') - a2, total, 'akun terpilih naik tepat total');
  assert.equal(bal(e, 'a1') - a1, 0, 'akun lain tidak berubah');
  assert.equal(e.D.piutang.length, 0);
  assert.equal(e.D.transactions.length, 1);
  assert.equal(e.D.products[0].stock, 3, 'stok berkurang tepat qty');
  assert.equal(e.ctx.Preorder._list().find((x) => x.id === id).status, 'fulfilled');
});

test('SALDO: preorder DP -> saldo +dp, piutang = sisa, saldo + piutang = total', () => {
  const e = env({ dp: '30000', acc: 'a1' });
  startFulfil(e, 2);
  const a1 = bal(e, 'a1');
  e.ctx.Order._saveInner();
  assert.equal(bal(e, 'a1') - a1, 30000);
  assert.equal(e.D.piutang.length, 1);
  assert.equal(e.D.piutang[0].nilai, 70000);
  assert.equal((bal(e, 'a1') - a1) + e.D.piutang[0].nilai, 100000);
  assert.equal(e.D.transactions.length, 1);
  assert.equal(e.D.products[0].stock, 3);
});

test('SALDO: DP melebihi total dibatasi ke total (tanpa piutang negatif/saldo berlebih)', () => {
  const e = env({ dp: '999999', acc: 'a1' });
  startFulfil(e, 2);
  const a1 = bal(e, 'a1');
  e.ctx.Order._saveInner();
  assert.equal(bal(e, 'a1') - a1, 100000);
  assert.equal(e.D.piutang.length, 0);
});

test('SALDO: submit ulang (dobel klik) tidak menambah saldo, transaksi, atau mengurangi stok lagi', () => {
  const e = env({ dp: '', acc: 'a1' });
  startFulfil(e, 2);
  e.ctx.Order._saveInner();
  const a1 = bal(e, 'a1'), stock = e.D.products[0].stock, tx = e.D.transactions.length;
  e.ctx.Order._saveInner();
  assert.equal(bal(e, 'a1'), a1); assert.equal(e.D.products[0].stock, stock); assert.equal(e.D.transactions.length, tx);
});

test('SALDO: membatalkan preorder open (belum dipenuhi) tidak menyentuh saldo', () => {
  const e = env();
  const r = e.ctx.Preorder.create({ productId: 'p1', qty: 2, customer: { name: 'Budi' } });
  const a1 = bal(e, 'a1');
  assert.ok(e.ctx.Preorder.cancel(r.preorder.id).ok);
  assert.equal(bal(e, 'a1'), a1); assert.equal(e.D.transactions.length, 0);
});

test('SALDO: pemenuhan gagal (stok tidak cukup) tidak mengubah saldo, transaksi, maupun status preorder', () => {
  const e = env({ dp: '', acc: 'a1' });
  const id = startFulfil(e, 2);
  e.D.products[0].stock = 1; // kurang dari qty
  const a1 = bal(e, 'a1');
  e.ctx.Order._saveInner();
  assert.equal(bal(e, 'a1'), a1); assert.equal(e.D.transactions.length, 0); assert.equal(e.D.piutang.length, 0);
  assert.equal(e.ctx.Preorder._list().find((x) => x.id === id).status, 'open');
});
