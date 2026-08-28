'use strict';
// tests/hitungkas-normalisasi-financial-calc.test.js — Sesi Normalisasi hitungKas
// (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md, Sesi T4+). Cakupan: 5 titik
// modules/shared/modules-calc.js + 2 titik modules/ai/feature-insights.js yang
// ditambah guard `t.hitungKas!==false` supaya transaksi Tunai "Catatan saja"
// (tx.hitungKas:false, dari toggle Sesi T1) tidak ikut agregasi kas di rantai
// FI/SalaryAllocation/DanaDaruratAI/FinCoach/KeuanganInsight.
//
// Pola guard: default `true` bila field absen (0 migrasi data) -- makanya semua
// assert di sini SELALU pasang transaksi TANPA field hitungKas sama sekali di
// sebelah transaksi hitungKas:false, supaya kepastian "absen = tetap kehitung"
// ikut diverifikasi (bukan cuma "false = tidak kehitung").
//
// Nominal SENGAJA dibuat TIDAK simetris antara income & expense (mis. income
// 900rb vs expense 300rb, bukan 500rb vs 500rb) -- kalau simetris, bug guard yang
// californ cuma di salah satu sisi (misal cuma exp yang lupa difilter) bisa
// menghasilkan hasil akhir yang kebetulan sama juga dgn versi ter-guard penuh,
// jadi false-negative. Ketidaksimetrisan memastikan test benar2 red kalau
// SALAH SATU sisi saja lupa di-guard.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadCalc(D) {
  // budget.js (definisi Budget/budgetMatchesTx) dimuat SEBELUM modules-calc.js,
  // sama seperti urutan produksi di scripts/build.js -- FI.annualExpense() &
  // KeuanganInsight.compute() (cek anggaran) sama-sama butuh budgetMatchesTx.
  // FI/SalaryAllocation/DanaDaruratAI/FinCoach dideklarasikan `const` di top-level
  // modules-calc.js -- harus diminta eksplisit lewat parameter `expose`.
  return loadSource(
    ['budget.js', 'modules/shared/modules-calc.js'],
    { D, fmtFull: fmtFullStub },
    ['FI', 'SalaryAllocation', 'DanaDaruratAI', 'FinCoach']
  );
}

function loadInsights(D) {
  return loadSource(
    ['budget.js', 'modules/shared/modules-calc.js', 'modules/ai/feature-insights.js'],
    { D, fmtFull: fmtFullStub, escapeHtml: (s) => s },
    ['FI', 'SalaryAllocation', 'DanaDaruratAI', 'FinCoach', 'KeuanganInsight']
  );
}

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    budgets: [],
    workDays: [],
    finansialFreedom: {},
    categories: { income: [], expense: [] }, // Budget.getCatInfoById() baca ini
  }, overrides);
}

// fmtFull — dipakai FinCoach.compute() (blok "all-good" & lain-lain) untuk format
// nominal ke string; di app asli didefinisikan di features-helpers-global-security.js.
// Stub sederhana cukup untuk test ini (nilainya tidak diassert, cuma harus tidak throw).
function fmtFullStub(n) { return String(n); }

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const dInMonth = new Date(y, m, 10).toISOString().slice(0, 10);

// --- 1. FI.annualExpense() ---

test('FI.annualExpense() — expense hitungKas:false TIDAK ikut, expense tanpa field (absen) TETAP ikut', () => {
  const D = makeD({
    transactions: [
      { type: 'expense', category: 'Makan', amount: 300000, date: dInMonth }, // absen -> ikut
      { type: 'expense', category: 'Makan', amount: 900000, date: dInMonth, hitungKas: false }, // catatan saja -> exclude
    ],
    finansialFreedom: { avgMonths: 1 },
  });
  const { FI } = loadCalc(D);
  // effectiveMonths()=1 (avgMonths=1, monthsOfDataAvailable minimal 1) -> annualExpense = total*12/1... months di sini dipakai sbg divisor lalu *12, tapi karena cuma 1 bulan data, months efektif = min(avgMonths, monthsOfDataAvailable).
  const result = FI.annualExpense();
  // Hanya 300000 yang boleh ikut (bukan 300000+900000=1200000)
  assert.equal(result, 300000 * 12);
});

// --- 2. FI.monthlySurplus() ---

test('FI.monthlySurplus() — income & expense hitungKas:false SAMA-SAMA dikecualikan (bukan cuma salah satu sisi)', () => {
  const D = makeD({
    transactions: [
      { type: 'income', amount: 1000000, date: dInMonth }, // absen -> ikut
      { type: 'income', amount: 5000000, date: dInMonth, hitungKas: false }, // exclude
      { type: 'expense', amount: 300000, date: dInMonth }, // absen -> ikut
      { type: 'expense', amount: 2000000, date: dInMonth, hitungKas: false }, // exclude
    ],
    finansialFreedom: { avgMonths: 1 },
  });
  const { FI } = loadCalc(D);
  const surplus = FI.monthlySurplus();
  // (1000000-300000)/1 = 700000, BUKAN (1000000+5000000-300000-2000000)=3700000
  assert.equal(surplus, 700000);
});

test('FI.monthlySurplus() — transaksi TANPA field hitungKas (absen) tetap ikut dihitung penuh (backward-compat, 0 migrasi data)', () => {
  const D = makeD({
    transactions: [
      { type: 'income', amount: 1000000, date: dInMonth },
      { type: 'expense', amount: 300000, date: dInMonth },
    ],
    finansialFreedom: { avgMonths: 1 },
  });
  const { FI } = loadCalc(D);
  assert.equal(FI.monthlySurplus(), 700000);
});

// --- 3. SalaryAllocation.avgMonthlyIncome() ---

test('SalaryAllocation.avgMonthlyIncome() — income hitungKas:false tidak menaikkan rata-rata gaji bulanan', () => {
  const D = makeD({
    transactions: [
      { type: 'income', amount: 900000, date: dInMonth }, // absen -> ikut
      { type: 'income', amount: 5000000, date: dInMonth, hitungKas: false }, // exclude
    ],
    finansialFreedom: { avgMonths: 1 },
  });
  const { SalaryAllocation } = loadCalc(D);
  assert.equal(SalaryAllocation.avgMonthlyIncome(), 900000);
});

test('SalaryAllocation.avgMonthlyIncome() — income TANPA field hitungKas (absen) tetap terhitung penuh (backward-compat, 0 migrasi data)', () => {
  const D = makeD({
    transactions: [
      { type: 'income', amount: 900000, date: dInMonth },
    ],
    finansialFreedom: { avgMonths: 1 },
  });
  const { SalaryAllocation } = loadCalc(D);
  assert.equal(SalaryAllocation.avgMonthlyIncome(), 900000);
});

// --- 4. DanaDaruratAI.computeRecommendation() ---

test('DanaDaruratAI.computeRecommendation() — income hitungKas:false tidak ikut hitungan CV volatilitas income bulanan', () => {
  // 3 bulan data konsisten 900000 (absen) tiap bulan -> CV rendah (stabil).
  // Ditambah 1 transaksi hitungKas:false nominal jomplang (9000000) di bulan
  // berjalan -- kalau guard lupa dipasang, CV akan melonjak (income "kelihatan"
  // sangat tidak stabil) dan mengubah rekomendasi (multiplier CV).
  const txs = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(y, m - i, 10).toISOString().slice(0, 10);
    txs.push({ type: 'income', amount: 900000, date: d });
  }
  txs.push({ type: 'income', amount: 9000000, date: dInMonth, hitungKas: false });
  const D = makeD({ transactions: txs, finansialFreedom: { avgMonths: 3 } });
  const { DanaDaruratAI } = loadCalc(D);
  const rec = DanaDaruratAI.computeRecommendation();
  // Income stabil (900rb x3, CV~0) -> multiplier CV harus tetap di jalur "stabil"
  // (bukan naik karena dianggap volatile oleh transaksi catatan-saja 9jt).
  assert.ok(rec.cv === null || rec.cv < 0.1, `CV harus rendah/stabil, dapat: ${rec.cv}`);
});

// --- 5. FinCoach.compute() fallback txM ---

test('FinCoach.compute() fallback txM (tanpa ctx) — transaksi hitungKas:false tidak ikut inc/exp bulan berjalan, sehingga tidak memicu sinyal defisit palsu', () => {
  // PENTING: sinyal 'defisit' SEKARANG satu-satunya sumbernya KeuanganInsight.compute()
  // (dipanggil dari dalam FinCoach.compute() via typeof-guard) -- kalau modul ini di-load
  // TERPISAH dari feature-insights.js, KeuanganInsight undefined, sinkronnya di-skip diam2
  // (try/catch), dan assert 'tidak ada defisit' akan SELALU lolos apapun isi txM-nya
  // (false-positive, tidak benar2 menguji fix -- ini salah satu dari 2 false-positive yang
  // ditemukan & diperbaiki saat verifikasi red/green sesi ini). Makanya di sini WAJIB pakai
  // loadInsights() (muat modules-calc.js + feature-insights.js bareng), bukan loadCalc().
  const D = makeD({
    transactions: [
      { type: 'income', amount: 900000, date: dInMonth }, // absen -> ikut
      { type: 'expense', amount: 300000, date: dInMonth }, // absen -> ikut, inc>exp -> aman, 0 defisit
      { type: 'expense', amount: 5000000, date: dInMonth, hitungKas: false }, // exclude -- kalau lolos, akan bikin defisit palsu
    ],
  });
  const { FinCoach } = loadInsights(D);
  const insights = FinCoach.compute(); // tanpa ctx -> pakai fallback txM
  const defisit = insights.find((x) => x.id === 'defisit');
  assert.equal(defisit, undefined, 'tidak boleh ada sinyal defisit -- expense besar itu cuma catatan (hitungKas:false)');
});

test('FinCoach.compute() dengan ctx.txM eksplisit (sudah difilter di renderDashboard()) — tetap dihormati, 0 filter ulang di sini', () => {
  // ctx.txM dianggap SUDAH bersih dari pemanggil (renderDashboard()); FinCoach TIDAK
  // boleh memfilter ulang txM yang dioper via ctx (guard cuma ada di fallback
  // construction, bukan di pemakaian txM setelahnya) -- ini backward-compat pola ctx.
  const D = makeD({ transactions: [] });
  const { FinCoach } = loadCalc(D);
  const txM = [
    { type: 'income', amount: 100, date: dInMonth, hitungKas: false }, // sengaja "kotor", tapi via ctx eksplisit -> tetap dipakai apa adanya
  ];
  const insights = FinCoach.compute({ now, m, y, txM, inc: 100, exp: 0 });
  // Tidak crash & tidak melempar -- FinCoach hanya mengonsumsi inc/exp yang dioper.
  assert.ok(Array.isArray(insights));
});

// --- 6. KeuanganInsight.compute() fallback txM ---

test('KeuanganInsight.compute() fallback txM (tanpa ctx) — expense hitungKas:false tidak memicu sinyal defisit palsu', () => {
  const D = makeD({
    transactions: [
      { type: 'income', amount: 900000, date: dInMonth },
      { type: 'expense', amount: 300000, date: dInMonth },
      { type: 'expense', amount: 5000000, date: dInMonth, hitungKas: false },
    ],
  });
  const { KeuanganInsight } = loadInsights(D);
  const out = KeuanganInsight.compute();
  const defisit = out.find((x) => x.id === 'defisit');
  assert.equal(defisit, undefined);
});

// --- 7. KeuanganInsight.compute() — cek anggaran (baca D.transactions langsung) ---

test('KeuanganInsight.compute() cek anggaran — expense hitungKas:false tidak dihitung sbg pemakaian anggaran (%), tidak memicu sinyal anggaran jebol palsu', () => {
  const D = makeD({
    transactions: [
      // absen -> ikut hitung pemakaian: 300000 dari limit 1000000 = 30% (aman, <80%)
      { type: 'expense', category: 'cat1', amount: 300000, date: dInMonth },
      // hitungKas:false -> exclude. Kalau lolos, total jadi 300000+900000=1200000 (120%, OVER)
      { type: 'expense', category: 'cat1', amount: 900000, date: dInMonth, hitungKas: false },
    ],
    budgets: [{ id: 'b1', name: 'Anggaran Cat1', catIds: ['cat1'], limit: 1000000 }],
  });
  const { KeuanganInsight } = loadInsights(D);
  const out = KeuanganInsight.compute();
  const budgetSignal = out.find((x) => x.id === 'budget-b1');
  assert.equal(budgetSignal, undefined, 'pemakaian anggaran seharusnya 30% (aman), bukan 120% (OVER) -- expense catatan-saja tidak boleh ikut');
});

test('KeuanganInsight.compute() cek anggaran — expense TANPA field hitungKas (absen) tetap ikut dihitung penuh, memicu sinyal anggaran jebol kalau memang jebol (backward-compat)', () => {
  const D = makeD({
    transactions: [
      { type: 'expense', category: 'cat1', amount: 1200000, date: dInMonth }, // absen, 120% dari limit
    ],
    budgets: [{ id: 'b1', name: 'Anggaran Cat1', catIds: ['cat1'], limit: 1000000 }],
  });
  const { KeuanganInsight } = loadInsights(D);
  const out = KeuanganInsight.compute();
  const budgetSignal = out.find((x) => x.id === 'budget-b1');
  assert.ok(budgetSignal, 'transaksi tanpa field hitungKas (absen=true) harus tetap kehitung penuh -- 0 migrasi data');
  assert.match(budgetSignal.text, /OVER/);
});
