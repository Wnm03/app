// modules/finance/budget-recommendation-api.js — Budget Recommendation API
// (Sesi 92, Batch 10). Target sesi: Budget Recommendation Foundation —
// lihat docs/BATCH_PLAN.md § Batch 10.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE FinanceIntelligence.budgetSummary()
// (modules/finance/finance-intelligence.js, Sesi 74 — sendiri 100% reuse
// Budget.getUsed()/getEffectiveLimit(), budget.js) + FinancialForecastAPI
// (modules/finance/financial-forecast-api.js, Sesi 91 — sendiri 100% reuse
// FinanceDashboard.getAIHook()/FinanceIntelligence) — TIDAK ada rumus
// keuangan baru, TIDAK duplikasi logic, TIDAK framework baru, TIDAK
// mengubah struktur data D, TIDAK membaca D langsung sama sekali di file
// ini.
//
// Spending Analysis/Budget Suggestion/Budget Insight di bawah BUKAN hasil
// hitungan baru — ketiganya murni MENGELOMPOKKAN/MENYARING field yang SUDAH
// FINAL dari `FinanceIntelligence.budgetSummary()` (limit/used/sisa/pct/over
// per item, sudah dihitung Budget.getUsed()/getEffectiveLimit()) memakai
// ambang batas yang SAMA GAYA dengan yang sudah ada di codebase (label
// healthScore() 80/60/40, ambang due-soon 15% VehicleReminder) — bukan
// rumus finansial baru, murni klasifikasi presentasional atas angka yang
// sudah final. Pola arsitektur SAMA PERSIS VehicleRecommendationEngine
// (modules/vehicle/vehicle-recommendation-engine.js, Sesi 82) — MEMILIH &
// MENYERAGAMKAN item dari layer di bawahnya jadi bentuk recommendation,
// TIDAK menghitung ulang severity/status/angka apa pun.
//
// Ambang klasifikasi (dipakai bersama oleh spendingAnalysis()/
// budgetSuggestion()/budgetInsight() di bawah, SATU tempat supaya
// konsisten):
//   - over        -> item.over === true (dari Budget.getUsed()/
//                     getEffectiveLimit() apa adanya, BUKAN dihitung ulang)
//   - near-limit  -> !over && pct >= 0.8 (gaya sama healthScore() yang
//                     pakai ambang 0.8/0.6/0.4, bukan angka baru dikarang)
//   - underused   -> pct < 0.4 (kebalikan simetris ambang di atas)
//   - ok          -> selain 3 kategori di atas
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (BudgetRecommendationPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const BudgetRecommendationAPI = {

// _budget(month?, year?) — helper internal: satu titik akses ke
// FinanceIntelligence.budgetSummary(month, year). Guard berlapis
// (FinanceIntelligence belum dimuat / budgetSummary() {ok:false}) — SEMUA
// diteruskan apa adanya, pola sama persis FinancialForecastAPI._cashflow()
// meneruskan {ok:false} dari FinanceDashboard.getAIHook().
_budget(month, year) {
  if (typeof FinanceIntelligence === 'undefined') {
    return { ok: false, reason: 'FinanceIntelligence belum dimuat' };
  }
  const bs = FinanceIntelligence.budgetSummary(month, year);
  if (!bs || !bs.ok) {
    return bs || { ok: false, reason: 'budget summary tidak tersedia' };
  }
  return bs;
},

// _classify(item) — helper internal: klasifikasi 1 item budgetSummary()
// jadi 1 dari 4 kategori (over/near/underused/ok) memakai ambang batas yang
// didokumentasikan di komentar atas. `item.over`/`item.pct` dibaca APA
// ADANYA (0 recompute) — fungsi ini murni percabangan if/else, bukan rumus.
_classify(item) {
  if (item.over) return 'over';
  if (item.pct >= 0.8) return 'near';
  if (item.pct < 0.4) return 'underused';
  return 'ok';
},

// _CATEGORY_PRIORITY — urutan prioritas kategori (dipakai _sortBySeverity()
// di bawah). Nilai lebih kecil = lebih prioritas/mendesak. Murni tabel
// mapping, bukan rumus.
_CATEGORY_PRIORITY: { over: 0, near: 1, underused: 2, ok: 3 },

// _sortBySeverity(items) — FIX BUG-014 (docs/BUG_REGISTRY.md §0a-7):
// urutkan COPY array item (sudah dibubuhi `category` oleh _classify() di
// spendingAnalysis()) berdasarkan prioritas kategori (over -> near ->
// underused -> ok), lalu besaran DALAM kategori yang sama — over: selisih
// `used-limit` menurun (overage terbesar duluan, supaya cocok dgn label
// "Terbesar" yg dipakai presenter), near: `pct` menurun (paling dekat ke
// over duluan), underused: `pct` menaik (paling sedikit terpakai duluan,
// paling banyak sisa yg bisa dialihkan). Field yang dipakai (`category`/
// `pct`/`used`/`limit`) SUDAH final dari _classify()/budgetSummary() — 0
// rumus finansial baru, murni `Array.prototype.sort()` presentasional.
// `.slice()` dulu supaya TIDAK memutasi array asli (aman thd referensi yg
// mungkin dipegang pemanggil lain).
_sortBySeverity(items) {
  const rank = this._CATEGORY_PRIORITY;
  return items.slice().sort((a, b) => {
    const ra = rank[a.category] ?? 3;
    const rb = rank[b.category] ?? 3;
    if (ra !== rb) return ra - rb;
    if (a.category === 'over') return (b.used - b.limit) - (a.used - a.limit);
    if (a.category === 'near') return b.pct - a.pct;
    if (a.category === 'underused') return a.pct - b.pct;
    return 0;
  });
},

// spendingAnalysis(month?, year?) — Spending Analysis. Reuse
// FinanceIntelligence.budgetSummary(month, year) apa adanya, ditambah
// field `category` per item (dari _classify() di atas) & pengelompokan
// count per kategori (murni .filter().length, 0 agregasi baru selain
// hitung). `totalLimit`/`totalUsed`/`totalSisa`/`overallPct`/`overCount`
// diteruskan APA ADANYA dari budgetSummary(). `items` DIURUTKAN lewat
// _sortBySeverity() (FIX BUG-014) — sebelumnya urutan `items` mengikuti
// apa adanya urutan `D.budgets`, membuat `budgetSuggestion().
// suggestions[0]` ("Rekomendasi Utama" di presenter) & pencarian
// "Terbesar" (`.find()` kategori 'over' pertama, `_overCard()` di
// budget-recommendation-presenter.js) berpotensi keliru menunjuk item yg
// bukan prioritas/nominal tertinggi.
spendingAnalysis(month, year) {
  const bs = this._budget(month, year);
  if (!bs.ok) return bs;
  const classified = bs.items.map((it) => ({ ...it, category: this._classify(it) }));
  const items = this._sortBySeverity(classified);
  const countBy = (cat) => items.filter((it) => it.category === cat).length;
  return {
    ok: true,
    month: bs.month,
    year: bs.year,
    items,
    totalLimit: bs.totalLimit,
    totalUsed: bs.totalUsed,
    totalSisa: bs.totalSisa,
    overallPct: bs.overallPct,
    overCount: bs.overCount,
    nearCount: countBy('near'),
    underusedCount: countBy('underused'),
    okCount: countBy('ok'),
  };
},

// budgetSuggestion(month?, year?) — Budget Suggestion. 100% reuse
// spendingAnalysis() di atas (yang sendiri 100% reuse budgetSummary()) —
// MENYARING item kategori 'over'/'near'/'underused' (item 'ok' TIDAK
// butuh saran, pola sama persis VehicleRecommendationEngine yang juga
// menyaring, bukan menyertakan semua item) & MENYERAGAMKAN jadi bentuk
// suggestion `{id, name, category, limit, used, sisa, pct, message}`.
// `suggestedLimit` HANYA disertakan utk kategori 'over' — nilainya
// `item.used` APA ADANYA (dibulatkan sudah final dari Budget.getUsed(),
// 0 rumus baru; menyamakan limit baru dgn pemakaian nyata bulan ini,
// bukan menghitung proyeksi/rata-rata baru — beda dari
// FinancialForecastAPI yang proyeksi 30 hari, sesi ini TIDAK menyentuh
// itu). Teks pesan murni template string, tidak mengarang angka baru.
budgetSuggestion(month, year) {
  const sa = this.spendingAnalysis(month, year);
  if (!sa.ok) return sa;
  const suggestions = sa.items
    .filter((it) => it.category !== 'ok')
    .map((it) => {
      if (it.category === 'over') {
        return {
          id: it.id,
          name: it.name,
          category: it.category,
          limit: it.limit,
          used: it.used,
          sisa: it.sisa,
          pct: it.pct,
          suggestedLimit: it.used,
          message: `"${it.name}" sudah melebihi limit — pertimbangkan naikkan limit ke sekitar pemakaian nyata bulan ini, atau kurangi pengeluaran kategori ini bulan depan.`,
        };
      }
      if (it.category === 'near') {
        return {
          id: it.id,
          name: it.name,
          category: it.category,
          limit: it.limit,
          used: it.used,
          sisa: it.sisa,
          pct: it.pct,
          message: `"${it.name}" sudah dipakai ${Math.round(it.pct * 100)}% dari limit — pantau sisa anggaran (${it.sisa}) sebelum akhir bulan.`,
        };
      }
      // underused
      return {
        id: it.id,
        name: it.name,
        category: it.category,
        limit: it.limit,
        used: it.used,
        sisa: it.sisa,
        pct: it.pct,
        message: `"${it.name}" baru dipakai ${Math.round(it.pct * 100)}% dari limit — sisa anggaran bisa dialihkan ke kategori yang over kalau perlu.`,
      };
    });
  return { ok: true, month: sa.month, year: sa.year, suggestions };
},

// budgetInsight() — Budget Insight. Derivatif murni dari spendingAnalysis()
// bulan berjalan (default, tidak menerima parameter — pola sama persis
// FinanceIntelligence.insights() yang juga selalu bulan berjalan). BUKAN
// duplikasi FinanceIntelligence.insights() (yang cakupannya seluruh
// domain finance: deficit/savings/budget_over/cashflow/health_score) —
// di sini HANYA 3 rule turunan spesifik dari klasifikasi kategori
// spendingAnalysis() milik file ini sendiri (over count, near count,
// underused count), tidak membaca ulang D atau menghitung ulang rumus
// apa pun.
budgetInsight() {
  const sa = this.spendingAnalysis();
  if (!sa.ok) return sa;
  const out = [];
  if (sa.overCount > 0) {
    out.push({ type: 'warning', code: 'budget_over_count', message: `${sa.overCount} anggaran sudah melebihi limit bulan ini — cek Budget Suggestion utk detail per kategori.` });
  }
  if (sa.nearCount > 0) {
    out.push({ type: 'warning', code: 'budget_near_count', message: `${sa.nearCount} anggaran sudah mendekati limit (≥80%) — perlu dipantau sebelum over.` });
  }
  if (sa.underusedCount > 0) {
    out.push({ type: 'info', code: 'budget_underused_count', message: `${sa.underusedCount} anggaran baru dipakai <40% dari limit bulan ini.` });
  }
  if (sa.overCount === 0 && sa.nearCount === 0) {
    out.push({ type: 'positive', code: 'budget_healthy', message: 'Semua anggaran masih dalam batas aman bulan ini.' });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
// masa depan), murni memanggil ke-3 fungsi di atas, TIDAK ada logic
// tambahan. `ok` true hanya kalau spendingAnalysis() & budgetSuggestion()
// ok (pola sama persis FinancialForecastAPI.summary()/
// DecisionCenterAPI.summary() yang juga expose `ok` gabungan di level
// teratas). `insight` dari budgetInsight() selalu array (bisa kosong),
// tidak ikut menentukan `ok` gabungan — pola sama
// FinanceIntelligence.summary() yang juga tidak menjadikan insights()
// syarat ok.
summary() {
  const spendingAnalysis = this.spendingAnalysis();
  const budgetSuggestion = this.budgetSuggestion();
  const insight = this.budgetInsight();
  return {
    ok: !!(spendingAnalysis.ok && budgetSuggestion.ok),
    spendingAnalysis,
    budgetSuggestion,
    insight: Array.isArray(insight) ? insight : [],
  };
},

};
