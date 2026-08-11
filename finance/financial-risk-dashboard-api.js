// modules/finance/financial-risk-dashboard-api.js — Financial Risk
// Dashboard API (Sesi 99, Batch 10). Target sesi: Financial Risk
// Dashboard — Risk Factors, Risk Level, Presenter.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE fungsi rekomendasi/insight yang
// SUDAH ADA di domain finance — TIDAK ada rumus keuangan baru, TIDAK
// duplikasi logic (threshold DSR/budget/cashflow/skor kesehatan SUDAH
// final di modul masing2, dibaca ulang apa adanya di sini, TIDAK
// dihitung ulang), TIDAK framework baru, TIDAK mengubah struktur data D
// (file ini TIDAK pernah membaca D langsung, murni membaca ulang hasil
// 4 sumber di bawah):
//   - DebtOptimizerAPI.debtRecommendation()      (debt-optimizer-api.js,
//     Sesi 96 — DSR/payoff, threshold pct>35/>30 SUDAH final di sana)
//   - FinancialHealthScoreAPI.financialHealthRecommendation()
//     (financial-health-score-api.js, Sesi 98 — skor komposit &
//     komponen lemah, threshold score/pct SUDAH final di sana)
//   - FinanceIntelligence.insights()             (finance-intelligence.js,
//     Sesi 74 — defisit bulanan/anggaran lewat batas/proyeksi arus kas
//     minus, threshold SUDAH final di sana)
//   - _emergencyFundRisk()                       (helper di file ini —
//     status "Dana Darurat 3-6 Bulan" dari D.targets, threshold `saved
//     >= amount`; sebelumnya dibaca dari TanggaKeuangan.compute() [fitur
//     "Tangga Ternak Uang", sudah dihapus], logic dipindah ke sini apa
//     adanya, 0 perubahan threshold)
//
// Risk Factors di bawah BUKAN hasil hitungan baru — murni MEMFILTER
// item bertipe 'warning' dari ke-3 fungsi rekomendasi/insight di atas +
// satu status non-'warning' (Dana Darurat) yang dibungkus jadi bentuk
// item yang sama (domain/icon/type/code/message) tanpa mengubah pesan
// aslinya (Dana Darurat) atau menghitung ulang klasifikasi
// warning/positive/info (DebtOptimizer/FinancialHealthScore/
// FinanceIntelligence) — pola sama persis `recommendation`/`insights`
// yang sudah ada di planner2 lain, sekadar digabung lintas-domain di
// sini.
//
// Risk Level di bawah SATU-SATUNYA "logic" baru sesi ini — murni
// KATEGORISASI dari JUMLAH riskFactors() (0/1-2/3+ -> Rendah/Sedang/
// Tinggi), bentuk yang SAMA PERSIS dipakai `financialHealthRecommendation()`
// (financial-health-score-api.js, kategorisasi score>=80/>=60/<60 ->
// positive/info/warning) — bukan rumus finansial baru, murni klasifikasi
// atas angka (count) yang sudah final.
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (FinancialRiskDashboardPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const FinancialRiskDashboardAPI = {

// _debtRisk() — helper internal: reuse `DebtOptimizerAPI.
// debtRecommendation()` apa adanya, filter type==='warning' saja. Guard
// (DebtOptimizerAPI belum dimuat / gagal dipanggil) -> array kosong,
// pola sama persis guard `typeof X==='undefined'` di planner2 lain,
// TIDAK pernah throw.
_debtRisk() {
  if (typeof DebtOptimizerAPI === 'undefined') return [];
  let items;
  try {
    items = DebtOptimizerAPI.debtRecommendation();
  } catch (e) {
    return [];
  }
  return (Array.isArray(items) ? items : [])
    .filter((i) => i && i.type === 'warning')
    .map((i) => ({ domain: 'debt', icon: '📕', ...i }));
},

// _healthRisk() — helper internal: reuse `FinancialHealthScoreAPI.
// financialHealthRecommendation()` apa adanya, filter type==='warning'
// saja. Guard sama pola dgn _debtRisk().
_healthRisk() {
  if (typeof FinancialHealthScoreAPI === 'undefined') return [];
  let items;
  try {
    items = FinancialHealthScoreAPI.financialHealthRecommendation();
  } catch (e) {
    return [];
  }
  return (Array.isArray(items) ? items : [])
    .filter((i) => i && i.type === 'warning')
    .map((i) => ({ domain: 'health', icon: '❤️', ...i }));
},

// _cashflowBudgetRisk() — helper internal: reuse `FinanceIntelligence.
// insights()` apa adanya, filter type==='warning' saja (defisit bulanan/
// anggaran lewat batas/proyeksi arus kas minus). Guard sama pola dgn
// _debtRisk().
_cashflowBudgetRisk() {
  if (typeof FinanceIntelligence === 'undefined') return [];
  let items;
  try {
    items = FinanceIntelligence.insights();
  } catch (e) {
    return [];
  }
  return (Array.isArray(items) ? items : [])
    .filter((i) => i && i.type === 'warning')
    .map((i) => ({ domain: 'cashflow_budget', icon: '💸', ...i }));
},

// _emergencyFundRisk() — helper internal: cek status "Dana Darurat 3-6
// Bulan" langsung dari D.targets (isDanaDarurat, saved>=amount) — logic
// & threshold SAMA PERSIS dgn bekas step 3 TanggaKeuangan.compute()
// (fitur "Tangga Ternak Uang" sudah dihapus, lihat CHANGELOG; logic Dana
// Darurat ini dipindah ke sini SEBELUM file dihapus supaya Financial
// Risk Dashboard tidak kehilangan faktor risiko ini). Dibungkus jadi 1
// item warning kalau belum tercapai. Guard sama pola dgn _debtRisk().
_emergencyFundRisk() {
  let dd;
  try {
    dd = (D.targets || []).find(t => t.isDanaDarurat);
  } catch (e) {
    return [];
  }
  const done = !!(dd && dd.amount && dd.saved >= dd.amount);
  if (done) return [];
  const note = dd ? (Math.min(100, Math.round((dd.saved / (dd.amount || 1)) * 100)) + '% dari target') : 'Belum ada Target Dana Darurat';
  return [{
    domain: 'emergency_fund',
    icon: '🚨',
    type: 'warning',
    code: 'risk_emergency_fund_low',
    message: `Dana Darurat belum tercapai — ${note}.`,
  }];
},

// riskFactors() — Risk Factors. Gabungan APA ADANYA dari ke-4 helper di
// atas (0 recompute, 0 logic tambahan selain filter+gabung).
riskFactors() {
  return [
    ...this._debtRisk(),
    ...this._healthRisk(),
    ...this._cashflowBudgetRisk(),
    ...this._emergencyFundRisk(),
  ];
},

// riskLevel() — Risk Level. Derivatif murni dari riskFactors() milik
// file ini sendiri — kategorisasi sederhana atas JUMLAH faktor risiko
// (0 -> Rendah, 1-2 -> Sedang, 3+ -> Tinggi), pola sama persis
// kategorisasi score->label di `financialHealthRecommendation()`
// (financial-health-score-api.js) — 0 rumus baru.
riskLevel() {
  const factors = this.riskFactors();
  const count = factors.length;
  const level = count === 0 ? 'low' : count <= 2 ? 'medium' : 'high';
  const label = count === 0 ? 'Rendah' : count <= 2 ? 'Sedang' : 'Tinggi';
  return { count, level, label };
},

// summary() — satu pintu masuk gabungan (dipakai presenter), murni
// memanggil ke-2 fungsi di atas, TIDAK ada logic tambahan. `ok` selalu
// true (berbeda dari planner2 lain yang bergantung ke 1 sumber wajib —
// di sini TIDAK ada sumber tunggal yang wajib, kalau ke-4 sumber
// sekalipun belum dimuat, riskFactors() tetap balikin array kosong &
// riskLevel() tetap balikin 'Rendah' apa adanya, bukan gagal).
summary() {
  const riskFactors = this.riskFactors();
  const riskLevel = this.riskLevel();
  return { ok: true, riskFactors, riskLevel };
},

};
