'use strict';
/**
 * B1/B2 (audit browser v2925): pelunasan piutang = pemasukan 'Piutang', pelunasan/cicilan utang = pengeluaran 'Utang'.
 * Default lama hanya punya expense 'Piutang' & income 'Utang' -> FinanceTxSOT.create gagal FINANCE_CATEGORY_UNRESOLVED.
 * Tes ini sengaja TIDAK memakai taksonomi lenient: kategori harus benar-benar ada.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = (...p) => path.join(__dirname, '..', ...p);
const read = (...p) => fs.readFileSync(R(...p), 'utf8');

function oldCats() { // bentuk default/backup lama
  return {
    income: [{ id: 'cat_gi', name: 'Gaji toko', subs: [] }, { id: 'cat_utang', name: 'Utang', subs: [] }, { id: 'cat_ll', name: 'Lainnya', subs: [] }],
    expense: [{ id: 'cat_tg', name: 'Tagihan', subs: [] }, { id: 'cat_piutang', name: 'Piutang', subs: [] }, { id: 'cat_lx', name: 'Lainnya', subs: [] }],
  };
}
function extractFn(src, name) {
  const m = [`async function ${name}(`, `function ${name}(`].map(x => src.indexOf(x)).find(x => x >= 0);
  if (m == null) throw new Error(name + ' not found');
  const b = src.indexOf('{', m); let d = 1, i = b + 1;
  while (i < src.length && d) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; }
  return src.slice(m, i);
}
function base(D) {
  const ctx = { console, Math, Date, D, window: {}, toast: (m) => { ctx.__toasts.push(m); }, __toasts: [],
    sameId: (a, b) => String(a) === String(b), uid: (() => { let n = 1000; return () => ++n; })(),
    todayStr: () => '2026-11-22', save: () => {}, escapeHtml: s => s, fmtFull: n => String(n) };
  vm.createContext(ctx);
  for (const f of ['finance-cross-entity-atomic.js', 'finance-category-sot.js', 'finance-tx-sot.js', 'bill-debt-piutang-canonical-writer.js'])
    vm.runInContext(read('modules', 'finance', f), ctx, { filename: f });
  return ctx;
}

test('B1/B2 ensureDebtLedgerCategories: membuat income Piutang & expense Utang, idempoten, tidak menyentuh yang lama', () => {
  const D = { categories: oldCats(), transactions: [], budgets: [], accounts: [{ id: 'acc_cash', balance: 0 }] };
  const ctx = base(D); const S = ctx.FinanceCategorySOT;
  assert.equal(S.resolve({ type: 'income', category: 'Piutang' }).ok, false, 'precondition: gagal sebelum fix');
  assert.equal(S.resolve({ type: 'expense', category: 'Utang' }).ok, false);
  assert.equal(S.ensureDebtLedgerCategories(), 2);
  assert.equal(S.ensureDebtLedgerCategories(), 0, 'panggilan kedua tidak membuat duplikat');
  const inc = S.resolve({ type: 'income', category: 'Piutang' }), exp = S.resolve({ type: 'expense', category: 'Utang' });
  assert.equal(inc.ok, true); assert.equal(exp.ok, true);
  assert.equal(inc.categoryId, 'cat_piutang_in'); assert.equal(exp.categoryId, 'cat_utang_out');
  // resolusi tetap per (tipe, nama): tidak tertukar dengan kategori lama
  assert.equal(S.resolve({ type: 'expense', category: 'Piutang' }).categoryId, 'cat_piutang');
  assert.equal(S.resolve({ type: 'income', category: 'Utang' }).categoryId, 'cat_utang');
  assert.equal(D.categories.income.filter(c => c.name === 'Piutang').length, 1);
  assert.equal(D.categories.expense.filter(c => c.name === 'Utang').length, 1);
});

test('B1/B2 data-default.js membawa keempat kategori (instal baru)', () => {
  const src = read('modules', 'shared', 'data-default.js');
  for (const id of ['cat_utang', 'cat_piutang_in', 'cat_piutang', 'cat_utang_out']) assert.ok(src.includes(`id:'${id}'`), id);
  const m = src.match(/DEFAULT_CATS\s*=\s*\{[\s\S]*?\n\};?/);
  assert.ok(m, 'DEFAULT_CATS ditemukan');
  const cats = vm.runInNewContext('(' + m[0].replace(/^DEFAULT_CATS\s*=\s*/, '').replace(/;\s*$/, '') + ')');
  const ctx = base({ categories: JSON.parse(JSON.stringify(cats)), transactions: [], budgets: [] });
  assert.equal(ctx.FinanceCategorySOT.resolve({ type: 'income', category: 'Piutang' }).ok, true);
  assert.equal(ctx.FinanceCategorySOT.resolve({ type: 'expense', category: 'Utang' }).ok, true);
  assert.equal(ctx.FinanceCategorySOT.ensureDebtLedgerCategories(), 0, 'default sudah lengkap');
});

test('B1/B2 createPiutangUtangAutoTx: pelunasan piutang (income) & utang (expense) berhasil di data lama', () => {
  const D = { categories: oldCats(), transactions: [], budgets: [], accounts: [{ id: 'acc_cash', balance: 0 }] };
  const ctx = base(D);
  vm.runInContext(extractFn(read('modules', 'finance', 'piutang-utang.js'), 'createPiutangUtangAutoTx') + '\nthis.createPiutangUtangAutoTx=createPiutangUtangAutoTx;', ctx);
  const id1 = ctx.createPiutangUtangAutoTx('income', 100000, 'acc_cash', 'Piutang', 'Piutang lunas: Budi', '2026-11-22');
  const id2 = ctx.createPiutangUtangAutoTx('expense', 80000, 'acc_cash', 'Utang', 'Utang lunas: Sari', '2026-11-22');
  assert.equal(D.transactions.length, 2);
  const t1 = D.transactions.find(t => t.id === id1), t2 = D.transactions.find(t => t.id === id2);
  assert.equal(t1.type, 'income'); assert.equal(t1.category, 'Piutang'); assert.equal(t1.categoryId, 'cat_piutang_in');
  assert.equal(t2.type, 'expense'); assert.equal(t2.category, 'Utang'); assert.equal(t2.categoryId, 'cat_utang_out');
});

function billCtx(D, prompts) {
  const ctx = base(D);
  Object.assign(ctx, {
    getBillPaidThisPeriodInfo: () => null, askConfirm: async () => true,
    showPromptModal: async () => prompts.shift(), parsePzNum: v => Number(String(v).replace(/\D/g, '')),
    refreshBillEverywhere: () => {}, renderDebtList: () => {}, renderKekayaanBersih: () => {}, hitungZakatMaal: () => {},
    maybeCreateSharedPiutangFromBill: () => {},
  });
  const SRC = read('modules', 'finance', 'tagihan-kalender.js');
  vm.runInContext(['_amc015', 'advanceBillNextDue', 'markBillPaid'].map(n => extractFn(SRC, n)).join('\n') + '\nthis.markBillPaid=markBillPaid;', ctx);
  return ctx;
}

test('B2 bayar cicilan utang (bill kind utang, kategori Utang pengeluaran) berhasil di data lama', async () => {
  const D = { categories: oldCats(), transactions: [], budgets: [], billsArchive: [], accounts: [{ id: 'acc_cash', balance: 0 }],
    debts: [{ id: 'd1', name: 'Pinjaman Andi', nilai: 300000, cicilanBulanan: 100000, lunas: false, billId: 'b1' }],
    bills: [{ id: 'b1', name: 'Cicilan: Pinjaman Andi', amount: 100000, nextDue: '2026-11-25', freq: 'bulanan', kind: 'utang', debtId: 'd1', category: 'Utang', subcategory: '', accountId: 'acc_cash' }], piutang: [] };
  const ctx = billCtx(D, ['100000', '2026-11-22']);
  await ctx.markBillPaid('b1');
  assert.equal(D.transactions.length, 1, 'transaksi pembayaran tercatat');
  assert.equal(D.transactions[0].type, 'expense'); assert.equal(D.transactions[0].category, 'Utang');
  assert.equal(D.debts[0].nilai, 200000, 'sisa utang 200.000');
});

test('B2 kategori tak ditemukan -> toast jelas, rollback bersih, tanpa unhandled rejection', async () => {
  const D = { categories: oldCats(), transactions: [], budgets: [], billsArchive: [], accounts: [{ id: 'acc_cash', balance: 0 }], debts: [], piutang: [],
    bills: [{ id: 'b9', name: 'Aneh', amount: 5000, nextDue: '2026-11-25', freq: 'bulanan', kind: 'tagihan', category: 'KategoriHilang', subcategory: '', accountId: 'acc_cash' }] };
  const ctx = billCtx(D, ['5000', '2026-11-22']);
  const r = await ctx.markBillPaid('b9'); // tidak boleh throw
  assert.equal(r, false);
  assert.equal(D.transactions.length, 0, 'rollback: tidak ada transaksi');
  assert.equal(D.bills[0].nextDue, '2026-11-25', 'rollback: jadwal tagihan tidak maju');
  assert.ok(ctx.__toasts.some(m => /KategoriHilang/.test(m) && /tidak ditemukan/.test(m)), 'toast menyebut kategori');
  assert.equal(ctx.__kwMarkBillPaidInFlight.has('b9'), false, 'lock dilepas');
});

test('B1/B2 boot memanggil ensureDebtLedgerCategories setelah migrasi (backup lama ikut terperbaiki)', () => {
  const src = read('modules', 'shared', 'features-helpers-global-security.js');
  const iMig = src.indexOf('const _migrationResult=runDataMigrations(');
  const iEns = src.indexOf('ensureDebtLedgerCategories()', iMig);
  const iNext = src.indexOf('const _continuityPreviousMeta=_readRuntimeMeta();');
  assert.ok(iMig > 0 && iEns > iMig && iEns < iNext);
});
