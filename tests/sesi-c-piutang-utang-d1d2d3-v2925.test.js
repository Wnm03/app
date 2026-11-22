'use strict';
/** Sesi C (v2925): D1 kunci nilai tertaut, D2 buka lagi membatalkan pelunasan, D3 piutang "Ditanggung Bersama" lunas -> pilih akun. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

function mk(extra = {}) {
  const els = {};
  const el = (id) => (els[id] = els[id] || { value: '', checked: false, textContent: '', className: '', classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} });
  const D = { categories: { income: [{ id: 'cat_utang', name: 'Utang', subs: [] }, { id: 'cat_ll', name: 'Lainnya', subs: [] }],
      expense: [{ id: 'cat_piutang', name: 'Piutang', subs: [] }, { id: 'cat_lx', name: 'Lainnya', subs: [] }] },
    transactions: [], budgets: [], bills: [], billsArchive: [], piutang: [], debts: [], accounts: [{ id: 'acc_cash', emoji: '💵', name: 'Cash', balance: 0 }, { id: 'acc_bri', emoji: '🏦', name: 'BRI', balance: 0 }] };
  const ctx = { window: {}, console, Math, Date, JSON, Object, Array, String, Number, Promise, D, __t: [],
    toast: (m) => ctx.__t.push(String(m)), sameId: (a, b) => String(a) === String(b), uid: (() => { let n = 5000; return () => ++n; })(),
    todayStr: () => '2026-11-22', save: () => true, escapeHtml: (s) => s, fmtFull: (n) => String(n),
    parsePzNum: (v) => Number(String(v).replace(/\D/g, '')) || 0, askConfirm: async () => true,
    document: { getElementById: el }, closeModal() {}, openModal() {}, renderKekayaanBersih() {}, hitungZakatMaal() {}, renderBillList() {}, checkBills() {},
    withSaveGuardAsync: async (_k, _m, fn) => fn(), _financeMutationBlockedByStaleState: () => false,
    _bdpAtomicSnapshot: () => ({}), _bdpAtomicRestore() {}, showChoiceModal: async () => null, ...extra };
  vm.createContext(ctx);
  for (const f of ['finance-cross-entity-atomic.js', 'finance-category-sot.js', 'finance-tx-sot.js', 'bill-debt-piutang-canonical-writer.js'])
    vm.runInContext(read('modules', 'finance', f), ctx, { filename: f });
  let src = read('modules', 'finance', 'piutang-utang.js');
  vm.runInContext(src + '\nthis.Piutang=Piutang;this.Debt=Debt;', ctx, { filename: 'piutang-utang.js' });
  ctx.els = els; ctx.el = el;
  Object.assign(ctx.Piutang, { renderList() {} }); Object.assign(ctx.Debt, { renderList() {}, syncBill() {} });
  return ctx;
}
const setP = (c, o) => { c.el('piutangName').value = o.name; c.el('piutangNilai').value = String(o.nilai); c.el('piutangTanggal').value = '2026-11-22'; c.el('piutangJatuhTempo').value = ''; c.el('piutangCatatan').value = ''; c.el('piutangAssetId').value = ''; c.el('piutangSyncTx').checked = false; };
const setD = (c, o) => { c.el('debtName').value = o.name; c.el('debtNilai').value = String(o.nilai); c.el('debtTanggal').value = '2026-11-22'; c.el('debtJatuhTempo').value = ''; c.el('debtCatatan').value = ''; c.el('debtAssetId').value = ''; c.el('debtBunga').value = '0'; c.el('debtCicilan').value = '0'; c.el('debtJenis').value = 'pribadi'; c.el('debtSyncTx').checked = false; };
const bal = (c, id) => c.D.transactions.filter((t) => t.accountId === id).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

test('D1/D2: piutang tertaut -> nilai dikunci; Lunas = 1 pemasukan; buka lagi membatalkannya; lunas lagi = 1 pemasukan', async () => {
  const c = mk();
  c.ensureDone = c.FinanceCategorySOT.ensureDebtLedgerCategories();
  const txId = vm.runInContext("createPiutangUtangAutoTx('expense',100000,'acc_cash','Piutang','Piutang: Budi','2026-11-22')", c);
  c.D.piutang.push({ id: 'p1', name: 'Budi', nilai: 100000, lunas: false, linkedTxId: txId });
  assert.equal(bal(c, 'acc_cash'), -100000);
  // D1: coba ubah nilai ke 150000 -> dikunci
  c.Piutang.editId = 'p1'; c.Piutang._lunasState = false; setP(c, { name: 'Budi', nilai: 150000 });
  await c.Piutang._saveInner();
  assert.equal(c.D.piutang[0].nilai, 100000); assert.ok(c.__t.some((m) => /tidak bisa diubah/.test(m)));
  // Lunas
  c.Piutang.editId = 'p1'; c.Piutang._lunasState = true; setP(c, { name: 'Budi', nilai: 100000 });
  await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 2); assert.equal(bal(c, 'acc_cash'), 0);
  const pay1 = c.D.piutang[0].linkedPayoffTxId; assert.ok(pay1);
  // D2: buka lagi -> pemasukan dibatalkan
  c.Piutang.editId = 'p1'; c.Piutang._lunasState = false; setP(c, { name: 'Budi', nilai: 100000 });
  await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 1, 'tx pelunasan dihapus'); assert.equal(bal(c, 'acc_cash'), -100000);
  assert.equal(c.D.piutang[0].lunas, false); assert.equal(c.D.piutang[0].linkedPayoffTxId, null);
  // lunas lagi -> tepat 1 pemasukan baru
  c.Piutang.editId = 'p1'; c.Piutang._lunasState = true; setP(c, { name: 'Budi', nilai: 100000 });
  await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 2); assert.equal(bal(c, 'acc_cash'), 0);
  // edit ulang tanpa perubahan status -> tidak menambah tx
  c.Piutang.editId = 'p1'; c.Piutang._lunasState = true; setP(c, { name: 'Budi', nilai: 100000 });
  await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 2);
});

test('D1/D2: utang tertaut -> nilai dikunci; Lunas = 1 pengeluaran; buka lagi membatalkannya', async () => {
  const c = mk();
  c.FinanceCategorySOT.ensureDebtLedgerCategories();
  const txId = vm.runInContext("createPiutangUtangAutoTx('income',80000,'acc_bri','Utang','Utang: Sari','2026-11-22')", c);
  c.D.debts.push({ id: 'd1', name: 'Sari', jenis: 'pribadi', nilai: 80000, bunga: 0, cicilanBulanan: 0, lunas: false, linkedTxId: txId });
  c.Debt.editId = 'd1'; c.Debt._lunasState = false; setD(c, { name: 'Sari', nilai: 99999 });
  await c.Debt._saveInner();
  assert.equal(c.D.debts[0].nilai, 80000); assert.ok(c.__t.some((m) => /tidak bisa diubah/.test(m)));
  c.Debt.editId = 'd1'; c.Debt._lunasState = true; setD(c, { name: 'Sari', nilai: 80000 });
  await c.Debt._saveInner();
  assert.equal(c.D.transactions.length, 2); assert.equal(bal(c, 'acc_bri'), 0);
  c.Debt.editId = 'd1'; c.Debt._lunasState = false; setD(c, { name: 'Sari', nilai: 80000 });
  await c.Debt._saveInner();
  assert.equal(c.D.transactions.length, 1); assert.equal(bal(c, 'acc_bri'), 80000);
  assert.equal(c.D.debts[0].linkedPayoffTxId, null);
});

test('D3: piutang otomatis Ditanggung Bersama lunas -> pilih akun = 1 pemasukan Piutang; batal = tidak menyimpan; "jangan catat" = tanpa tx', async () => {
  const mkAuto = (choice) => { const c = mk({ showChoiceModal: async () => choice }); c.FinanceCategorySOT.ensureDebtLedgerCategories();
    c.D.piutang.push({ id: 'p9', name: 'Istri', nilai: 250000, lunas: false, autoBillId: 'b1', autoTxId: 77 }); c.Piutang.editId = 'p9'; c.Piutang._lunasState = true; setP(c, { name: 'Istri', nilai: 250000 }); return c; };
  let c = mkAuto(1); await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 1); assert.equal(c.D.transactions[0].accountId, 'acc_bri'); assert.equal(c.D.transactions[0].type, 'income'); assert.equal(c.D.transactions[0].category, 'Piutang');
  assert.equal(c.D.piutang[0].lunas, true);
  c = mkAuto(null); await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 0); assert.equal(c.D.piutang[0].lunas, false, 'batal: tidak tersimpan');
  c = mkAuto(2); await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 0); assert.equal(c.D.piutang[0].lunas, true);
  // buka lagi piutang auto yang pemasukannya tercatat -> dibatalkan
  c = mkAuto(0); await c.Piutang._saveInner(); assert.equal(c.D.transactions.length, 1);
  c.Piutang.editId = 'p9'; c.Piutang._lunasState = false; setP(c, { name: 'Istri', nilai: 250000 }); await c.Piutang._saveInner();
  assert.equal(c.D.transactions.length, 0); assert.equal(c.D.piutang[0].lunas, false);
});
