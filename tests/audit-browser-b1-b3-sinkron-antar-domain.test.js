'use strict';
// tests/audit-browser-b1-b3-sinkron-antar-domain.test.js
// Regresi 3 bug dari audit browser nyata (Chromium, 2026-11-11, LAPORAN-AUDIT.md):
//   B1  Utang/Piutang yatim (linkedTxId menggantung) setelah transaksi sumber dihapus
//   B2  Beli/Jual investasi dgn akun gagal (FINANCE_CATEGORY_UNRESOLVED)
//   B3  Pengeluaran Dana Titipan gagal (kategori 'Dana Titipan' tidak ada / catatan dipakai sbg kategori)
// SENGAJA memakai FinanceCategorySOT + FinanceTxSOT ASLI dgn taksonomi default TANPA
// "mode lenient" (tests/helpers/loadSource.js installLenientTaxonomy hanya aktif kalau
// finance-category-sot.js TIDAK diminta eksplisit) -- mode lenient itulah yang membuat
// bug B2/B3 tidak pernah ketahuan di tes unit lama.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = (f) => fs.readFileSync(f, 'utf8');
const { makePermissiveDocument } = require('./helpers/loadSource');

function defaultCats() {
  return {
    income: [
      { id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] },
      { id: 'cat_utang', name: 'Utang', emoji: '🤝', subs: [] },
      { id: 'cat_ll', name: 'Lainnya', emoji: '📦', subs: [] },
    ],
    expense: [
      { id: 'cat_piutang', name: 'Piutang', emoji: '🤝', subs: [] },
      { id: 'cat_inv', name: 'Investasi', emoji: '📈', subs: [] },
      { id: 'cat_lx', name: 'Lainnya', emoji: '📦', subs: [] },
    ],
  };
}

function makeCtx(files, extraD = {}, extraGlobals = {}) {
  const calls = { toast: [], emits: [] };
  const c = { console, globalThis: null, window: null, structuredClone: global.structuredClone };
  c.globalThis = c; c.window = c;
  c.D = Object.assign({
    categories: defaultCats(),
    accounts: [{ id: 'acc1', name: 'BCA', emoji: '🏦' }],
    transactions: [], bills: [], billsArchive: [], debts: [], piutang: [],
    bbmLogs: [], products: [], cobek: [], servisLogs: [], partsStock: [],
    investments: [], investmentTx: [], renovProjects: [], sewaKios: { units: [] }, tukangAbsensi: [],
    titipanCommitments: [],
  }, extraD);
  let n = 0;
  Object.assign(c, {
    uid: () => 'id_' + (++n),
    save: () => true,
    toast: (m) => { calls.toast.push(m); },
    askConfirm: async () => true,
    sameId: (a, b) => String(a) === String(b),
    todayStr: () => '2026-11-11',
    refreshAfterMutation: () => {}, renderDashboard: () => {}, renderKeuangan: () => {},
    renderCnTab: () => {}, renderProductList: () => {}, renderKekayaanBersih: () => {},
    hitungZakatMaal: () => {}, renderBillList: () => {}, checkBills: () => {},
    AIBus: { emit: (e, p) => { calls.emits.push([e, p]); } },
    document: makePermissiveDocument(),
    fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0), fmtDate: (d) => String(d || ''),
  }, extraGlobals);
  files.forEach((f) => vm.runInNewContext(read(f), c, { filename: f }));
  c.__calls = calls;
  return c;
}

const CORE = [
  'modules/finance/finance-cross-entity-atomic.js',
  'modules/finance/finance-category-sot.js',
  'modules/finance/finance-tx-sot.js',
  'modules/finance/finance-event-outbox.js',
  'modules/finance/bill-debt-piutang-canonical-writer.js',
];

// ---------------------------------------------------------------- B2
test('B2: beli investasi dgn akun -> tersimpan (dulu FINANCE_CATEGORY_UNRESOLVED)', () => {
  const c = makeCtx([...CORE, 'modules/asset/investasi.js']);
  const h = vm.runInContext('Investment', c).addHolding({ name: 'BBCA', type: 'Saham', unit: 0, avgPrice: 0, currentPrice: 0 });
  const Inv = vm.runInContext('Investment', c);
  const tx = Inv.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-11-01', qty: 10, price: 5000, fee: 1000, accountId: 'acc1' });
  assert.equal(c.D.transactions.length, 1);
  const t = c.D.transactions[0];
  assert.equal(t.type, 'expense');
  assert.equal(t.category, 'Investasi');
  assert.equal(t.subcategory || '', '');
  assert.equal(t.amount, 51000);
  assert.match(t.note, /BBCA/, 'nama holding tetap tercatat di note');
  assert.equal(tx.linkedTxId, t.id);
  assert.equal(Inv.getHolding(h.id).unit, 10);
});

test('B2: kategori Investasi yang terhapus dibuat ulang otomatis saat beli', () => {
  const cats = defaultCats(); cats.expense = cats.expense.filter((x) => x.name !== 'Investasi');
  const c = makeCtx([...CORE, 'modules/asset/investasi.js'], { categories: cats });
  const Inv = vm.runInContext('Investment', c);
  const h = Inv.addHolding({ name: 'BBCA', type: 'Saham', unit: 0, avgPrice: 0, currentPrice: 0 });
  Inv.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-11-01', qty: 1, price: 1000, accountId: 'acc1' });
  assert.equal(c.D.transactions[0].category, 'Investasi');
});

test('B2: jual investasi dgn akun -> income kategori Investasi dibuat & tersimpan', () => {
  const c = makeCtx([...CORE, 'modules/asset/investasi.js']);
  const Inv = vm.runInContext('Investment', c);
  const h = Inv.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 1000, currentPrice: 1000 });
  const tx = Inv.addTransaction({ investmentId: h.id, type: 'jual', date: '2026-11-02', qty: 5, price: 2000, fee: 500, accountId: 'acc1' });
  const t = c.D.transactions[0];
  assert.equal(t.type, 'income');
  assert.equal(t.category, 'Investasi');
  assert.equal(t.amount, 9500);
  assert.equal(tx.linkedTxId, t.id);
});

test('B2: hapus transaksi investasi ikut menghapus transaksi keuangan tertaut', () => {
  const c = makeCtx([...CORE, 'modules/asset/investasi.js']);
  const Inv = vm.runInContext('Investment', c);
  const h = Inv.addHolding({ name: 'BBCA', type: 'Saham', unit: 0, avgPrice: 0, currentPrice: 0 });
  const tx = Inv.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-11-01', qty: 2, price: 1000, accountId: 'acc1' });
  assert.equal(Inv.deleteTransaction(tx.id), true);
  assert.equal(c.D.transactions.length, 0);
});

// ---------------------------------------------------------------- B3
function titipanCtx() {
  return makeCtx([...CORE, 'modules/finance/titipan-expense-flow.js'], {}, {
    DanaTitipanPortfolioAPI: { listExistingOwners: () => [{ ownerId: 'o1', ownerName: 'Budi' }] },
    applyTxTitipanLinkageOnSave: () => {},
  });
}
const baseInput = (over = {}) => Object.assign({
  nominal: 100000, owners: [{ ownerId: 'o1', porsi: 100 }], category: 'Dana Titipan',
  subcategory: '', accountId: 'acc1', date: '2026-11-05', note: '', talangan: false,
}, over);

test('B3: pengeluaran titipan di instalasi bersih (kategori belum ada) -> sukses & kategori dibuat', () => {
  const c = titipanCtx();
  assert.equal(c.FinanceCategorySOT.findByName('expense', 'Dana Titipan'), null);
  const res = vm.runInContext('TitipanExpenseFlow', c).submit(baseInput());
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(c.D.transactions.length, 1);
  assert.equal(c.D.transactions[0].category, 'Dana Titipan');
  assert.ok(c.FinanceCategorySOT.findByName('expense', 'Dana Titipan'));
});

test('B3: kategori sudah ada -> tidak digandakan', () => {
  const c = titipanCtx();
  const F = vm.runInContext('TitipanExpenseFlow', c);
  assert.equal(F.submit(baseInput()).ok, true);
  assert.equal(F.submit(baseInput({ date: '2026-11-06' })).ok, true);
  assert.equal(c.D.categories.expense.filter((x) => x.name === 'Dana Titipan').length, 1);
  assert.equal(c.D.transactions.length, 2);
});

test('B3: kategori selain "Dana Titipan" tidak dibuat diam-diam oleh flow', () => {
  const c = titipanCtx();
  assert.throws(() => vm.runInContext('TitipanExpenseFlow', c).submit(baseInput({ category: 'Kategori Ngawur' })), /FINANCE_CATEGORY_UNRESOLVED/);
  assert.equal(c.FinanceCategorySOT.findByName('expense', 'Kategori Ngawur'), null);
});

test('B3: UI tidak lagi memakai catatan sebagai kategori', () => {
  const src = read('modules/finance/titipan-expense-ui.js');
  assert.ok(!/category:\s*note\s*\|\|/.test(src));
  assert.match(src, /category:\s*'Dana Titipan'/);
});

// ---------------------------------------------------------------- B1
const PU = ['modules/finance/piutang-utang.js'];
function b1Ctx(extraD) {
  return makeCtx([...CORE, ...PU, 'modules/finance/tx-list-cashflow.js'], extraD);
}
function seedLinked(extra = {}) {
  return Object.assign({
    transactions: [
      { id: 'tx_p', type: 'expense', amount: 500000, category: 'Piutang', subcategory: '', accountId: 'acc1', date: '2026-11-01', note: 'Piutang: Andi' },
      { id: 'tx_d', type: 'income', amount: 700000, category: 'Utang', subcategory: '', accountId: 'acc1', date: '2026-11-01', note: 'Utang: Bank' },
    ],
    piutang: [{ id: 'p1', name: 'Andi', nilai: 500000, lunas: false, linkedTxId: 'tx_p' }],
    debts: [{ id: 'd1', name: 'Bank', nilai: 700000, lunas: false, linkedTxId: 'tx_d' }],
  }, extra);
}

test('B1: hapus transaksi sumber piutang -> piutang tertaut ikut terhapus (tidak yatim)', async () => {
  const c = b1Ctx(seedLinked());
  await c.delTx('tx_p');
  assert.equal(c.D.transactions.some((t) => t.id === 'tx_p'), false);
  assert.equal(c.D.piutang.length, 0);
  assert.equal(c.D.debts.length, 1, 'utang lain tidak tersentuh');
});

test('B1: hapus transaksi sumber utang -> utang tertaut ikut terhapus', async () => {
  const c = b1Ctx(seedLinked());
  await c.delTx('tx_d');
  assert.equal(c.D.debts.length, 0);
  assert.equal(c.D.piutang.length, 1);
});

test('B1: piutang SUDAH lunas dipertahankan sbg riwayat, linkedTxId dilepas', async () => {
  const c = b1Ctx(seedLinked({ piutang: [{ id: 'p1', name: 'Andi', nilai: 500000, lunas: true, linkedTxId: 'tx_p', linkedPayoffTxId: 'tx_pay' }] }));
  await c.delTx('tx_p');
  assert.equal(c.D.piutang.length, 1);
  assert.equal(c.D.piutang[0].linkedTxId, null);
  assert.equal(c.D.piutang[0].linkedPayoffTxId, 'tx_pay');
});

test('B1: transaksi biasa tanpa tautan tidak mengubah utang/piutang', async () => {
  const c = b1Ctx(seedLinked({ transactions: [
    { id: 'tx_x', type: 'expense', amount: 1, category: 'Lainnya', subcategory: '', accountId: 'acc1', date: '2026-11-01' },
    { id: 'tx_p', type: 'expense', amount: 500000, category: 'Piutang', subcategory: '', accountId: 'acc1', date: '2026-11-01' },
    { id: 'tx_d', type: 'income', amount: 700000, category: 'Utang', subcategory: '', accountId: 'acc1', date: '2026-11-01' },
  ] }));
  await c.delTx('tx_x');
  assert.equal(c.D.piutang.length, 1);
  assert.equal(c.D.debts.length, 1);
});

test('B1: data yatim lama (linkedTxId menggantung) sekarang bisa dihapus langsung', async () => {
  const c = b1Ctx({ piutang: [{ id: 'p9', name: 'Yatim', nilai: 1, lunas: false, linkedTxId: 'hilang' }], debts: [{ id: 'd9', name: 'Yatim', nilai: 1, lunas: false, linkedTxId: 'hilang' }] });
  const P = vm.runInContext('Piutang', c), Dt = vm.runInContext('Debt', c);
  await P.delete('p9');
  await Dt.delete('d9');
  assert.equal(c.D.piutang.length, 0);
  assert.equal(c.D.debts.length, 0);
});

test('B1: piutang yang transaksinya MASIH ada tetap terkunci (perilaku sengaja tidak berubah)', async () => {
  const c = b1Ctx(seedLinked());
  await vm.runInContext('Piutang', c).delete('p1');
  assert.equal(c.D.piutang.length, 1);
});
