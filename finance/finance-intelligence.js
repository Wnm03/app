// finance-intelligence.js — Finance Intelligence Foundation (Sesi 74, Batch 6).
// Target sesi: Cash Flow Summary, Budget Summary, Income vs Expense,
// Financial Health Score, Insight dasar — lihat docs/BATCH_PLAN.md § Batch 6.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE, TIDAK ada framework/state baru,
// TIDAK duplikasi logic, TIDAK mengubah struktur data D. Semua angka di
// bawah dihitung dari service yang SUDAH ADA:
//   - computeCashflowForecast()      (modules/finance/tx-list-cashflow.js)
//   - Budget.getUsed()/getEffectiveLimit()   (budget.js)
//   - totalSaldoAkun()               (modules/finance/akun.js)
//   - totalDebtValue()               (pajak-aset-ui-wrappers.js)
// FinanceIntelligence TIDAK menghitung ulang rata-rata income/expense,
// proyeksi saldo, pemakaian anggaran, atau saldo akun — semua itu dibaca
// apa adanya lewat pemanggilan fungsi/objek di atas. Satu-satunya logic
// yang genuinely baru di sini adalah agregasi income vs expense per
// rentang tanggal EKSPLISIT (`incomeVsExpense({from,to})`) — sebelumnya
// tidak ada fungsi murni (non-DOM) utk itu, yang ada cuma versi yang baca
// input filter dari DOM (getRange()/getTxListRange(), filter-laporan.js).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. Dipakai sbg lapisan
// data utk widget/dashboard masa depan & AI briefing (di luar scope sesi
// ini — TIDAK ada UI/wiring baru sesi ini, murni fondasi data/service).
const FinanceIntelligence = {

// KW perf fix lanjutan: incomeVsExpense()/budgetSummary() (tanpa argumen = rentang/bulan
// default) dipanggil BERULANG dalam 1 siklus render yang sama -- summary()/healthScore()/
// insights() saling manggil salah satu/​ketiganya lagi dari dalam (lihat komentar di method
// masing2 di bawah), DITAMBAH dipanggil independen oleh banyak presenter lain
// (FinanceDashboard/BudgetRecommendationPresenter/FinancialHealthScorePresenter/
// FinancialRiskDashboardPresenter/CrossDashboardCard dst) di render burst yang sama. Cache di
// sini HANYA utk panggilan tanpa argumen eksplisit (kasus paling sering) -- kalau range/month/
// year eksplisit dioper (mis. lihat bulan lain), SELALU dihitung fresh, tidak pernah cache (0
// risiko data periode salah). Invalidate lewat invalidateCache() di bawah, dipanggil dari hook
// yang sama dgn cache saldo akun (save()/renderPageContent()).
_ivxCache: undefined,
_budgetSummaryCache: undefined,
invalidateCache() {
  this._ivxCache = undefined;
  this._budgetSummaryCache = undefined;
},

// _isTxAccountSelf(t) — Sesi 192 (Ownership Sync Akun & Keuangan): helper
// REUSE OwnershipEngine, dipakai HANYA utk exclude transaksi dari akun
// ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY di agregat "Total
// Keuangan" (incomeVsExpense, yang jadi dasar cashflowSummary/healthScore/
// insights di bawah). D.transactions itu sendiri TIDAK disentuh/dihapus —
// transaksi & histori akun tetap tersimpan apa adanya, cuma tidak ikut
// dijumlah ke total income/expense.
// Toleran: transaksi tanpa accountId, atau accountId yg akunnya sudah
// tidak ada di D.accounts, tetap dihitung (fallback dianggap SELF) —
// SAMA prinsip toleran dgn OwnershipEngine.resolve() thd data lama.
_isTxAccountSelf(t) {
  if (typeof OwnershipEngine === 'undefined') return true;
  if (!t || !t.accountId) return true;
  const acc = (D.accounts || []).find((a) => a.id === t.accountId);
  if (!acc) return true;
  return OwnershipEngine.resolve(acc).type === 'SELF';
},

_resolveRange(range) {
  if (range && range.from && range.to) {
    return { from: new Date(range.from), to: new Date(range.to) };
  }
  const now = new Date();
  const m = (typeof curMonth === 'number') ? curMonth : now.getMonth();
  const y = (typeof curYear === 'number') ? curYear : now.getFullYear();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
},

// incomeVsExpense(range?) — total income/expense murni dalam rentang
// [from,to] (default bulan berjalan lewat _resolveRange di atas). Baca
// D.transactions apa adanya, TIDAK mengubah/menambah field apa pun.
incomeVsExpense(range) {
  if (!range && this._ivxCache !== undefined) return this._ivxCache;
  const { from, to } = this._resolveRange(range);
  const txs = (D.transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d >= from && d <= to && this._isTxAccountSelf(t);
  });
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : 0;
  const result = { from, to, income, expense, net, savingsRate, txCount: txs.length };
  if (!range) this._ivxCache = result;
  return result;
},

// cashflowSummary() — wrapper TIPIS atas computeCashflowForecast() yang
// sudah ada (0 duplikasi rumus rata-rata/proyeksi), digabung dgn
// incomeVsExpense() bulan berjalan supaya jadi satu ringkasan siap-pakai.
// {ok:false} kalau computeCashflowForecast belum dimuat (guard urutan
// load, pola sama persis predictIncome/predictExpense/predictCashflow di
// tx-list-cashflow.js).
cashflowSummary() {
  if (typeof computeCashflowForecast !== 'function') {
    return { ok: false, reason: 'computeCashflowForecast belum dimuat' };
  }
  const cf = computeCashflowForecast();
  const currentMonth = this.incomeVsExpense();
  return { ok: true, ...cf, currentMonth };
},

// budgetSummary(month?, year?) — reuse Budget.getUsed()/getEffectiveLimit()
// (budget.js) atas D.budgets apa adanya (0 duplikasi rumus rollover/
// matchesPeriod/matchesTx). {ok:false} kalau Budget/D.budgets belum ada.
budgetSummary(month, year) {
  if (month == null && year == null && this._budgetSummaryCache !== undefined) return this._budgetSummaryCache;
  if (typeof Budget === 'undefined' || !D.budgets) {
    return { ok: false, reason: 'Budget belum dimuat' };
  }
  const now = new Date();
  const m = month != null ? month : ((typeof curMonth === 'number') ? curMonth : now.getMonth());
  const y = year != null ? year : ((typeof curYear === 'number') ? curYear : now.getFullYear());
  const items = D.budgets.map((b) => {
    const limit = Budget.getEffectiveLimit(b, m, y);
    const used = Budget.getUsed(b, m, y);
    const pct = limit > 0 ? used / limit : 0;
    return { id: b.id, name: b.name, limit, used, sisa: limit - used, pct, over: used > limit };
  });
  const totalLimit = items.reduce((s, b) => s + b.limit, 0);
  const totalUsed = items.reduce((s, b) => s + b.used, 0);
  const overCount = items.filter((b) => b.over).length;
  const result = {
    ok: true,
    month: m,
    year: y,
    items,
    totalLimit,
    totalUsed,
    totalSisa: totalLimit - totalUsed,
    overallPct: totalLimit > 0 ? totalUsed / totalLimit : 0,
    overCount,
  };
  if (month == null && year == null) this._budgetSummaryCache = result;
  return result;
},

// healthScore() — skor 0-100, komposit dari komponen yang TERSEDIA (bukan
// dihitung ulang, murni dibaca dari service yang sudah ada):
//   (1) savings rate bulan berjalan   — incomeVsExpense()
//   (2) budget adherence               — budgetSummary() (1 - overallPct)
//   (3) rasio utang thd saldo akun     — totalDebtValue()/totalSaldoAkun()
//   (4) proyeksi cashflow 30 hari      — computeCashflowForecast().projected
// Tiap komponen bobot 25, HANYA disertakan kalau service-nya tersedia
// (guard typeof, pola sama persis predictIncome dkk) — skor akhir
// diskalakan ulang dari bobot yang benar-benar tersedia (bukan gagal
// total kalau 1 service belum dimuat). Rule-based murni, TIDAK ada
// panggilan AI/ML, konsisten dgn gaya _financeOverspendCheck() dkk yang
// sudah ada di tx-list-cashflow.js.
healthScore() {
  const parts = [];
  const ie = this.incomeVsExpense();
  parts.push({
    key: 'savings',
    weight: 25,
    score: Math.max(0, Math.min(1, ie.income > 0 ? ie.savingsRate : 0)) * 25,
  });
  if (typeof Budget !== 'undefined' && D.budgets && D.budgets.length) {
    const bs = this.budgetSummary();
    parts.push({ key: 'budget', weight: 25, score: Math.max(0, Math.min(1, 1 - bs.overallPct)) * 25 });
  }
  // BUG FIX (S269, Finance Engine Validation): sebelumnya komponen "debt" di
  // sini pakai totalDebtValue() SAJA sbg "total utang" -> TIDAK menyertakan
  // sisa cicilan/paylater (totalCicilanOutstanding()), beda dari SSOT
  // resmi "total utang" project ini (`FI.totalDebt()`, sudah dipakai
  // Kekayaan.currentNetWorth() sejak S268 & DebtOptimizerAPI.dsr()) ->
  // Skor Kesehatan Finansial/Financial Risk Dashboard bisa meremehkan
  // beban utang kalau user punya cicilan aktif. Sekarang reuse
  // FI.totalDebt() (0 rumus baru) supaya konsisten dgn engine lain.
  if (typeof totalSaldoAkun === 'function' && typeof FI !== 'undefined' && typeof FI.totalDebt === 'function') {
    const saldo = totalSaldoAkun();
    const debt = FI.totalDebt();
    const debtRatio = saldo > 0 ? Math.min(1, debt / saldo) : (debt > 0 ? 1 : 0);
    parts.push({ key: 'debt', weight: 25, score: Math.max(0, 1 - debtRatio) * 25 });
  }
  if (typeof computeCashflowForecast === 'function') {
    const cf = computeCashflowForecast();
    parts.push({ key: 'cashflow', weight: 25, score: (cf.projected > 0 ? 1 : 0) * 25 });
  }
  const maxScore = parts.reduce((s, p) => s + p.weight, 0);
  const rawScore = parts.reduce((s, p) => s + p.score, 0);
  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const label = score >= 80 ? 'Sehat' : score >= 60 ? 'Cukup Sehat' : score >= 40 ? 'Waspada' : 'Perlu Perhatian';
  return { score, label, parts };
},

// insights() — insight dasar, murni derivasi ambang batas dari 4 fungsi di
// atas. BUKAN duplikasi FinCoach (modules-calc.js) — FinCoach itu widget
// Dashboard proaktif dgn state dismiss/persist & mencakup banyak domain di
// luar finance murni (tagihan, servis, piutang, dst); di sini HANYA 4 rule
// dasar yang derivatif langsung dari cashflowSummary/budgetSummary/
// incomeVsExpense/healthScore milik FinanceIntelligence sendiri, tidak
// membaca ulang D atau menghitung ulang rumus apa pun.
insights() {
  const out = [];
  const ie = this.incomeVsExpense();
  if (ie.income > 0 && ie.net < 0) {
    const fmtNominal = typeof fmt === 'function' ? fmt : (n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'));
    out.push({ type: 'warning', code: 'deficit', message: `Pengeluaran bulan ini (${fmtNominal(ie.expense)}) melebihi pemasukan (${fmtNominal(ie.income)}).` });
  } else if (ie.income > 0 && ie.savingsRate >= 0.2) {
    out.push({ type: 'positive', code: 'good_savings', message: `Tingkat tabungan bulan ini ${Math.round(ie.savingsRate * 100)}% dari pemasukan — di atas 20%.` });
  }
  if (typeof Budget !== 'undefined' && D.budgets && D.budgets.length) {
    const bs = this.budgetSummary();
    if (bs.overCount > 0) {
      out.push({ type: 'warning', code: 'budget_over', message: `${bs.overCount} anggaran sudah melebihi limit bulan ini.` });
    }
  }
  if (typeof computeCashflowForecast === 'function') {
    const cf = computeCashflowForecast();
    if (cf.projected < 0) {
      out.push({ type: 'warning', code: 'cashflow_negative', message: 'Proyeksi saldo 30 hari ke depan diperkirakan minus.' });
    }
  }
  const hs = this.healthScore();
  out.push({ type: 'info', code: 'health_score', message: `Skor kesehatan finansial: ${hs.score}/100 (${hs.label}).` });
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai widget/AI briefing masa
// depan), murni memanggil ke-5 fungsi di atas, TIDAK ada logic tambahan.
summary() {
  return {
    cashflow: this.cashflowSummary(),
    budget: this.budgetSummary(),
    incomeVsExpense: this.incomeVsExpense(),
    healthScore: this.healthScore(),
    insights: this.insights(),
  };
},

};
