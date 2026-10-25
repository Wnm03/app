'use strict';
// S2726 — uji PERILAKU (bukan cek statis) untuk: pelunasan piutang Shop -> pemasukan kas, refId riwayat stok,
// diskon efektif Kasir/Order, rollback checkout Kasir bila sinkron pembayaran gagal.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEnv(extra) {
  let n = 0;
  const D = {
    accounts: [{ id: 'acc1', name: 'Kas', emoji: '💵', balance: 0 }],
    products: [{ id: 'p1', name: 'Cobek 20', stock: 10, hargaBeli: 5000, hargaJual: 10000 }],
    transactions: [], cobek: [], piutang: [], debts: [],
    categories: { income: [], expense: [] },
  };
  const toasts = [];
  const globals = Object.assign({
    D, uid: () => 'id' + (++n), todayStr: () => '2026-10-25',
    save: () => true, toast: (m) => toasts.push(String(m)),
  }, extra || {});
  return { D, toasts, globals };
}

function loadShop(env) {
  return loadSource(
    ['modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-order.js'],
    env.globals,
    ['rollbackShopItems', 'recordShopReceivablePayoff', 'reverseShopReceivablePayoff', 'syncShopSalePayment', 'BillDebtPiutangCanonicalWriter', 'FinanceTxSOT'],
  );
}

test('S2726 payoff: pelunasan piutang Shop mencatat pemasukan sebesar sisa ke akun order, idempoten', () => {
  const env = makeEnv();
  const c = loadShop(env);
  const { D } = env;
  D.cobek.push({ id: 's1', accountId: 'acc1', customer: { name: 'Budi' }, piutangLinkId: 'pt1', txLinkId: 'tx1', total: 100000 });
  const pt = { id: 'pt1', name: 'Budi', nilai: 80000, lunas: false };
  D.piutang.push(pt);
  const r = c.recordShopReceivablePayoff(pt);
  assert.equal(r.ok, true);
  assert.equal(D.transactions.length, 1);
  const tx = D.transactions[0];
  assert.equal(tx.type, 'income');
  assert.equal(tx.amount, 80000);
  assert.equal(tx.accountId, 'acc1');
  assert.ok(!tx.cobekLinkId, 'tidak boleh memakai cobekLinkId (cascade hapus penjualan)');
  pt.linkedPayoffTxId = r.txId;
  const r2 = c.recordShopReceivablePayoff(pt);
  assert.equal(r2.skipped, true);
  assert.equal(D.transactions.length, 1, 'panggilan ulang tidak membuat pemasukan ganda');
});

test('S2726 payoff: piutang non-Shop dilewati; akun hilang -> gagal tanpa transaksi', () => {
  const env = makeEnv();
  const c = loadShop(env);
  const { D } = env;
  const manual = { id: 'ptX', name: 'Teman', nilai: 5000 };
  assert.equal(c.recordShopReceivablePayoff(manual).skipped, true);
  D.cobek.push({ id: 's2', accountId: 'hilang', piutangLinkId: 'pt2' });
  const pt = { id: 'pt2', name: 'Ani', nilai: 5000 };
  const r = c.recordShopReceivablePayoff(pt);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'ACCOUNT_MISSING');
  assert.equal(D.transactions.length, 0);
});

test('S2726 payoff: reverse membatalkan pemasukan pelunasan', () => {
  const env = makeEnv();
  const c = loadShop(env);
  const { D } = env;
  D.cobek.push({ id: 's3', accountId: 'acc1', piutangLinkId: 'pt3' });
  const pt = { id: 'pt3', name: 'Cici', nilai: 20000 };
  const r = c.recordShopReceivablePayoff(pt);
  pt.linkedPayoffTxId = r.txId;
  assert.equal(c.reverseShopReceivablePayoff(pt), true);
  assert.equal(D.transactions.length, 0);
  assert.equal(pt.linkedPayoffTxId, null);
});

test('S2726 payoff: edit order yang sudah lunas membuka piutang lagi & membatalkan pemasukan pelunasan', () => {
  const env = makeEnv();
  const c = loadShop(env);
  const { D } = env;
  D.cobek.push({ id: 's4', accountId: 'acc1', customer: { name: 'Dedi' }, txLinkId: 'tx4' });
  const a = c.syncShopSalePayment({ shopId: 's4', txId: 'tx4', dpRaw: '20000', total: 100000, accountId: 'acc1', customerName: 'Dedi', date: '2026-10-25', itemSummary: 'x' });
  assert.equal(a.ok, true);
  const pt = D.piutang[0];
  assert.equal(pt.nilai, 80000);
  const pay = c.recordShopReceivablePayoff(pt);
  pt.lunas = true; pt.linkedPayoffTxId = pay.txId;
  assert.equal(D.transactions.length, 2);
  const b = c.syncShopSalePayment({ shopId: 's4', txId: 'tx4', existingTxId: 'tx4', existingPiutangId: pt.id, dpRaw: '30000', total: 100000, accountId: 'acc1', customerName: 'Dedi', date: '2026-10-25', itemSummary: 'x' });
  assert.equal(b.ok, true);
  assert.equal(D.transactions.length, 1, 'pemasukan pelunasan lama dibatalkan');
  assert.equal(D.piutang[0].lunas, false);
  assert.equal(D.piutang[0].nilai, 70000);
});

test('S2726 refId: rollbackShopItems meneruskan refId ke riwayat stok (bukan opts di luar scope)', () => {
  const calls = [];
  const env = makeEnv({ Etalase: { bundleAddonShape: () => null, bracketRange: () => '' }, ProductRepository: { mutateStockDelta: (p, d, meta) => { calls.push({ d, meta }); p.stock += d; } } });
  const c = loadShop(env);
  c.rollbackShopItems([{ productId: 'p1', qty: 3 }], 1, 'TX-77');
  assert.equal(calls.length >= 1, true);
  assert.equal(calls[0].meta.refId, 'TX-77');
  assert.equal(env.D.products[0].stock, 13);
  c.rollbackShopItems([{ productId: 'p1', qty: 3 }], 1);
  assert.equal(calls[calls.length - 1].meta.refId, '', 'tanpa refId tetap string kosong, tidak crash');
});

function kasirEnv(fields, extra) {
  const env = makeEnv(Object.assign({
    Etalase: { bundleAddonShape: () => null, bracketRange: () => '' },
    withSaveGuard: (_a, _b, fn) => fn(),
    renderProductList: () => {}, renderShopRecent: () => {}, renderShop: () => {}, renderDashboard: () => {}, syncPiutangFinanceViews: () => {},
    document: { getElementById: (id) => (id in fields ? { value: fields[id], checked: true, options: [], innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} } } : null), querySelector: () => null, querySelectorAll: () => [] },
  }, extra || {}));
  return env;
}
function loadKasir(env) {
  return loadSource(
    ['modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-order.js', 'modules/business/kasir.js'],
    env.globals,
    ['Kasir', 'rollbackShopItems'],
  );
}

test('S2726 diskon: Kasir menyediakan diskonEfektif untuk disimpan (negatif -> 0, berlebih -> subtotal)', () => {
  for (const [raw, expected] of [['-50000', 0], ['999999', 20000], ['5000', 5000]]) {
    const env = kasirEnv({ kasirDiskon: raw, kasirOngkir: '0' });
    const c = loadKasir(env);
    c.Kasir.cart = [{ productId: 'p1', qty: 2 }];
    c.Kasir.priceType = 'jual';
    const t = c.Kasir.computeTotals();
    assert.equal(t.subtotal, 20000);
    assert.equal(t.diskon, Number(raw), 'diskon mentah tetap dikembalikan (kontrak B9)');
    assert.equal(t.diskonEfektif, expected);
    assert.equal(t.total, 20000 - expected);
  }
});

test('S2726 checkout Kasir: sinkron pembayaran gagal -> stok pulih, tanpa baris yatim, keranjang tetap', () => {
  // Paksa kegagalan sinkron pembayaran: FinanceTxSOT.create melempar SETELAH stok terpotong & baris D.cobek dibuat.
  const env = kasirEnv({ kasirDiskon: '', kasirOngkir: '', kasirDP: '', kasirAcc: 'acc1' }, { FinanceTxSOT: { create() { throw new Error('boom'); }, removeById() {}, findById: () => null }, renderSiapPulang: () => {} });
  const c = loadKasir(env);
  const { D } = env;
  c.Kasir.cart = [{ productId: 'p1', qty: 4 }];
  c.Kasir.priceType = 'jual';
  try { c.Kasir._checkoutInner(); } catch (e) { assert.fail('checkout tidak boleh melempar: ' + e.message); }
  assert.equal(D.products[0].stock, 10, 'stok kembali penuh');
  assert.equal(D.cobek.length, 0, 'tidak ada penjualan yatim');
  assert.equal(D.transactions.length, 0);
  assert.equal(c.Kasir.cart.length, 1, 'keranjang tetap untuk dicoba ulang');
  assert.ok(env.toasts.some(m => /dibatalkan/.test(m)), 'pengguna diberi tahu penjualan dibatalkan');
});

test('S2726 checkout Kasir sukses: record menyimpan diskon efektif (0), bukan -50000', () => {
  const env = kasirEnv({ kasirDiskon: '-50000', kasirOngkir: '-9000', kasirDP: '', kasirAcc: 'acc1' }, {
    FinanceTxSOT: { create(t) { env.D.transactions.push(t); return t; }, removeById() {}, findById: () => null },
    renderSiapPulang: () => {}, escapeHtml: (x) => String(x), fmt: (n) => String(n), fmtFull: (n) => String(n),
  });
  const c = loadKasir(env);
  c.Kasir.cart = [{ productId: 'p1', qty: 2 }];
  c.Kasir.priceType = 'jual';
  c.Kasir.reset = () => {}; // reset UI menyentuh banyak elemen DOM; yang diuji adalah record tersimpan
  c.Kasir._checkoutInner();
  assert.equal(env.D.cobek.length, 1);
  assert.equal(env.D.cobek[0].diskon, 0);
  assert.equal(env.D.cobek[0].ongkir, 0);
  assert.equal(env.D.cobek[0].total, 20000);
  assert.equal(env.D.products[0].stock, 8);
  assert.equal(env.D.transactions[0].amount, 20000);
});

test('S2726 hapus pembelian stok: produk berstok 0 diberi tahu tetap ada; stok terjual sebagian diberi peringatan', () => {
  const env = makeEnv({ renderStockList() {}, renderShop() {}, renderShopRecent() {} });
  const c = loadSource(['modules/finance/tx-list-cashflow.js'], env.globals, ['runTxDeleteCascades']);
  env.D.products = [{ id: 'p1', name: 'Cobek Baru', stock: 6 }];
  c.runTxDeleteCascades({ id: 't1', stockItems: [{ productId: 'p1', qty: 10 }] });
  assert.equal(env.D.products.length, 1, 'produk tidak dihapus otomatis');
  assert.equal(env.D.products[0].stock, 0);
  assert.ok(env.toasts.some(m => /Sebagian stok sudah terjual/.test(m)));
  assert.ok(env.toasts.some(m => /tetap ada di Etalase dengan stok 0: Cobek Baru/.test(m)));
});

test('S2726 Laporan.delete: Order dgn DP + piutang + pelunasan -> stok pulih, semua transaksi & piutang bersih', async () => {
  const stub = () => {};
  const env = makeEnv({
    Etalase: { bundleAddonShape: () => null, bracketRange: () => '' },
    askConfirm: async () => true, renderShopRecent: stub, renderProductList: stub, syncPiutangFinanceViews: stub,
    ShopInsight: undefined, BusinessFlowPresenter: undefined,
  });
  const c = loadSource(['modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-order.js'], env.globals, ['Laporan', 'syncShopSalePayment', 'markShopReceivablePaid']);
  const { D } = env;
  D.products[0].stock = 6; // 10 awal, terjual 4
  D.cobek.push({ id: 's9', accountId: 'acc1', customer: { name: 'Eko' }, txLinkId: 'tx9', items: [{ productId: 'p1', qty: 4 }] });
  c.syncShopSalePayment({ shopId: 's9', txId: 'tx9', dpRaw: '10000', total: 40000, accountId: 'acc1', customerName: 'Eko', date: '2026-10-25', itemSummary: 'x' });
  assert.equal(D.transactions.length, 1);
  assert.equal(D.piutang[0].nilai, 30000);
  assert.equal(c.markShopReceivablePaid(D.piutang[0]).ok, true);
  assert.equal(D.transactions.length, 2);
  c.Laporan.render = stub;
  await c.Laporan.delete('s9');
  assert.equal(D.cobek.length, 0);
  assert.equal(D.products[0].stock, 10, 'stok kembali');
  assert.equal(D.transactions.length, 0, 'DP & pelunasan terhapus');
  assert.equal(D.piutang.length, 0);
});

// S2727 — kebijakan hapus pembelian stok: tolak bila stok sudah terjual sebagian.
test('S2727 stockPurchaseDeleteBlockers: stok < qty pembelian -> menghalangi; stok cukup -> aman', () => {
  const env = makeEnv();
  const c = loadSource(['modules/finance/tx-list-cashflow.js'], env.globals, ['stockPurchaseDeleteBlockers']);
  env.D.products = [{ id: 'p1', name: 'Cobek Baru', stock: 5 }, { id: 'p2', name: 'Ulekan', stock: 20 }];
  const blk = c.stockPurchaseDeleteBlockers({ stockItems: [{ productId: 'p1', qty: 10 }, { productId: 'p2', qty: 10 }] });
  assert.equal(blk.length, 1);
  assert.equal(blk[0].name, 'Cobek Baru');
  assert.equal(blk[0].short, 5);
  assert.equal(c.stockPurchaseDeleteBlockers({ stockItems: [{ productId: 'p2', qty: 20 }] }).length, 0, 'stok pas = aman');
  assert.equal(c.stockPurchaseDeleteBlockers({ stockProductId: 'p1', stockQty: 6 }).length, 1, 'jalur stockProductId');
  assert.equal(c.stockPurchaseDeleteBlockers({ id: 'x' }).length, 0);
  assert.equal(c.stockPurchaseDeleteBlockers(null).length, 0);
});

test('S2727 delTx: pembelian dengan stok terjual sebagian ditolak tanpa konfirmasi & tanpa mutasi', async () => {
  let asked = 0;
  const env = makeEnv({ askConfirm: async () => { asked++; return true; }, _financeMutationBlockedByStaleState: () => false });
  const c = loadSource(['modules/finance/tx-list-cashflow.js'], env.globals, ['delTx']);
  env.D.products = [{ id: 'p1', name: 'Cobek Baru', stock: 6 }];
  env.D.transactions = [{ id: 't1', type: 'expense', amount: 50000, stockItems: [{ productId: 'p1', qty: 10 }] }];
  await c.delTx('t1');
  assert.equal(asked, 0, 'ditolak sebelum dialog konfirmasi');
  assert.equal(env.D.transactions.length, 1, 'transaksi tetap ada');
  assert.equal(env.D.products[0].stock, 6, 'stok tidak berubah');
  assert.ok(env.toasts.some(m => /tidak bisa dihapus/.test(m) && /retur atau penyesuaian stok/.test(m) && /Cobek Baru/.test(m)));
});
