// modules/finance/financial-goal-api.js — Financial Goal API (Sesi 94,
// Batch 10). Target sesi: Financial Goal Planner Foundation — Financial
// Goal API, Goal Progress, Target Projection, Goal Recommendation, Goal
// Presenter.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE `goalAdapterList(D)`
// (lifeos/adapters/goal-adapter.js — READ-ONLY, sudah menyeragamkan 6
// sumber goal lama: D.targets/D.eduFunds/D.wishlist/D.pensiun/
// D.finansialFreedom/D.debts jadi 1 bentuk "goal card" dgn
// targetAmount/currentAmount/progressPct SUDAH FINAL, dihitung ulang oleh
// builder-nya sendiri lewat Pensiun.danaTerkumpul()/FI.netAssetFund()/dst
// — TIDAK dihitung ulang di sini) + `CashFlowProjectionAPI.summary()`
// (modules/finance/cashflow-projection-api.js, Sesi 93 — sendiri 100%
// reuse FinancialForecastAPI.summary(), Sesi 91) — TIDAK ada rumus
// keuangan baru, TIDAK duplikasi logic, TIDAK framework baru, TIDAK
// mengubah struktur data D, TIDAK membaca D.targets/D.eduFunds/dst
// langsung di file ini (SATU-SATUNYA titik akses goal adalah
// `goalAdapterList`, pola cross-reference LifeOS<-Finance yang SAMA
// PERSIS `_aiReminderAndTargetSummary()` di modules/ai/ai-service.js,
// arah baca AI/Finance->LifeOS sudah diizinkan eksplisit di
// docs/LIFEOS_SCOPE.md — guard `typeof goalAdapterList==='function'`
// sama persis dipakai di sana).
//
// Financial Goal/Goal Progress di bawah BUKAN hasil hitungan baru —
// murni MEMBACA ULANG & MENGELOMPOKKAN field yang SUDAH FINAL dari
// `goalAdapterList(D)` (targetAmount/currentAmount/progressPct apa
// adanya, 0 recompute), pola sama persis `spendingAnalysis()`
// (modules/finance/budget-recommendation-api.js, Sesi 92) yang juga
// murni mengelompokkan/menghitung count dari field final.
//
// Target Projection di bawah SATU-SATUNYA logic baru sesi ini —
// `remaining = targetAmount - currentAmount` (subtraksi sederhana, pola
// SAMA PERSIS `remaining=Math.max(0,(t.amount||0)-(t.saved||0))` di
// `TimelineW.goals()`, modules/asset/aset.js) & `monthsNeeded =
// surplus>0 ? Math.ceil(remaining/surplus) : null` (bentuk rumus SAMA
// PERSIS `monthsNeeded=surplus>0?Math.ceil(g.remaining/surplus):null` di
// `TimelineW.waterfall()`, modules/asset/aset.js) — BUKAN rumus finansial
// baru yang dikarang, murni bentuk yang SUDAH ADA di codebase, cuma
// `surplus` di sini diambil dari `CashFlowProjectionAPI.summary()`
// (income.avgMonthly - expense.avgMonthly, KEDUA field sudah final dari
// FinancialForecastAPI/computeCashflowForecast — pengurangan sederhana,
// pola sama `(inc-exp)/months` di `FI.monthlySurplus()`,
// modules/shared/modules-calc.js) alih-alih `Pensiun.avgSurplus()` yang
// dipakai TimelineW, KARENA sesi ini WAJIB reuse Cash Flow Projection
// (bukan modul Pensiun) — beda sumber surplus, bentuk rumus tetap sama
// persis yang sudah ada.
//
// Goal Recommendation di bawah derivatif murni dari Goal Progress +
// Target Projection milik file ini sendiri — pola sama persis
// `budgetInsight()` (budget-recommendation-api.js) yang juga cuma
// menyusun rule dari klasifikasi/angka yang sudah final, BUKAN duplikasi
// `FinanceIntelligence.insights()`/`goalAdapterList` (cakupan beda).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (FinancialGoalPresenter) ada di file terpisah,
// sesi ini juga, 100% konsumsi objek ini.
const FinancialGoalAPI = {

// _goals() — helper internal: satu titik akses ke `goalAdapterList(D)`.
// Guard berlapis (goalAdapterList belum dimuat / D belum ada) — pola sama
// persis guard `typeof goalAdapterList==='function' && hasD` di
// `_aiReminderAndTargetSummary()` (modules/ai/ai-service.js).
_goals() {
  if (typeof goalAdapterList !== 'function') {
    return { ok: false, reason: 'goalAdapterList belum dimuat' };
  }
  if (typeof D === 'undefined' || !D) {
    return { ok: false, reason: 'D belum tersedia' };
  }
  let list;
  try {
    list = goalAdapterList(D);
  } catch (e) {
    return { ok: false, reason: 'goalAdapterList gagal dipanggil' };
  }
  return { ok: true, goals: Array.isArray(list) ? list : [] };
},

// financialGoals() — Financial Goal API. `goalAdapterList(D)` APA ADANYA
// (list lengkap, tidak difilter/diurutkan ulang — pola sama persis
// Target Summary di ai-service.js), ditambah `count` (murni `.length`).
financialGoals() {
  const g = this._goals();
  if (!g.ok) return g;
  return { ok: true, goals: g.goals, count: g.goals.length };
},

// goalProgress() — Goal Progress. Derivatif murni dari `financialGoals()`
// di atas — `progressPct` per item dibaca APA ADANYA (0 recompute),
// hanya dikelompokkan jadi 3 kategori (achieved/inProgress/notStarted)
// pakai perbandingan sederhana (>=100 / >0 / ===0, bukan ambang finansial
// baru) + `avgProgressPct` (rata-rata sederhana, murni aritmatika
// presentasional, pola sama `countBy()` di spendingAnalysis()).
goalProgress() {
  const fg = this.financialGoals();
  if (!fg.ok) return fg;
  const goals = fg.goals;
  const achieved = goals.filter((g) => g.progressPct >= 100);
  const notStarted = goals.filter((g) => g.progressPct <= 0);
  const inProgress = goals.filter((g) => g.progressPct > 0 && g.progressPct < 100);
  const avgProgressPct = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.progressPct || 0), 0) / goals.length)
    : 0;
  return {
    ok: true,
    count: goals.length,
    achievedCount: achieved.length,
    inProgressCount: inProgress.length,
    notStartedCount: notStarted.length,
    avgProgressPct,
  };
},

// _surplus() — helper internal: satu titik akses ke
// `CashFlowProjectionAPI.summary()`, mengembalikan `monthlySurplus`
// (income.avgMonthly - expense.avgMonthly, KEDUA field sudah final —
// pola pengurangan sama `(inc-exp)/months` di FI.monthlySurplus()).
// Guard berlapis (CashFlowProjectionAPI belum dimuat / summary() tidak
// ok) — SEMUA diteruskan apa adanya, pola sama persis
// BudgetRecommendationAPI._budget() meneruskan {ok:false}.
_surplus() {
  if (typeof CashFlowProjectionAPI === 'undefined') {
    return { ok: false, reason: 'CashFlowProjectionAPI belum dimuat' };
  }
  const s = CashFlowProjectionAPI.summary();
  if (!s || !s.ok) {
    return s || { ok: false, reason: 'cash flow projection tidak tersedia' };
  }
  return {
    ok: true,
    monthlySurplus: s.income.avgMonthly - s.expense.avgMonthly,
  };
},

// targetProjection() — Target Projection. Utk tiap goal yang BELUM
// tercapai (progressPct<100) & punya `targetAmount` (goal tanpa target
// mis. eduFund yang belum diisi -> dilewati, konsisten dgn guard
// `if(t.target)` gaya goalSourceEduFund()): `remaining =
// targetAmount-currentAmount` (pola sama TimelineW.goals()),
// `monthsNeeded = surplus>0 ? Math.ceil(remaining/surplus) : null` (pola
// SAMA PERSIS TimelineW.waterfall()). `monthlySurplus` diambil SEKALI
// dari `_surplus()` di atas, dipakai bareng utk semua goal (bukan
// dihitung ulang per goal).
targetProjection() {
  const fg = this.financialGoals();
  if (!fg.ok) return fg;
  const surplus = this._surplus();
  if (!surplus.ok) return surplus;
  const monthlySurplus = surplus.monthlySurplus;
  const projections = fg.goals
    .filter((g) => g.progressPct < 100 && (g.targetAmount || 0) > 0)
    .map((g) => {
      const remaining = Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0));
      const monthsNeeded = monthlySurplus > 0 ? Math.ceil(remaining / monthlySurplus) : null;
      return {
        id: g.id,
        sourceKind: g.sourceKind,
        name: g.name,
        emoji: g.emoji,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        remaining,
        monthsNeeded,
      };
    });
  return { ok: true, monthlySurplus, projections };
},

// goalRecommendation() — Goal Recommendation. Derivatif murni dari
// `goalProgress()` + `targetProjection()` milik file ini sendiri (BUKAN
// duplikasi FinanceIntelligence.insights()/budgetInsight() — cakupan di
// sini khusus goal). 4 rule turunan, pola sama persis budgetInsight():
//   - surplus<=0 & ada goal belum tercapai -> warning (arus kas belum
//     surplus, monthsNeeded semua null)
//   - goal progress>=80% (belum 100%) -> positive per goal (hampir
//     tercapai)
//   - goal progress===0% -> info per goal (belum ada progres)
//   - semua goal tercapai (achievedCount===count, count>0) -> positive
//     ringkasan
goalRecommendation() {
  const gp = this.goalProgress();
  if (!gp.ok) return gp;
  const tp = this.targetProjection();
  const out = [];
  if (gp.count === 0) return out;
  if (tp.ok && tp.monthlySurplus <= 0 && (gp.count - gp.achievedCount) > 0) {
    out.push({ type: 'warning', code: 'goal_no_surplus', message: 'Arus kas bulanan belum surplus — proyeksi waktu pencapaian target belum bisa dihitung utk goal yang belum tercapai.' });
  }
  {
    const fgGoals = (this.financialGoals().goals) || [];
    fgGoals.forEach((g) => {
      if (g.progressPct >= 80 && g.progressPct < 100) {
        out.push({ type: 'positive', code: 'goal_near_complete', message: `"${g.name}" sudah ${g.progressPct}% tercapai — hampir sampai target.` });
      } else if (g.progressPct <= 0) {
        out.push({ type: 'info', code: 'goal_not_started', message: `"${g.name}" belum ada progres — mulai nabung/alokasikan dana utk target ini.` });
      }
    });
  }
  if (gp.count > 0 && gp.achievedCount === gp.count) {
    out.push({ type: 'positive', code: 'goal_all_achieved', message: 'Semua target keuangan sudah tercapai.' });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
// masa depan), murni memanggil ke-3 fungsi di atas, TIDAK ada logic
// tambahan. `ok` true kalau goalProgress() ok (pola sama persis
// BudgetRecommendationAPI.summary() — `insight`/recommendation TIDAK
// ikut menentukan `ok` gabungan, selalu array).
summary() {
  const goalProgress = this.goalProgress();
  const targetProjection = this.targetProjection();
  const recommendation = this.goalRecommendation();
  return {
    ok: !!goalProgress.ok,
    goalProgress,
    targetProjection,
    recommendation: Array.isArray(recommendation) ? recommendation : [],
  };
},

};
