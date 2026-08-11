// modules/finance/financial-health-score-api.js — Financial Health Score
// API (Sesi 98, Batch 10). Target sesi: Financial Health Score Foundation
// — Score Overview, Component Breakdown, Recommendation, Presenter.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE `FinanceIntelligence.healthScore()`
// (modules/finance/finance-intelligence.js, Sesi 74 — sudah komposit skor
// 0-100 dari savings/budget/debt/cashflow, field `score`/`label`/`parts`
// SUDAH FINAL, dihitung oleh FinanceIntelligence sendiri — TIDAK dihitung
// ulang di sini) — TIDAK ada rumus keuangan baru, TIDAK duplikasi logic,
// TIDAK framework baru, TIDAK mengubah struktur data D (file ini TIDAK
// pernah membaca D langsung, murni membaca ulang hasil FinanceIntelligence).
// Pola file/komentar sama persis modules/finance/retirement-planner-api.js
// (Sesi 97)/debt-optimizer-api.js (Sesi 96).
//
// Score Overview di bawah BUKAN hasil hitungan baru — murni MEMBACA ULANG
// `FinanceIntelligence.healthScore()` apa adanya (0 recompute), pola sama
// persis `debtOverview()` (debt-optimizer-api.js) yang murni membaca ulang
// `Debt.totalValue()` dkk.
//
// Component Breakdown di bawah SATU-SATUNYA "logic" baru sesi ini — murni
// pemetaan LABEL tampilan (Bahasa Indonesia) per `key` komponen + `pct`
// (score/weight, pembagian sederhana atas angka yang sudah final dari
// healthScore().parts) — bukan rumus finansial baru, murni presentasi atas
// field yang sudah dihitung FinanceIntelligence sendiri. Bentuk yang SAMA
// PERSIS dipakai `gapAnalysis()` (retirement-planner-api.js, `proyeksi -
// target`) — perbandingan/pembagian sederhana, bukan rumus baru.
//
// Financial Health Recommendation di bawah derivatif murni dari Score
// Overview + Component Breakdown (semua milik file ini sendiri) — pola
// sama persis `debtRecommendation()` (debt-optimizer-api.js) yang juga
// cuma menyusun rule dari klasifikasi/angka yang sudah final (threshold
// pct<0.5 per komponen, gaya sama persis threshold `d.pct>35` di
// debtRecommendation()), BUKAN duplikasi label 'Sehat'/'Cukup Sehat'/dst
// yang SUDAH dihitung `FinanceIntelligence.healthScore()` sendiri (label
// itu dipakai APA ADANYA, tidak dihitung ulang di sini).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (FinancialHealthScorePresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const FinancialHealthScoreAPI = {

// _score() — helper internal: satu titik akses ke
// `FinanceIntelligence.healthScore()`. Guard berlapis (FinanceIntelligence
// belum dimuat) — pola sama persis guard `typeof Pensiun==='undefined'`
// di RetirementPlannerAPI._overview().
_score() {
  if (typeof FinanceIntelligence === 'undefined') {
    return { ok: false, reason: 'FinanceIntelligence belum dimuat' };
  }
  let hs;
  try {
    hs = FinanceIntelligence.healthScore();
  } catch (e) {
    return { ok: false, reason: 'FinanceIntelligence.healthScore() gagal dipanggil' };
  }
  return { ok: true, ...hs };
},

// scoreOverview() — Score Overview. `FinanceIntelligence.healthScore()`
// APA ADANYA (score/label/parts — 0 recompute).
scoreOverview() {
  return this._score();
},

// componentBreakdown() — Component Breakdown. Derivatif murni dari
// scoreOverview().parts (key/weight/score dari FinanceIntelligence.
// healthScore(), 0 recompute) + pemetaan LABEL tampilan per key + `pct`
// (score/weight, pembagian sederhana) — 0 rumus finansial baru.
componentBreakdown() {
  const o = this.scoreOverview();
  if (!o.ok) return o;
  const LABELS = {
    savings: 'Tingkat Tabungan',
    budget: 'Kepatuhan Anggaran',
    debt: 'Rasio Utang',
    cashflow: 'Proyeksi Arus Kas',
  };
  const items = (Array.isArray(o.parts) ? o.parts : []).map((p) => ({
    key: p.key,
    label: LABELS[p.key] || p.key,
    weight: p.weight,
    score: p.score,
    pct: p.weight > 0 ? p.score / p.weight : 0,
  }));
  return { ok: true, items };
},

// financialHealthRecommendation() — Financial Health Recommendation.
// Derivatif murni dari scoreOverview() + componentBreakdown() milik file
// ini sendiri — pola sama persis `debtRecommendation()`
// (debt-optimizer-api.js). Rule turunan, murni perbandingan sederhana
// atas field yang sudah final (0 rumus baru):
//   - overall: type berdasar `score` (>=80 positive, >=60 info, <60
//     warning), message pakai `label` APA ADANYA (tidak dihitung ulang)
//   - tiap komponen dgn pct<0.5 (kontribusi di bawah separuh bobot
//     maksimalnya) -> warning per komponen
financialHealthRecommendation() {
  const o = this.scoreOverview();
  const out = [];
  if (!o.ok) return out;
  out.push({
    type: o.score >= 80 ? 'positive' : o.score >= 60 ? 'info' : 'warning',
    code: 'health_score_overall',
    message: `Skor kesehatan finansial ${o.score}/100 (${o.label}).`,
  });
  const b = this.componentBreakdown();
  if (b.ok) {
    b.items.filter((i) => i.pct < 0.5).forEach((i) => {
      out.push({
        type: 'warning',
        code: 'health_component_low',
        message: `${i.label} masih rendah — kontribusi ${Math.round(i.pct * 100)}% dari bobot maksimal.`,
      });
    });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter), murni
// memanggil ke-3 fungsi di atas, TIDAK ada logic tambahan. `ok` true
// kalau scoreOverview() ok (pola sama persis RetirementPlannerAPI.
// summary() — componentBreakdown/recommendation TIDAK ikut menentukan
// `ok` gabungan).
summary() {
  const scoreOverview = this.scoreOverview();
  const componentBreakdown = this.componentBreakdown();
  const recommendation = this.financialHealthRecommendation();
  return {
    ok: !!scoreOverview.ok,
    scoreOverview,
    componentBreakdown,
    recommendation: Array.isArray(recommendation) ? recommendation : [],
  };
},

};
