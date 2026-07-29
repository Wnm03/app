// modules/finance/cashflow-projection-api.js — Cash Flow Projection API
// (Sesi 93, Batch 10). Target sesi: Cash Flow Projection Foundation —
// lihat docs/BATCH_PLAN.md § Batch 10.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE FinancialForecastAPI.summary()
// (modules/finance/financial-forecast-api.js, Sesi 91 — sendiri 100%
// reuse FinanceDashboard.getAIHook()/FinanceIntelligence, Sesi 74/75) —
// TIDAK ada rumus baru, TIDAK duplikasi logic, TIDAK framework baru,
// TIDAK mengubah struktur data D, TIDAK membaca D/FinanceDashboard/
// FinanceIntelligence langsung sama sekali di file ini — SATU-SATUNYA
// titik akses adalah FinancialForecastAPI.
//
// Income Projection/Expense Projection/Cash Balance Forecast di bawah
// BUKAN hasil hitungan baru — ketiganya murni MEMBACA ULANG field yang
// SUDAH FINAL dari `FinancialForecastAPI.summary()` (yang sendiri sudah
// membaca ulang `incAvg`/`expAvg`/`saldoNow`/`projected`/`billsDue`/
// `upcoming` dari `computeCashflowForecast()`) apa adanya, ditambah
// pemberian nama presentasional (BUKAN kategori/rumus baru) yang lebih
// spesifik ke domain cash flow (dibanding penamaan umum
// income/expense/cashflowProjection milik FinancialForecastAPI sendiri).
// Pola arsitektur SAMA PERSIS FinancialForecastAPI sendiri (satu pintu
// masuk yang meneruskan field dari layer di bawahnya apa adanya) —
// lapisan wrapper di atas wrapper, konsisten dgn DecisionCenterAPI
// (modules/cross/decision-center-api.js, Sesi 90) yang juga menumpuk
// beberapa layer summary tanpa recompute.
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (CashFlowProjectionPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const CashFlowProjectionAPI = {

// _forecast() — helper internal: satu titik akses ke
// FinancialForecastAPI.summary(). Guard berlapis (FinancialForecastAPI
// belum dimuat / summary() {ok:false}) — SEMUA diteruskan apa adanya,
// pola sama persis FinancialForecastAPI._cashflow() meneruskan {ok:false}
// dari FinanceDashboard.getAIHook().
_forecast() {
  if (typeof FinancialForecastAPI === 'undefined') {
    return { ok: false, reason: 'FinancialForecastAPI belum dimuat' };
  }
  const s = FinancialForecastAPI.summary();
  if (!s || !s.ok) {
    return s || { ok: false, reason: 'financial forecast tidak tersedia' };
  }
  return s;
},

// incomeProjection() — Income Projection. Field dibaca APA ADANYA dari
// `FinancialForecastAPI.summary().income` (yang sendiri sudah 100% reuse
// `incAvg`/`months`/`currentMonth.income` dari computeCashflowForecast()/
// FinanceIntelligence) — 0 rata-rata dihitung ulang di sini.
incomeProjection() {
  const f = this._forecast();
  if (!f.ok) return f;
  return {
    ok: true,
    avgMonthly: f.income.avgMonthly,
    months: f.income.months,
    currentMonthIncome: f.income.currentMonthIncome,
  };
},

// expenseProjection() — Expense Projection. Pola SAMA PERSIS
// incomeProjection() di atas, cuma sisi expense (dibaca dari
// `FinancialForecastAPI.summary().expense` apa adanya).
expenseProjection() {
  const f = this._forecast();
  if (!f.ok) return f;
  return {
    ok: true,
    avgMonthly: f.expense.avgMonthly,
    months: f.expense.months,
    currentMonthExpense: f.expense.currentMonthExpense,
  };
},

// cashBalanceForecast() — Cash Balance Forecast. Field dibaca APA ADANYA
// dari `FinancialForecastAPI.summary().cashflowProjection` (yang sendiri
// sudah 100% reuse `saldoNow`/`projected`/`billsDue`/`upcomingCount` dari
// computeCashflowForecast()) — 0 proyeksi dihitung ulang di sini.
cashBalanceForecast() {
  const f = this._forecast();
  if (!f.ok) return f;
  return {
    ok: true,
    saldoNow: f.cashflowProjection.saldoNow,
    projected: f.cashflowProjection.projected,
    billsDue: f.cashflowProjection.billsDue,
    upcomingCount: f.cashflowProjection.upcomingCount,
  };
},

// summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
// masa depan), murni memanggil ke-3 fungsi di atas, TIDAK ada logic
// tambahan. `ok` true hanya kalau ketiganya ok (pola sama persis
// FinancialForecastAPI.summary() yang juga expose `ok` gabungan di level
// teratas).
summary() {
  const income = this.incomeProjection();
  const expense = this.expenseProjection();
  const cashBalance = this.cashBalanceForecast();
  return {
    ok: !!(income.ok && expense.ok && cashBalance.ok),
    income,
    expense,
    cashBalance,
  };
},

};
