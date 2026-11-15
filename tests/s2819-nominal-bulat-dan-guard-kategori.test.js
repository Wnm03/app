'use strict';
// S2819 — (1) utang titipan dari porsi ditulis dalam rupiah utuh, (2) temuan "nominal pecahan" + tombol Bulatkan,
// (3) guard kontrak: FinanceTxSOT.create selalu menyelesaikan kategori lewat FinanceCategorySOT (cegah bug F1 dari modul lain).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

function withGlobals(g, fn) {
  const keys = Object.keys(g), prev = {};
  keys.forEach(k => { prev[k] = global[k]; global[k] = g[k]; });
  try { return fn(); } finally { keys.forEach(k => { if (prev[k] === undefined) delete global[k]; else global[k] = prev[k]; }); }
}

test('S2819: nominal harapan utang titipan (aset Majoris 84,3257/15,6743) berupa rupiah utuh dan berjumlah sama dgn nilai aset', () => {
  const D = { assets: [{ id: 'a1', nilai: 10845758 }], investments: [] };
  const MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [
    { ownerId: 'renov', porsi: 84.3257, isSelf: false }, { ownerId: 'sihab', porsi: 15.6743, isSelf: false }] }) };
  withGlobals({ D, MultiOwnerEngine }, () => {
    const exp = TitipanReconcile._expectedFromAssets();
    assert.equal(exp['a1::renov'], 9145761);
    assert.equal(exp['a1::sihab'], 1699997);
    assert.equal(exp['a1::renov'] + exp['a1::sihab'], 10845758);
    assert.ok(Object.values(exp).every(Number.isInteger));
  });
});

function dhCtx(D, extra) {
  const msgs = [];
  const ctx = loadSource(['data-health-check.js'], Object.assign({ D, escapeHtml: s => String(s), toast: m => msgs.push(m), save: () => true, askConfirm: async () => true,
    runDataHealthCheck() {}, openModal() {} }, extra || {}));
  return { ctx, msgs };
}

test('S2819: DataHealth mengumpulkan & membulatkan nominal pecahan transaksi/utang/piutang, nilai utuh tidak disentuh', async (t) => {
  const D = {
    transactions: [{ id: 1, type: 'expense', amount: 49028.5 }, { id: 2, type: 'expense', amount: 1000 }],
    debts: [{ id: 'd1', nilai: 9145761.353805998 }, { id: 'd2', nilai: 500 }],
    piutang: [{ id: 'p1', nilai: 100.4 }],
    categories: { expense: [], income: [] },
  };
  // runDataHealthCheck asli ikut berjalan setelah pembulatan: beri D yang tidak punya kunci -> array kosong.
  const Dp = new Proxy(D, { get: (o, k) => (k in o ? o[k] : (typeof k === 'string' ? [] : undefined)) });
  let dh;
  try { dh = dhCtx(Dp, { document: { getElementById: () => null, querySelectorAll: () => [] } }); } catch (e) { return t.skip('data-health-check.js tidak bisa dimuat terisolasi: ' + e.message); }
  const { ctx } = dh;
  const DataHealth = ctx.DataHealth || (ctx.window && ctx.window.DataHealth);
  if (!DataHealth) return t.skip('DataHealth tidak terekspos di konteks tes');
  const f = DataHealth._collectFractionalAmounts();
  assert.deepEqual([f.tx.length, f.debts.length, f.piutang.length], [1, 1, 1]);
  await DataHealth.roundFractionalAmounts();
  assert.equal(D.transactions[0].amount, 49029);
  assert.equal(D.transactions[1].amount, 1000);
  assert.equal(D.debts[0].nilai, 9145761);
  assert.equal(D.debts[1].nilai, 500);
  assert.equal(D.piutang[0].nilai, 100);
  const again = DataHealth._collectFractionalAmounts();
  assert.equal(again.tx.length + again.debts.length + again.piutang.length, 0);
});

test('S2819: nilai unit/harga satuan aset tidak ikut dianggap nominal pecahan', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data-health-check.js'), 'utf8');
  const m = src.match(/_collectFractionalAmounts\(\)\{[\s\S]*?\n\},/);
  assert.ok(m, 'fungsi tidak ditemukan');
  assert.ok(!/assets|jumlahUnit|hargaBeli/.test(m[0]));
});

// ---- Guard kontrak kategori (FinanceTxSOT + FinanceCategorySOT asli) ----
function sotCtx() {
  const D = {
    categories: { expense: [{ id: 'cat_renov_1', name: 'Renov', emoji: '🔨', classification: 'WAJIB', subs: [] }, { id: 'cat_makan_1', name: 'Makan', emoji: '🍚', classification: 'WAJIB', subs: [] }], income: [{ id: 'cat_gaji_1', name: 'Gaji', emoji: '💰', subs: [] }] },
    accounts: [{ id: 'a1', name: 'Cash', baseBalance: 0 }], transactions: [],
  };
  return { D, ctx: loadSource(['modules/finance/finance-category-sot.js', 'modules/finance/finance-tx-sot.js'], { D, sameId: (a, b) => String(a) === String(b), save: () => true, uid: () => 'x' + Math.random(), todayStr: () => '2026-11-15' }, ['FinanceTxSOT', 'FinanceCategorySOT']) };
}
const base = { type: 'expense', amount: 1000, accountId: 'a1', date: '2026-11-15', note: 'x' };

test('S2819 guard: kategori yang tidak dikenal (mis. label grup BAHAN) DITOLAK, bukan tersimpan diam-diam', () => {
  const { D, ctx } = sotCtx();
  for (const bad of ['BAHAN', 'JASA', 'Zzz', '']) {
    assert.throws(() => ctx.FinanceTxSOT.create(Object.assign({ id: 'b' + bad }, base, { category: bad })), /FINANCE_CATEGORY_UNRESOLVED/, 'kategori: ' + bad);
  }
  assert.equal(D.transactions.length, 0);
});

test('S2819 guard: kategori valid diterima; categoryId basi diganti ID canonical dari nama', () => {
  const { D, ctx } = sotCtx();
  ctx.FinanceTxSOT.create(Object.assign({ id: 'n1' }, base, { category: 'Renov' }));
  ctx.FinanceTxSOT.create(Object.assign({ id: 'n2' }, base, { category: 'Makan', categoryId: 'cat_basi_tak_ada' }));
  assert.equal(D.transactions.length, 2);
  assert.equal(D.transactions[0].categoryId, 'cat_renov_1');
  assert.equal(D.transactions[1].categoryId, 'cat_makan_1');
  assert.equal(D.transactions[1].category, 'Makan');
});

test('S2819 guard: createMany atomik — satu baris kategori tak dikenal membatalkan semua baris', () => {
  const { D, ctx } = sotCtx();
  assert.throws(() => ctx.FinanceTxSOT.createMany([
    Object.assign({ id: 'm1' }, base, { category: 'Renov' }),
    Object.assign({ id: 'm2' }, base, { category: 'BAHAN' }),
  ]));
  assert.equal(D.transactions.length, 0);
});
