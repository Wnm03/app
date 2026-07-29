// modules/finance/financial-forecast-api.js — Financial Forecast API
// (Sesi 91, Batch 10). Target sesi: Financial Forecast Foundation — lihat
// docs/BATCH_PLAN.md § Batch 10.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE FinanceDashboard.getAIHook()
// (modules/finance/finance-dashboard.js, Sesi 75 — WRAPPER TIPIS ke
// FinanceIntelligence.summary(), Sesi 74) — TIDAK ada rumus baru, TIDAK
// duplikasi logic, TIDAK framework baru, TIDAK mengubah struktur data D,
// TIDAK membaca D langsung sama sekali di file ini.
//
// Income Forecast/Expense Forecast/Cash Flow Projection di bawah BUKAN
// hasil hitungan baru — ketiganya murni membaca ulang field yang SUDAH
// FINAL dari `FinanceDashboard.getAIHook().cashflow` (yang sendiri 100%
// reuse `computeCashflowForecast()`, modules/finance/tx-list-cashflow.js,
// via `FinanceIntelligence.cashflowSummary()`):
//   - incAvg     -> Income Forecast (rata-rata pemasukan/bulan)
//   - expAvg     -> Expense Forecast (rata-rata pengeluaran/bulan)
//   - saldoNow/projected/billsDue/upcoming -> Cash Flow Projection
// Pola arsitektur SAMA PERSIS DecisionCenterAPI (modules/cross/
// decision-center-api.js, Sesi 90) — satu pintu masuk data gabungan yang
// meneruskan field dari layer di bawahnya apa adanya, ditambah
// pengelompokan/pemberian nama presentasional (BUKAN kategori/rumus baru).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (FinancialForecastPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const FinancialForecastAPI = {

// _cashflow() — helper internal: satu titik akses ke
// FinanceDashboard.getAIHook().cashflow (yang sendiri, kalau ok, adalah
// hasil FinanceIntelligence.cashflowSummary() apa adanya). Guard berlapis
// (FinanceDashboard belum dimuat / getAIHook() {ok:false} /
// cashflow {ok:false}) — SEMUA diteruskan apa adanya, pola sama persis
// DecisionCenterAPI.summary() meneruskan {ok:false} dari
// LifeDashboardSummaryAPI.summary().
_cashflow() {
  if (typeof FinanceDashboard === 'undefined') {
    return { ok: false, reason: 'FinanceDashboard belum dimuat' };
  }
  const hook = FinanceDashboard.getAIHook();
  if (!hook.ok) return hook;
  if (!hook.cashflow || !hook.cashflow.ok) {
    return hook.cashflow || { ok: false, reason: 'cashflow tidak tersedia' };
  }
  return hook.cashflow;
},

// incomeForecast() — Income Forecast. `avgMonthly`/`months` dibaca APA
// ADANYA dari `incAvg`/`months` (computeCashflowForecast()), `currentMonth`
// dari `currentMonth.income` (incomeVsExpense() bulan berjalan,
// FinanceIntelligence) — 0 rata-rata dihitung ulang di sini.
incomeForecast() {
  const cf = this._cashflow();
  if (!cf.ok) return cf;
  return {
    ok: true,
    avgMonthly: cf.incAvg,
    months: cf.months,
    currentMonthIncome: cf.currentMonth.income,
  };
},

// expenseForecast() — Expense Forecast. Pola SAMA PERSIS incomeForecast()
// di atas, cuma sisi expense (`expAvg`/`currentMonth.expense`).
expenseForecast() {
  const cf = this._cashflow();
  if (!cf.ok) return cf;
  return {
    ok: true,
    avgMonthly: cf.expAvg,
    months: cf.months,
    currentMonthExpense: cf.currentMonth.expense,
  };
},

// cashflowProjection() — Cash Flow Projection. `saldoNow`/`projected`/
// `billsDue` dibaca APA ADANYA dari computeCashflowForecast() (proyeksi
// saldo 30 hari = saldoNow + incAvg - expAvg - billsDue, SUDAH final di
// sana — TIDAK dihitung ulang di sini). `upcomingCount` murni
// `.length` dari array `upcoming` yang sudah ada (0 filter/agregasi baru).
cashflowProjection() {
  const cf = this._cashflow();
  if (!cf.ok) return cf;
  return {
    ok: true,
    saldoNow: cf.saldoNow,
    projected: cf.projected,
    billsDue: cf.billsDue,
    upcomingCount: (cf.upcoming || []).length,
  };
},

// summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
// masa depan), murni memanggil ke-3 fungsi di atas, TIDAK ada logic
// tambahan. `ok` true hanya kalau ketiganya ok (pola sama persis
// FinanceIntelligence.summary() yang juga menggabungkan sub-hasil apa
// adanya, tapi di sini ditambah 1 flag gabungan supaya presenter bisa
// cek sekali saja alih-alih 3x, pola sama DecisionCenterAPI.summary()
// yang juga expose `ok` gabungan di level teratas).
summary() {
  const income = this.incomeForecast();
  const expense = this.expenseForecast();
  const cashflowProjection = this.cashflowProjection();
  return {
    ok: !!(income.ok && expense.ok && cashflowProjection.ok),
    income,
    expense,
    cashflowProjection,
  };
},

};
