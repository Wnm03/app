'use strict';
/** Sesi D (v2925): D3 daftar akun dipersempit ke rekening milik sendiri; impor CSV memulihkan penanda Hitung Kas. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');
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

// ---- Sesi D (v2925): D3 daftar akun dipersempit + CSV impor memulihkan "Hitung Kas" ----
const autoPiutang = (extra) => {
  const c = mk(extra); c.FinanceCategorySOT.ensureDebtLedgerCategories();
  c.D.accounts.push({ id: 'acc_saldo_tagihan', emoji: '🧾', name: 'Saldo tagihan', balance: 0, ownership: 'INVESTOR', includeInBalance: false });
  c.isAccOwnershipSelf = (a) => !a.ownership || a.ownership === 'SELF';
  c.D.piutang.push({ id: 'p9', name: 'Istri', nilai: 250000, lunas: false, autoBillId: 'b1', autoTxId: 77 });
  c.Piutang.editId = 'p9'; c.Piutang._lunasState = true; setP(c, { name: 'Istri', nilai: 250000 });
  return c;
};

test('D3 sempit: dialog hanya memuat akun milik sendiri + "Jangan catat pemasukan"; akun INVESTOR tidak muncul', async () => {
  let seen = null;
  const c = autoPiutang({ showChoiceModal: async (o) => { seen = o.choices.map((x) => x.label); return 1; } });
  await c.Piutang._saveInner();
  assert.deepEqual(seen, ['💵 Cash', '🏦 BRI', 'Jangan catat pemasukan']);
  assert.equal(c.D.transactions.length, 1);
  assert.equal(c.D.transactions[0].accountId, 'acc_bri', 'indeks pilihan dipetakan ke daftar yang sudah disaring');
});

test('D3 sempit: bila semua akun bukan milik sendiri, fallback ke semua akun (tidak buntu)', async () => {
  let seen = null;
  const c = autoPiutang({ showChoiceModal: async (o) => { seen = o.choices.map((x) => x.label); return null; } });
  c.isAccOwnershipSelf = () => false;
  await c.Piutang._saveInner();
  assert.equal(seen.length, 4);
  assert.equal(seen[2], '🧾 Saldo tagihan');
});

function csvCtx2(txs) {
  let captured = '';
  const ctx = loadSource(['modules/shared/backup-restore.js'], {
    D: { transactions: txs, accounts: [{ id: 'acc_cash', name: 'Cash' }] },
    getRange: () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31') }),
    uid: () => 'u1', getLaporanFilters: () => ({}), txMatchesFilters: () => true,
    isAliranKlienSafe: (t) => t.aliran === true,
    Blob: class { constructor(p) { captured = p.join(''); } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
  }, ['exportCSV', 'parseCSVImport']);
  return { ctx, get csv() { return captured; } };
}

test('Impor CSV: kolom Hitung Kas = Tidak memulihkan hitungKas:false; Ya/kosong tidak menambah field', () => {
  const h = csvCtx2([
    { id: 't1', date: '2026-11-01', type: 'expense', category: 'Makan', amount: 5000, accountId: 'acc_cash' },
    { id: 't2', date: '2026-11-02', type: 'expense', category: 'Makan', amount: 7000, accountId: 'acc_cash', hitungKas: false },
    { id: 't3', date: '2026-11-03', type: 'income', category: 'Gaji', amount: 9000, accountId: 'acc_cash', aliran: true },
  ]);
  h.ctx.exportCSV();
  const rows = h.ctx.parseCSVImport(h.csv, 'generic');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].hitungKas, undefined);
  assert.equal(rows[1].hitungKas, false);
  assert.equal(rows[2].hitungKas, undefined, 'Aliran Klien itu nilai turunan: tidak dijadikan field saat impor');
  assert.equal(Object.prototype.hasOwnProperty.call(rows[2], 'aliranKlien'), false);
});

test('Impor CSV: CSV lama tanpa kolom Hitung Kas tetap terbaca seperti semula', () => {
  const h = csvCtx2([]);
  const csv = 'Tanggal,Tipe,Kategori,Subkategori,Akun,Metode,Jumlah,Keterangan\n2026-11-01,Pengeluaran,Makan,,Cash,tunai,5000,nasi\n';
  const rows = h.ctx.parseCSVImport(csv, 'generic');
  assert.equal(rows.length, 1);
  assert.equal('hitungKas' in rows[0], false);
  assert.equal(rows[0].amount, 5000);
});

test('Impor CSV: nilai Hitung Kas tak dikenal diperlakukan sebagai Ya (aman, tidak menyembunyikan transaksi)', () => {
  const h = csvCtx2([]);
  const csv = 'Tanggal,Tipe,Kategori,Akun,Jumlah,Hitung Kas\n2026-11-01,Pengeluaran,Makan,Cash,5000,mungkin\n2026-11-02,Pengeluaran,Makan,Cash,6000,TIDAK\n';
  const rows = h.ctx.parseCSVImport(csv, 'generic');
  assert.equal(rows[0].hitungKas, undefined);
  assert.equal(rows[1].hitungKas, false, 'huruf besar diterima');
});

// ---- Sesi E: akun yang tidak dihitung di total tetap bisa dipilih, tetapi diurutkan paling bawah ----
test('D3 urutan: akun includeInBalance:false diurutkan terakhir (sebelum "Jangan catat"), indeks pilihan tetap benar', async () => {
  let seen = null;
  const run = async (pick) => {
    const c = autoPiutang({ showChoiceModal: async (o) => { seen = o.choices.map((x) => x.label); return pick; } });
    c.isAccOwnershipSelf = () => true;
    c.D.accounts.splice(1, 0, { id: 'acc_p', emoji: '💰', name: 'p', balance: 0, includeInBalance: false });
    await c.Piutang._saveInner();
    return c;
  };
  let c = await run(1);
  assert.deepEqual(seen.slice(0, 3), ['💵 Cash', '🏦 BRI', '🧾 Saldo tagihan'].slice(0, 2).concat([seen[2]]));
  assert.equal(seen[seen.length - 1], 'Jangan catat pemasukan');
  assert.ok(seen.indexOf('💰 p') > seen.indexOf('🏦 BRI'), 'p setelah akun yang dihitung');
  assert.equal(c.D.transactions[0].accountId, 'acc_bri');
  c = await run(seen.indexOf('💰 p'));
  assert.equal(c.D.transactions[0].accountId, 'acc_p', 'akun tak-dihitung tetap bisa dipilih');
});
