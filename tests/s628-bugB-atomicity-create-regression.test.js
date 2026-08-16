'use strict';
/**
 * s628-bugB-atomicity-create-regression.test.js — Audit Bug B (atomicity
 * transaksi), jalur CREATE _saveTxInner() (modules/finance/transaksi.js).
 *
 * LATAR BELAKANG (lihat PATCH-s628-bugB-audit-tests.zip README utk audit
 * lengkap): pada jalur CREATE generik (curPayMethod==='tunai', bukan
 * cicilan/langganan/edit), _saveTxInner() melakukan `D.transactions.push
 * (newTx)` (transaksi.js baris ~1602) LEBIH DAHULU, baru kemudian
 * menjalankan serangkaian side-effect SINKRON tanpa try/catch:
 *
 *   D.transactions.push(newTx)
 *   -> applyTxTitipanLinkageOnSave(newTx,null)  [no-op utk CREATE generik --
 *      early-return krn newTx belum punya titipanLinkId; TIDAK controllable
 *      dari test ini, lihat catatan di makeCtx()]
 *   -> WorthIt.applyBuyLink(savedTxId)
 *   -> SewaKios.applyPaymentLink(savedTxId)
 *   -> Tukang.applyPendingPayment(savedTxId)
 *   -> applyTxStockFromTx(...)         [mutasi D.partsStock/D.sparepartCats]
 *   -> applyTxServisFromTx(...)        [mutasi D.servisLogs]
 *   -> applyTxBbmFromTx(...)           [mutasi D.bbmLogs]
 *   -> applyTxShopStockFromTx(...)     [mutasi D.products]
 *   -> applyTxShopSaleFromTx(...)      [mutasi D.cobek]
 *   -> applyTxRenovFromTx(...)         [mutasi D.renovasi/renovProjects]
 *   -> save() + render*()              [titik commit/persist]
 *
 * saveTx() (pembungkus publik) HANYA punya try/finally (mereset flag
 * `_txSaving`), BUKAN try/catch -- kalau salah satu side-effect di atas
 * throw, eksekusi berhenti DI TENGAH: `D.transactions` sudah terlanjur
 * berisi `newTx` (partial state), tapi save()/render tidak pernah
 * terpanggil, dan mutasi domain lain yang SUDAH sempat jalan sebelum titik
 * error (mis. stok sparepart sudah bertambah) TIDAK PERNAH di-rollback.
 * Retry oleh user (chip Simpan ditekan lagi) akan membuat `newTx` KEDUA
 * (uid() baru), karena `txEditId` masih null dan `existingTx` yang lama
 * tidak pernah "diketahui" sebagai draft gagal -- inilah duplicate
 * transaction yang dilaporkan.
 *
 * Test-test di bawah ini MENDOKUMENTASIKAN PERILAKU YANG BENAR (atomicity
 * penuh: gagal di titik manapun => 0 perubahan state, retry => tepat 1
 * transaksi). Sesi ini (s628) SENGAJA TIDAK mengubah production code
 * (lihat instruksi sesi) -- assertion "state harus rollback penuh" pada
 * test 2/3/4/5 DIHARAPKAN GAGAL (red) melawan transaksi.js saat ini; itu
 * adalah bukti Bug B, bukan bug di test. Test 1 & 6 (jalur sukses normal)
 * HARUS tetap hijau -- itu baseline "0 regresi perilaku sukses" yang wajib
 * dipertahankan oleh implementasi s629 nanti.
 *
 * Pola harness: sama seperti tests/s436-tx-renov-e2e-real.test.js dan
 * tests/s574-d2-deduction-owner-persist-validation.test.js -- load source
 * ASLI modules/finance/transaksi.js lewat loadSource(), mock semua
 * side-effect eksternal (bukan re-implementasi transaksi.js), dan di sini
 * beberapa mock dibuat BISA DIPAKSA throw() secara terkontrol utk
 * mensimulasikan kegagalan di titik tertentu dalam urutan side-effect.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    els[id] = (typeof v === 'boolean') ? { checked: v } : { value: v };
  });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '150000', txSubCat: '', txDate: '2026-08-10', txNote: 'Beli galon',
    txCat: 'Rumah Tangga', txAcc: 'a1',
  }, overrides);
}

/**
 * @param {object} opts
 * @param {string} [opts.failStep] - nama step di SIDE_EFFECT_ORDER yang harus throw.
 *   undefined => jalur sukses normal (tidak ada yang throw).
 */
function makeCtx({ D, calls, failStep, txEditId = null }) {
  const { doc } = makeFakeDoc(baseFields());

  // Mock tiap side-effect: catat pemanggilannya ke `calls` (urutan +
  // domain-mutation ringan supaya bisa diverifikasi "sudah jalan/belum"),
  // lalu throw kalau namanya === failStep.
  function sideEffect(name, mutate) {
    return (...args) => {
      calls.push({ step: name });
      if (name === failStep) {
        throw new Error(`Simulated failure at ${name}`);
      }
      if (mutate) mutate(...args);
    };
  }

  return loadSource(
    ['modules/finance/transaksi.js'],
    {
      document: doc,
      D,
      curPayMethod: 'tunai',
      curTxType: 'expense',
      txEditId,
      _txPayMethodTouchedByUser: false,
      _txCatLearnSource: null,
      evalAmtExpr: () => {},
      toast: (m, dur) => calls.push({ msg: m, dur }),
      save: () => calls.push({ save: true }),
      closeModal: (id) => calls.push({ closeModal: id }),
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderCnTab: () => {},
      rememberLastAccForCat: () => {},
      AIBus: { emit: () => {} },
      sameId: (a, b) => String(a) === String(b),
      findPossibleDuplicateTx: () => null,
      uid: (() => { let n = 5000; return () => (n += 1); })(),
      escapeHtml: (s) => s,

      // --- side-effects terkontrol (urutan sesuai SIDE_EFFECT_ORDER) ---
      // CATATAN: applyTxTitipanLinkageOnSave SENGAJA TIDAK di-mock di sini --
      // transaksi.js sendiri MENDEFINISIKAN fungsi itu (baris ~85), jadi
      // function declaration di source ASLI (dimuat via loadSource) akan
      // MENIMPA global yang di-inject lewat extraGlobals begitu vm sandbox
      // dieksekusi (hoisting function declaration script-level). Karena
      // real impl-nya early-return no-op utk newTx yang belum punya
      // titipanLinkId (kasus CREATE generik di test ini), step ini TIDAK
      // controllable & TIDAK muncul di `calls` -- dikeluarkan dari
      // SIDE_EFFECT_ORDER, titik gagal "pertama" yang terkontrol dimulai
      // dari 'worthit'.
      WorthIt: { applyBuyLink: sideEffect('worthit') },
      SewaKios: { applyPaymentLink: sideEffect('sewakios') },
      Tukang: { applyPendingPayment: sideEffect('tukang') },
      applyTxStockFromTx: sideEffect('stok', () => { D.partsStock.push({ id: 'sp_new', fromTx: true }); }),
      applyTxServisFromTx: sideEffect('servis', () => { D.servisLogs.push({ id: 'sv_new', fromTx: true }); }),
      applyTxBbmFromTx: sideEffect('bbm', () => { D.bbmLogs.push({ id: 'bb_new', fromTx: true }); }),
      applyTxShopStockFromTx: sideEffect('shopstock', () => { D.products.push({ id: 'pr_new', fromTx: true }); }),
      applyTxShopSaleFromTx: sideEffect('shopsale', () => { D.cobek.push({ id: 'cb_new', fromTx: true }); }),
      applyTxRenovFromTx: sideEffect('renov', () => { D.renovasi.push({ id: 'rv_new', fromTx: true }); }),
    },
  );
}

// Urutan side-effect PERSIS seperti dieksekusi _saveTxInner() jalur CREATE
// generik (lihat komentar file header) -- dipakai test 2/3/4 utk memilih
// titik gagal "pertama"/"tengah"/"terakhir".
const SIDE_EFFECT_ORDER = ['worthit', 'sewakios', 'tukang', 'stok', 'servis', 'bbm', 'shopstock', 'shopsale', 'renov'];

function freshD() {
  return {
    transactions: [], accounts: [{ id: 'a1', name: 'Cash' }],
    partsStock: [], servisLogs: [], bbmLogs: [], products: [], cobek: [], renovasi: [],
  };
}

// ---------------------------------------------------------------------
// Test 1 — CREATE normal, semua side-effect sukses -> transaksi tersimpan
// ---------------------------------------------------------------------
test('1. CREATE biasa — semua side-effect sukses -> transaksi tersimpan, save() terpanggil tepat 1x', async () => {
  const D = freshD();
  const calls = [];
  const ctx = makeCtx({ D, calls }); // failStep undefined -> tidak ada yang throw

  await ctx._saveTxInner();

  assert.equal(D.transactions.length, 1, 'transaksi harus tersimpan');
  assert.equal(D.transactions[0].amount, 150000);
  const saveCalls = calls.filter((c) => c.save);
  assert.equal(saveCalls.length, 1, 'save() harus terpanggil tepat 1x pada jalur sukses');
  const stepsRun = calls.filter((c) => c.step).map((c) => c.step);
  assert.deepEqual(stepsRun, SIDE_EFFECT_ORDER, 'semua side-effect harus jalan berurutan sesuai SIDE_EFFECT_ORDER pada jalur sukses');
});

// ---------------------------------------------------------------------
// Test 2 — side-effect PERTAMA gagal
// ---------------------------------------------------------------------
test('2. CREATE — side-effect pertama gagal -> transaksi TIDAK boleh tertinggal sebagai partial state', async () => {
  const D = freshD();
  const calls = [];
  const ctx = makeCtx({ D, calls, failStep: 'worthit' }); // step pertama yang controllable dalam SIDE_EFFECT_ORDER

  await assert.rejects(() => ctx._saveTxInner(), /Simulated failure at worthit/);

  // PERILAKU YANG BENAR (diharapkan GAGAL melawan implementasi saat ini --
  // ini bukti Bug B): D.transactions.push(newTx) terjadi SEBELUM step
  // 'worthit' (step controllable pertama), jadi tanpa rollback newTx tetap nyangkut di D.transactions
  // walau saved gagal total.
  assert.equal(D.transactions.length, 0, 'BUG B: transaksi tidak boleh tertinggal sebagai partial state saat side-effect pertama gagal');

  const saveCalls = calls.filter((c) => c.save);
  assert.equal(saveCalls.length, 0, 'save() tidak boleh terpanggil kalau gagal (ini sudah benar di implementasi saat ini)');
});

// ---------------------------------------------------------------------
// Test 3 — side-effect TENGAH gagal
// ---------------------------------------------------------------------
test('3. CREATE — side-effect tengah gagal -> mutation sebelum error rollback, mutation sesudah TIDAK terjadi', async () => {
  const D = freshD();
  const calls = [];
  // 'bbm' ada di tengah urutan: stok & servis sudah sukses mutasi
  // (D.partsStock/D.servisLogs bertambah) sebelum bbm throw; shopstock/
  // shopsale/renov (sesudah bbm) TIDAK boleh sempat jalan.
  const ctx = makeCtx({ D, calls, failStep: 'bbm' });

  await assert.rejects(() => ctx._saveTxInner(), /Simulated failure at bbm/);

  const stepsRun = calls.filter((c) => c.step).map((c) => c.step);
  assert.deepEqual(stepsRun, ['worthit', 'sewakios', 'tukang', 'stok', 'servis', 'bbm'], 'step SESUDAH titik gagal (shopstock/shopsale/renov) tidak boleh sempat terpanggil');

  // PERILAKU YANG BENAR (diharapkan GAGAL melawan implementasi saat ini):
  assert.equal(D.transactions.length, 0, 'BUG B: transaksi tidak boleh persisted sebagai partial state');
  assert.equal(D.partsStock.length, 0, 'BUG B: mutasi D.partsStock dari step "stok" (sebelum error) harus di-rollback');
  assert.equal(D.servisLogs.length, 0, 'BUG B: mutasi D.servisLogs dari step "servis" (sebelum error) harus di-rollback');
  // Mutasi SESUDAH titik error memang tidak pernah jalan (konsisten dgn implementasi saat ini juga)
  assert.equal(D.products.length, 0);
  assert.equal(D.cobek.length, 0);
  assert.equal(D.renovasi.length, 0);
});

// ---------------------------------------------------------------------
// Test 4 — side-effect TERAKHIR gagal
// ---------------------------------------------------------------------
test('4. CREATE — side-effect terakhir gagal -> state harus kembali ke kondisi sebelum transaksi (full rollback)', async () => {
  const D = freshD();
  const calls = [];
  const ctx = makeCtx({ D, calls, failStep: 'renov' }); // step terakhir sebelum save()

  await assert.rejects(() => ctx._saveTxInner(), /Simulated failure at renov/);

  const stepsRun = calls.filter((c) => c.step).map((c) => c.step);
  assert.deepEqual(stepsRun, SIDE_EFFECT_ORDER, 'semua step SEBELUM renov harus sempat jalan (renov step terakhir)');

  // PERILAKU YANG BENAR (diharapkan GAGAL melawan implementasi saat ini):
  // hampir SEMUA side-effect lain sudah sukses mutasi domain masing-masing
  // sebelum 'renov' throw -- kalau tidak di-rollback, ini state paling
  // "kotor" dari 3 skenario failure (hampir semua domain ikut kena).
  assert.equal(D.transactions.length, 0, 'BUG B: harus kembali 0 transaksi (state sebelum transaksi)');
  assert.equal(D.partsStock.length, 0, 'BUG B: mutasi stok harus rollback');
  assert.equal(D.servisLogs.length, 0, 'BUG B: mutasi servis harus rollback');
  assert.equal(D.bbmLogs.length, 0, 'BUG B: mutasi BBM harus rollback');
  assert.equal(D.products.length, 0, 'BUG B: mutasi shop stock harus rollback');
  assert.equal(D.cobek.length, 0, 'BUG B: mutasi shop sale harus rollback');
  assert.equal(D.renovasi.length, 0, 'renov sendiri gagal di titik mutasi -> memang tidak pernah sempat push');
});

// ---------------------------------------------------------------------
// Test 5 — retry setelah failure: 1x retry input sama -> tepat 1 transaksi
// ---------------------------------------------------------------------
test('5. Retry setelah failure — retry 1x dengan input sama harus menghasilkan TEPAT SATU transaksi (bukan duplicate)', async () => {
  const D = freshD();
  const calls = [];

  // Percobaan pertama: gagal di tengah (spt user tap Simpan saat kondisi
  // sedang error, mis. servis belum sempat commit).
  const ctx1 = makeCtx({ D, calls, failStep: 'servis' });
  await assert.rejects(() => ctx1._saveTxInner(), /Simulated failure at servis/);

  // Retry (percobaan kedua, INPUT SAMA): kali ini kondisi sudah membaik,
  // side-effect tidak ada yang gagal.
  const ctx2 = makeCtx({ D, calls, failStep: undefined });
  await ctx2._saveTxInner();

  // PERILAKU YANG BENAR (diharapkan GAGAL melawan implementasi saat ini):
  // percobaan pertama SEHARUSNYA 0 transaksi tertinggal (rollback, lihat
  // test 3), jadi retry menghasilkan PERSIS 1 transaksi total.
  assert.equal(D.transactions.length, 1, 'BUG B: retry 1x setelah failure harus menghasilkan TEPAT 1 transaksi, bukan 2 (duplicate)');
});

// ---------------------------------------------------------------------
// Test 6 — jalur sukses normal harus identik dgn existing implementation
// ---------------------------------------------------------------------
test('6. Jalur sukses normal — behavior identik dgn existing implementation (0 regresi, baseline utk s629)', async () => {
  const D = freshD();
  const calls = [];
  const ctx = makeCtx({ D, calls }); // tidak ada failStep

  await ctx._saveTxInner();

  assert.equal(D.transactions.length, 1);
  const newTx = D.transactions[0];
  assert.equal(newTx.type, 'expense');
  assert.equal(newTx.amount, 150000);
  assert.equal(newTx.accountId, 'a1');
  assert.equal(newTx.payMethod, 'tunai');
  assert.equal(D.partsStock.length, 1, 'side-effect stok harus tetap jalan normal saat sukses');
  assert.equal(D.servisLogs.length, 1);
  assert.equal(D.bbmLogs.length, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.cobek.length, 1);
  assert.equal(D.renovasi.length, 1);

  const closeModalCalls = calls.filter((c) => c.closeModal);
  assert.equal(closeModalCalls.length, 1, 'closeModal harus terpanggil tepat 1x pada jalur sukses (0 regresi)');
  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1, 'HANYA SATU toast final pada jalur sukses (pola s436, 0 regresi)');
  assert.match(toastCalls[0].msg, /✅ Transaksi tersimpan/);
});
