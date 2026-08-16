'use strict';
/**
 * s630-transfer-legacy-orphan-regression.test.js — Audit + FIX Bug D
 * (transfer LEGACY tanpa `transferPairId` jadi orphan & saldo gabungan
 * timpang saat salah satu sisi dihapus). Lihat
 * AUDIT-s630-bugD-transfer-legacy-orphan.md (PATCH-s630-bugD-audit-tests.zip)
 * utk audit lengkap, dan PATCH-README-s631-bugD-transfer-legacy-fix.md utk
 * ringkasan fix sesi ini.
 *
 * LATAR BELAKANG: `transferPairId` (diperkenalkan Sesi 432, lihat komentar
 * `saveTransfer()` di tx-transfer.js & `delTx()` di tx-list-cashflow.js)
 * membuat transfer BARU aman dihapus (2 sisi ikut terhapus sekaligus).
 * Transfer LAMA (dibuat sebelum Sesi 432, atau lewat jalur lain yang masih
 * push transfer_out/transfer_in TANPA transferPairId, mis. "Kontribusi Dana
 * Pensiun" di modules-calc.js -- lihat audit doc §2.4) TIDAK punya field
 * penanda pasangan sama sekali. `delTx()` (tx-list-cashflow.js) HANYA
 * mencari pasangan kalau `t.transferPairId` truthy -- utk transfer legacy,
 * `pairedTx` selalu null, jadi filter penghapusan cuma membuang 1 baris.
 *
 * SESI s630 (audit + test saja, red test sbg bukti bug) SUDAH SELESAI.
 * SESI INI (s631, lihat instruksi PATCH-s631-bugD-transfer-legacy-fix.zip)
 * mengimplementasikan fix minimal, 2 bagian:
 *
 *   1. TUTUP SUMBER BARU: `modules/shared/modules-calc.js`
 *      (`Pensiun.catatKontribusi()`) sekarang ikut mengisi `transferPairId`
 *      (1 `uid()` dibagi ke kedua baris), pola identik `saveTransfer()` --
 *      0 sistem pairing baru diciptakan (test 6 di bawah).
 *
 *   2. DELETE AMAN utk data lama (sudah ada tanpa `transferPairId`):
 *      **BUKAN** heuristic auto-pairing amount+date+accountId (audit s630
 *      §5.2 membuktikan itu berisiko cross-pairing -- lihat test 4, guard
 *      rail yg WAJIB tetap lolos apa pun solusinya). Solusi yang dipilih:
 *      Opsi A audit (§5.1) -- `delTx()` sekarang mendeteksi transfer TANPA
 *      `transferPairId` & menampilkan **peringatan/konfirmasi eksplisit**
 *      sebelum lanjut hapus ("sisi pasangan tidak akan ikut terhapus & tidak
 *      bisa dipastikan otomatis"). Kalau user MEMBATALKAN di dialog ini,
 *      TIDAK ADA apa pun yang terhapus (non-destruktif). Kalau user
 *      **mengonfirmasi**, perilaku hapus 1-sisi-saja TETAP SAMA seperti
 *      sebelumnya (0 auto-delete/auto-pairing transaksi lain) -- bedanya
 *      user sekarang SADAR & mengambil keputusan itu secara eksplisit,
 *      bukan silent data corruption seperti sebelum s631.
 *
 *      Konsekuensi tak-terhindarkan: utk data LEGACY yang SUDAH ADA (dibuat
 *      sebelum Sesi 432 / sebelum fix #1 di atas), invarian "total saldo
 *      gabungan tetap sama setelah hapus 1 pasang transfer" TIDAK BISA
 *      dijamin otomatis tanpa heuristic yg justru terbukti berbahaya (test
 *      4) -- trade-off ini SENGAJA, lihat rasional di README patch. Test 3
 *      di bawah diperbarui utk mencerminkan invarian yang BENAR-BENAR bisa
 *      dijamin sesudah fix: user selalu diberi peringatan eksplisit dulu,
 *      dan bisa membatalkan (0 mutasi) kalau ragu.
 *
 * Pola harness: SAMA PERSIS tests/tx-transfer-audit-s432.test.js -- load
 * source ASLI (tx-transfer.js, tx-list-cashflow.js, akun.js,
 * modules-calc.js utk test 6) lewat loadSource(), DOM tiruan stateful,
 * tidak re-implement logic apa pun.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom(values) {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: values[id] !== undefined ? values[id] : '', textContent: '', innerHTML: '',
      className: '', placeholder: '', disabled: false, style: {}, selectedIndex: 0,
      classList: {
        _set: new Set(),
        toggle(cls, force) { const on = force !== undefined ? force : !this._set.has(cls); if (on) this._set.add(cls); else this._set.delete(cls); return on; },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

// `askConfirmImpl` boleh dioverride per-test (default: selalu setuju, spy
// biasa) supaya test yang perlu mensimulasikan user MEMBATALKAN dialog
// peringatan legacy-transfer (s631) bisa mengontrol jawaban per-panggilan.
function makeCtx(D, dom, askConfirmImpl) {
  const toastMessages = [];
  const modalCalls = [];
  const confirmMessages = [];
  let uidCounter = 0;
  const defaultAskConfirm = async (msg) => { confirmMessages.push(msg); return true; };
  const askConfirm = askConfirmImpl
    ? async (msg) => { confirmMessages.push(msg); return askConfirmImpl(msg); }
    : defaultAskConfirm;
  const ctx = loadSource(
    ['modules/finance/tx-transfer.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/akun.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: (name) => { modalCalls.push(name); },
      closeModal: () => {},
      uid: () => 'id_' + (uidCounter++),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      evalAmtExpr: () => {},
      askConfirm,
      populateKeuFilters: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderCnTab: () => {},
      renderProductList: () => {},
      renderStockList: () => {},
      renderShop: () => {},
      renderShopRecent: () => {},
      getAllCats: () => [],
      fmt: (n) => 'Rp ' + Math.round(n || 0),
    },
    [],
  );
  ctx.toastMessages = toastMessages;
  ctx.modalCalls = modalCalls;
  ctx.confirmMessages = confirmMessages;
  return ctx;
}

function makeD(accounts) {
  return { accounts, transactions: [], products: [], cobek: [] };
}

// Jumlah total saldo SEMUA akun yang diberikan (bukan totalSaldoAkun() app
// -- fungsi itu butuh OwnershipEngine/linkedAssetAccountIds yang tidak
// relevan buat audit murni double-entry ini; jumlah recalcAccBalance() per
// akun sudah cukup & 100% pakai logic SSOT asli dari akun.js).
function sumBalances(ctx, accIds) {
  ctx.invalidateAccBalCache();
  return accIds.reduce((s, id) => s + ctx.recalcAccBalance(id), 0);
}

// ---------------------------------------------------------------------
// Test 1 — transfer MODERN (transferPairId) tetap aman (kontrol positif,
// perilaku ini sudah benar sejak Sesi 432 -- HARUS tetap hijau).
// ---------------------------------------------------------------------
test('1. Transfer MODERN (transferPairId) — hapus 1 sisi -> KEDUA sisi terhapus, total saldo gabungan TIDAK berubah', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '50000', trNote: '', trDate: '2026-01-01' });
  const ctx = makeCtx(D, dom);

  const totalBefore = sumBalances(ctx, ['a1', 'a2']);
  ctx.saveTransfer();
  const totalAfterCreate = sumBalances(ctx, ['a1', 'a2']);
  assert.equal(totalAfterCreate, totalBefore, 'transfer seharusnya netral thd total saldo gabungan (uang cuma pindah akun)');

  const out = D.transactions.find((t) => t.type === 'transfer_out');
  await ctx.delTx(out.id);

  assert.equal(D.transactions.length, 0, 'transfer modern: kedua sisi harus ikut terhapus');
  const totalAfterDelete = sumBalances(ctx, ['a1', 'a2']);
  assert.equal(totalAfterDelete, totalBefore, 'setelah hapus transfer modern, total saldo gabungan harus KEMBALI ke titik awal (0 timpang)');
});

// ---------------------------------------------------------------------
// Test 2 — transfer LEGACY (tanpa transferPairId) bisa direproduksi:
// setup murni, tidak ada assertion terkait bug di sini.
// ---------------------------------------------------------------------
test('2. Transfer LEGACY tanpa transferPairId — dapat direproduksi (setup: 2 baris berlawanan, amount sama, TIDAK ada field transferPairId)', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  D.transactions = [
    { id: 't1', type: 'transfer_out', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a1' },
    { id: 't2', type: 'transfer_in', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a2' },
  ];
  assert.equal(D.transactions.length, 2);
  assert.equal(D.transactions[0].transferPairId, undefined, 't1 legacy tidak boleh punya transferPairId (mensimulasikan data pra-Sesi 432)');
  assert.equal(D.transactions[1].transferPairId, undefined, 't2 legacy tidak boleh punya transferPairId');
  assert.equal(D.transactions[0].amount, D.transactions[1].amount, 'kedua sisi harus nominal sama (ciri 1 pasang transfer)');
  assert.notEqual(D.transactions[0].accountId, D.transactions[1].accountId, 'kedua sisi harus akun berbeda (asal vs tujuan)');
});

// ---------------------------------------------------------------------
// Test 3a — BUG D FIXED: hapus sisi transfer LEGACY -> user diberi
// peringatan eksplisit (askConfirm dgn pesan legacy-warning) SEBELUM
// lanjut. Kalau user MENGONFIRMASI, perilaku hapus 1-sisi-saja tetap sama
// seperti sebelum s631 (0 auto-pairing/auto-delete transaksi lain -- lihat
// test 4 guard rail) -- bedanya sekarang user SADAR & mengambil keputusan
// itu secara eksplisit, bukan silent corruption.
// ---------------------------------------------------------------------
test('3a. Bug D FIXED — hapus sisi transfer LEGACY -> user diberi peringatan eksplisit dulu; kalau dikonfirmasi, 1 sisi terhapus (pasangan TETAP tidak diotak-atik otomatis)', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  D.transactions = [
    { id: 't1', type: 'transfer_out', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a1' },
    { id: 't2', type: 'transfer_in', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a2' },
  ];
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom); // default askConfirm: selalu setuju

  const totalBefore = sumBalances(ctx, ['a1', 'a2']);
  assert.equal(totalBefore, 700000, 'sanity check: baseBalance a1 (200000) + baseBalance a2 (500000) = 700000; transfer legacy t1/t2 netral (a1 -50000, a2 +50000, saling meniadakan di total)');

  await ctx.delTx('t1');

  // BUKTI FIX #1: user WAJIB diberi peringatan eksplisit ttg transfer
  // legacy sebelum penghapusan diproses -- bukan cuma dialog konfirmasi
  // hapus generik yang sama dgn transaksi biasa.
  assert.ok(
    ctx.confirmMessages.some((m) => /legacy|lama/i.test(m) && /pasangan/i.test(m)),
    'delTx() harus memanggil askConfirm() dgn pesan peringatan spesifik ttg transfer legacy tanpa pasangan otomatis, bukan cuma "Hapus transaksi ini?" generik'
  );

  // Perilaku hapus (SETELAH user konfirmasi) TETAP SAMA seperti sebelum
  // s631 -- 0 auto-pairing/auto-delete transaksi lain (fix-nya ada di
  // PERINGATANNYA, bukan di mengubah aksi hapus itu sendiri jadi
  // menebak-nebak pasangan).
  assert.equal(D.transactions.length, 1, 'sisi t2 (transfer_in di a2) tetap tidak ikut terhapus otomatis -- 0 heuristic auto-pairing diterapkan');
  assert.equal(D.transactions[0].id, 't2');

  // Konsekuensi yang SUDAH DIKETAHUI & DIINFORMASIKAN ke user (bukan lagi
  // silent corruption seperti sebelum s631): utk data legacy YANG SUDAH
  // ADA, total saldo gabungan tetap bisa bergeser krn pasangan tidak bisa
  // dipastikan otomatis TANPA heuristic berbahaya (lihat test 4) -- tapi
  // user SUDAH diberi tahu & sudah eksplisit setuju melanjutkan.
  const totalAfter = sumBalances(ctx, ['a1', 'a2']);
  assert.equal(totalAfter, 750000, 'utk data legacy yg SUDAH ADA (dibuat sebelum fix #1 modules-calc.js), total masih bisa bergeser -- tapi sekarang INFORMED trade-off (user sudah diperingatkan & setuju), bukan silent bug');
});

// ---------------------------------------------------------------------
// Test 3b — Bug D FIXED: kalau user MEMBATALKAN dialog peringatan legacy
// transfer, TIDAK ADA apa pun yang terhapus (non-destruktif, 0 mutasi).
// ---------------------------------------------------------------------
test('3b. Bug D FIXED — user MEMBATALKAN peringatan legacy transfer -> TIDAK ADA transaksi yang terhapus (non-destruktif)', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  D.transactions = [
    { id: 't1', type: 'transfer_out', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a1' },
    { id: 't2', type: 'transfer_in', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a2' },
  ];
  const dom = makeStatefulDom({});
  // Konfirmasi pertama ("Hapus transaksi ini?") -> setuju; konfirmasi
  // KEDUA (peringatan legacy-transfer spesifik) -> user MEMBATALKAN.
  let callCount = 0;
  const ctx = makeCtx(D, dom, () => { callCount++; return callCount < 2; });

  await ctx.delTx('t1');

  assert.equal(callCount, 2, 'delTx() harus memanggil askConfirm() 2x utk transfer legacy: konfirmasi hapus generik + peringatan legacy spesifik');
  assert.equal(D.transactions.length, 2, 'user membatalkan di dialog peringatan legacy -> 0 transaksi terhapus (baik t1 maupun t2 tetap utuh)');
  const totalAfter = sumBalances(ctx, ['a1', 'a2']);
  assert.equal(totalAfter, 700000, 'batal hapus -> saldo gabungan tidak berubah sama sekali');
});

// ---------------------------------------------------------------------
// Test 4 — Guard false-positive: 2 pasang transfer LEGACY BERBEDA yang
// kebetulan amount & date SAMA tidak boleh saling ke-pasangkan salah saat
// salah satu sisi dihapus (implementasi SAAT INI aman krn TIDAK ADA
// heuristic apa pun -- pairedTx cuma diisi dari transferPairId persis sama.
// Test ini adalah GUARD RAIL utk solusi Bug D di s631: heuristic apa pun
// yang dipakai nanti WAJIB tetap lolos test ini).
// ---------------------------------------------------------------------
test('4. Guard false-positive — 2 pasang transfer legacy BEDA dgn amount+date KEBETULAN sama -> hapus 1 sisi TIDAK boleh salah ikut menghapus/mengubah pasangan lain', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
    { id: 'a3', name: 'Ewallet', emoji: '📱', baseBalance: 300000 },
    { id: 'a4', name: 'Tabungan', emoji: '🏦', baseBalance: 100000 },
  ]);
  // Pasangan 1: a1 -> a2, 50000, 2026-01-01 (akan dihapus salah satu sisinya)
  // Pasangan 2: a3 -> a4, 50000, 2026-01-01 (SAMA PERSIS amount & date,
  // TIDAK BOLEH ikut ter-pengaruh -- entitas transfer yang SEPENUHNYA lain)
  D.transactions = [
    { id: 'p1_out', type: 'transfer_out', amount: 50000, category: 'Transfer', note: 'Pasangan 1', date: '2026-01-01', accountId: 'a1' },
    { id: 'p1_in', type: 'transfer_in', amount: 50000, category: 'Transfer', note: 'Pasangan 1', date: '2026-01-01', accountId: 'a2' },
    { id: 'p2_out', type: 'transfer_out', amount: 50000, category: 'Transfer', note: 'Pasangan 2', date: '2026-01-01', accountId: 'a3' },
    { id: 'p2_in', type: 'transfer_in', amount: 50000, category: 'Transfer', note: 'Pasangan 2', date: '2026-01-01', accountId: 'a4' },
  ];
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom);

  await ctx.delTx('p1_out');

  const remainingIds = D.transactions.map((t) => t.id).sort();
  assert.deepEqual(remainingIds, ['p1_in', 'p2_in', 'p2_out'], 'hanya p1_out yang boleh terhapus -- Pasangan 2 (p2_out & p2_in) harus UTUH, tidak boleh ikut kehapus/berubah walau amount & date kebetulan identik dgn Pasangan 1');
  const p2Out = D.transactions.find((t) => t.id === 'p2_out');
  const p2In = D.transactions.find((t) => t.id === 'p2_in');
  assert.equal(p2Out.accountId, 'a3');
  assert.equal(p2In.accountId, 'a4');
  assert.equal(p2Out.amount, 50000);
  assert.equal(p2In.amount, 50000);
});

// ---------------------------------------------------------------------
// Test 5 — transaksi biasa (bukan transfer) sama sekali tidak terpengaruh.
// ---------------------------------------------------------------------
test('5. Transaksi biasa (bukan transfer) — tidak terpengaruh sama sekali oleh logic pairing transfer', async () => {
  const D = makeD([{ id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 }]);
  D.transactions = [
    { id: 'x1', type: 'expense', amount: 20000, category: 'Makan', date: '2026-08-07', accountId: 'a1' },
    { id: 'x2', type: 'income', amount: 100000, category: 'Gaji', date: '2026-08-01', accountId: 'a1' },
  ];
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom);
  await ctx.delTx('x1');
  assert.equal(D.transactions.length, 1, 'hanya x1 yang dihapus, x2 tidak tersentuh');
  assert.equal(D.transactions[0].id, 'x2');
  assert.equal(ctx.confirmMessages.length, 1, 'transaksi biasa (bukan transfer) HANYA memicu 1x konfirmasi hapus generik -- peringatan legacy-transfer (s631) tidak boleh ikut ke-trigger utk tipe transaksi non-transfer');
});

// ---------------------------------------------------------------------
// Test 6 — S631 fix #1: sumber transfer dari modules-calc.js (Pensiun.
// catatKontribusi(), "Kontribusi Dana Pensiun") sekarang MENGISI
// transferPairId (sama dgn tx-transfer.js saveTransfer()), jadi transfer
// yang dibuat lewat jalur ini ikut aman dihapus 2-sisi-sekaligus lewat
// delTx() -- menutup sumber transfer legacy BARU yang ditemukan audit s630
// §2.4 (bukan cuma menangani data lama yang SUDAH ada).
// ---------------------------------------------------------------------
test('6. modules-calc.js Pensiun.catatKontribusi() — transfer yang dibuat SEKARANG mengisi transferPairId (pola sama dgn saveTransfer()), delTx() bisa hapus 2 sisi sekaligus', async () => {
  const D = {
    accounts: [
      { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
      { id: 'a2', name: 'Dana Pensiun', emoji: '🏖️', baseBalance: 500000 },
    ],
    transactions: [],
    products: [],
    cobek: [],
    pensiun: { accId: 'a2', kontribusiBulanan: 0 },
  };
  let uidCounter = 0;
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/modules-calc.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      uid: () => 'id_' + (uidCounter++),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      renderDashboard: () => {},
      renderKeuangan: () => {},
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      showPromptModal: async () => '75000',
      showChoiceModal: async () => 0,
    },
    ['Pensiun'],
  );

  await ctx.Pensiun.catatKontribusi();

  assert.equal(D.transactions.length, 2, 'catatKontribusi() harus tetap push 2 baris (transfer_out + transfer_in), 0 baris tambahan');
  const out = D.transactions.find((t) => t.type === 'transfer_out');
  const inn = D.transactions.find((t) => t.type === 'transfer_in');
  assert.ok(out, 'baris transfer_out harus ada');
  assert.ok(inn, 'baris transfer_in harus ada');
  assert.ok(out.transferPairId, 'S631 FIX: transfer_out dari modules-calc.js sekarang HARUS punya transferPairId (dulu tidak ada sama sekali, lihat audit s630 §2.4)');
  assert.equal(out.transferPairId, inn.transferPairId, 'kedua baris harus berbagi transferPairId yang SAMA (1 pasang), pola identik saveTransfer() di tx-transfer.js -- 0 sistem pairing baru diciptakan');
  assert.notEqual(out.transferPairId, out.id, 'transferPairId harus id BARU yang berbeda dari id masing-masing baris (sama seperti saveTransfer())');

  // Verifikasi end-to-end: transfer yang dibuat lewat jalur ini SEKARANG
  // aman dihapus 2-sisi-sekaligus lewat delTx() yang SAMA persis dipakai
  // transfer dari tx-transfer.js -- 0 kode delTx() baru dibutuhkan, karena
  // transferPairId adalah mekanisme canonical yang SUDAH dikenali delTx().
  const dom = makeStatefulDom({});
  const delCtx = makeCtx(D, dom);
  await delCtx.delTx(out.id);
  assert.equal(D.transactions.length, 0, 'kedua sisi transfer dari modules-calc.js ikut terhapus sekaligus lewat delTx() -- 0 orphan, krn sekarang transferPairId terisi sejak CREATE');
});
