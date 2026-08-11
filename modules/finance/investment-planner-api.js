// modules/finance/investment-planner-api.js — Investment Planner API
// (Sesi 95, Batch 10; REWIRED Sesi 161 dari `Investment.*` ke
// `Aset.investmentPerformance()`; REWIRED KEMBALI s476b — lihat catatan
// panjang di atas `_portfolio()`/`_allocation()`/`watchlistAlerts()` di
// bawah). Target sesi: Investment Planner Foundation — Portfolio
// Overview, Asset Allocation, Watchlist Alerts, Investment
// Recommendation, Presenter.
//
// PRINSIP (RULE #1, tetap berlaku): 100% REUSE modul yang SUDAH ADA —
// TIDAK ada rumus keuangan baru, TIDAK duplikasi logic, TIDAK framework
// baru, TIDAK mengubah struktur data D. `FinancialGoalAPI._surplus()`
// (modules/finance/financial-goal-api.js, Sesi 94 — SUDAH membaca
// `CashFlowProjectionAPI.summary()` & menghasilkan `monthlySurplus`)
// dipanggil ULANG apa adanya, sama seperti sebelumnya — tidak berubah
// sesi ini.
//
// SESI s476b — REWIRE KEMBALI ke `Investment.*` (docs/
// s476-PLAN-migrate-investasi-to-holdings.md, bagian "s476b — Investment
// Planner"): premis Sesi 161 (`Investment.addHolding()` tidak pernah
// dipanggil dari UI mana pun, jadi `D.investments` selalu kosong) SUDAH
// TIDAK BERLAKU sejak s476a — `D.investments` sekarang jadi SSOT data
// investasi (migrasi 1x-jalan dari `D.assets` via
// `migrateAssetInvestmentsToHoldings()`, + tab "💹 Investasi"
// (`InvestmentListUI`, Sesi 466-468) adalah UI penulis data yang nyata,
// beda dari kondisi Sesi 161). `Aset.investmentPerformance()` (yang
// dipakai sejak Sesi 161) MASIH membaca `D.assets` MENTAH — TIDAK
// mengecualikan aset yang sudah `_migratedToInvestmentId` (beda dari
// `Aset.totalValue()` yang sudah dikecualikan sejak s476a) — jadi kalau
// dibiarkan, Investment Planner akan terus membaca salinan data LAMA yang
// makin lama makin menyimpang dari `D.investments` (SSOT sekarang),
// terutama begitu ada holding yang murni ditambah/diedit lewat tab
// Investasi (Investment.addHolding()/updateHolding()) TANPA lewat Buku
// Aset sama sekali — perubahan itu TIDAK PERNAH kelihatan di Investment
// Planner selama masih baca `Aset.investmentPerformance()`.
//
// Sama seperti pola `AssetPortfolioAPI._investment()` (modules/asset/
// asset-portfolio-api.js, S101 — SUDAH lebih dulu baca
// `Investment.portfolioSummary()`/`Investment.assetAllocation()` dgn
// guard sama persis di bawah) — 0 pola baru, cuma menyamakan sumber data
// Investment Planner dgn API sejenis yang sudah ada.
//
// Portfolio Overview/Asset Allocation di bawah BUKAN hasil hitungan baru
// — murni MEMBACA ULANG hasil `Investment.portfolioSummary()`/
// `Investment.assetAllocation()` apa adanya (0 recompute), pola sama
// persis `financialGoals()` (financial-goal-api.js) yang murni membaca
// ulang `goalAdapterList(D)`.
//
// `topAllocation` di bawah SATU-SATUNYA "logic" baru sesi ini — murni
// `array.reduce((a,b)=>b.value>a.value?b:a)` (cari item bernilai
// terbesar), bentuk yang SAMA PERSIS dipakai `_projectionCard()` di
// financial-goal-presenter.js (`withEstimate.reduce((a,b)=>
// b.monthsNeeded<a.monthsNeeded?b:a)`) — bukan rumus finansial baru,
// murni pencarian max/min atas field yang sudah final.
//
// Investment Recommendation di bawah derivatif murni dari Portfolio
// Overview + Asset Allocation + Watchlist Alerts + surplus (semua milik
// file ini sendiri) — pola sama persis `goalRecommendation()`
// (financial-goal-api.js) yang juga cuma menyusun rule dari
// klasifikasi/angka yang sudah final, BUKAN duplikasi
// `FinanceIntelligence.insights()`/`Investment` (cakupan beda: khusus
// investasi).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (InvestmentPlannerPresenter) ada di file
// terpisah, 100% konsumsi objek ini, TIDAK diubah sesi ini (bentuk
// summary() tidak berubah).
const InvestmentPlannerAPI = {

// _portfolio() — helper internal: satu titik akses ke
// `Investment.portfolioSummary()` (modules/asset/investasi.js, SSOT data
// investasi sejak s476a). Guard berlapis (Investment belum dimuat) —
// pola sama persis `AssetPortfolioAPI._investment()`
// (modules/asset/asset-portfolio-api.js). Field di-mapping APA ADANYA
// dari hasil portfolioSummary() (0 recompute) ke bentuk yang sama
// seperti sebelumnya (holdingsCount/totalValue/totalCost/
// totalGainLoss/roiPct/totalDividend/totalRealizedGain) supaya presenter
// & investmentRecommendation() di bawah TIDAK perlu diubah sama sekali.
// `yieldPct` (CAGR, s476a2) ikut diteruskan apa adanya — bonus field,
// belum dikonsumsi presenter/recommendation, tapi tersedia utk sesi
// depan tanpa perlu ubah _portfolio() lagi.
_portfolio() {
  if (typeof Investment === 'undefined' || typeof Investment.portfolioSummary !== 'function') {
    return { ok: false, reason: 'Investment belum dimuat' };
  }
  let p;
  try {
    p = Investment.portfolioSummary();
  } catch (e) {
    return { ok: false, reason: 'Investment.portfolioSummary() gagal dipanggil' };
  }
  return {
    ok: true,
    holdingsCount: p.holdingsCount,
    totalValue: p.totalValue,
    totalCost: p.totalCost,
    totalGainLoss: p.totalGainLoss,
    roiPct: p.roiPct,
    yieldPct: p.yieldPct,
    totalDividend: p.totalDividend || 0,
    totalRealizedGain: p.totalRealizedGain || 0,
  };
},

// portfolioOverview() — Investment Portfolio Overview. `Investment.
// portfolioSummary()` APA ADANYA (lewat _portfolio() — 0 recompute).
portfolioOverview() {
  return this._portfolio();
},

// _allocation() — helper internal: satu titik akses ke
// `Investment.assetAllocation()` (modules/asset/investasi.js) — SUDAH
// mengembalikan bentuk {type,value,pct} terurut value terbesar (0
// recompute perlu di sini, beda dari versi Sesi 161 yang harus
// grouping manual dari `tracked` krn `Aset.investmentPerformance()`
// tidak punya breakdown per-tipe siap pakai). Guard berlapis sama pola
// `_portfolio()` di atas.
_allocation() {
  if (typeof Investment === 'undefined' || typeof Investment.assetAllocation !== 'function') {
    return { ok: false, reason: 'Investment belum dimuat' };
  }
  let allocation;
  try {
    allocation = Investment.assetAllocation();
  } catch (e) {
    return { ok: false, reason: 'Investment.assetAllocation() gagal dipanggil' };
  }
  return { ok: true, allocation: Array.isArray(allocation) ? allocation : [] };
},

// assetAllocation() — Asset Allocation. `Investment.assetAllocation()`
// APA ADANYA (list lengkap per tipe instrumen, sudah terurut value
// terbesar dari Investment sendiri), ditambah `topAllocation` (item
// bernilai terbesar — murni reduce max, pola sama persis `nearest`
// goal di FinancialGoalPresenter._projectionCard()).
assetAllocation() {
  const a = this._allocation();
  if (!a.ok) return a;
  const topAllocation = a.allocation.length
    ? a.allocation.reduce((max, item) => (item.value > max.value ? item : max))
    : null;
  return { ok: true, allocation: a.allocation, topAllocation };
},

// watchlistAlerts() — Watchlist Alerts. s476b: `D.investments` (SSOT
// sekarang) SELALU punya konsep watchlist (`D.investmentWatchlist`,
// `Investment.getWatchlist()`/`Investment.watchlistAlerts()` — modul
// investasi.js, sudah ada sejak awal, TIDAK pernah dipakai Investment
// Planner sebelum sesi ini krn premis Sesi 161 di atas). Sekarang
// dibaca APA ADANYA (0 recompute) — `Investment.watchlistAlerts()`
// sendiri sudah memfilter item watchlist yang `lastPrice<=targetPrice`
// (harga sudah menyentuh/lewat target beli). Guard berlapis sama pola
// `_portfolio()`/`_allocation()` — TIDAK lagi selalu {alerts:[],count:0}
// seperti versi Sesi 161 (itu cuma benar selama sumbernya Buku Aset yang
// memang tidak punya watchlist).
watchlistAlerts() {
  if (typeof Investment === 'undefined' || typeof Investment.watchlistAlerts !== 'function') {
    return { ok: false, reason: 'Investment belum dimuat' };
  }
  let alerts;
  try {
    alerts = Investment.watchlistAlerts();
  } catch (e) {
    return { ok: false, reason: 'Investment.watchlistAlerts() gagal dipanggil' };
  }
  alerts = Array.isArray(alerts) ? alerts : [];
  return { ok: true, alerts, count: alerts.length };
},

// _surplus() — helper internal: satu titik akses ke
// `FinancialGoalAPI._surplus()` (Sesi 94 — SUDAH membaca
// CashFlowProjectionAPI.summary() & menghasilkan `monthlySurplus`,
// dipakai ULANG di sini apa adanya supaya TIDAK duplikasi helper yang
// sudah ada). Guard berlapis (FinancialGoalAPI belum dimuat/method
// tidak ada) — kalau tidak tersedia, `ok:false` diteruskan apa adanya
// (bukan dianggap fatal — investmentRecommendation() tetap jalan tanpa
// bagian surplus, lihat di bawah).
_surplus() {
  if (typeof FinancialGoalAPI === 'undefined' || typeof FinancialGoalAPI._surplus !== 'function') {
    return { ok: false, reason: 'FinancialGoalAPI._surplus() belum dimuat' };
  }
  let s;
  try {
    s = FinancialGoalAPI._surplus();
  } catch (e) {
    return { ok: false, reason: 'FinancialGoalAPI._surplus() gagal dipanggil' };
  }
  return s || { ok: false, reason: 'surplus tidak tersedia' };
},

// investmentRecommendation() — Investment Recommendation. Derivatif
// murni dari portfolioOverview() + assetAllocation() + watchlistAlerts()
// + _surplus() milik file ini sendiri — pola sama persis
// goalRecommendation() (financial-goal-api.js). 5 rule turunan, murni
// perbandingan sederhana atas field yang sudah final (0 rumus baru):
//   - holdingsCount===0 -> info (belum ada portofolio)
//   - roiPct<0 -> warning (portofolio rugi)
//   - roiPct>=10 -> positive (portofolio tumbuh baik)
//   - topAllocation.pct>=70 (holdingsCount>1) -> info (konsentrasi tinggi
//     di satu jenis instrumen, saran diversifikasi)
//   - watchlist alerts count>0 -> info (ada instrumen watchlist sudah
//     capai target beli)
//   - monthlySurplus>0 (dari _surplus(), kalau tersedia) -> positive
//     (ada surplus bulanan yang bisa dialokasikan ke investasi)
investmentRecommendation() {
  const p = this.portfolioOverview();
  const out = [];
  if (!p.ok) return out;
  if (p.holdingsCount === 0) {
    // s476b: sumber data sekarang Investment.* (D.investments) — pesan
    // diarahkan ke tab "💹 Investasi" (tempat holding sebenarnya
    // ditambah/dimigrasi), BUKAN lagi Buku Aset (pesan versi Sesi 161).
    out.push({ type: 'info', code: 'invest_no_holdings', message: 'Belum ada holding investasi — tambah holding di tab 💹 Investasi utk mulai memantau ROI & alokasi aset.' });
  } else {
    if (p.roiPct < 0) {
      out.push({ type: 'warning', code: 'invest_negative_roi', message: `Portofolio sedang rugi (ROI ${p.roiPct.toFixed(1)}%) — pertimbangkan tinjau ulang alokasi.` });
    } else if (p.roiPct >= 10) {
      out.push({ type: 'positive', code: 'invest_good_roi', message: `Portofolio tumbuh baik (ROI ${p.roiPct.toFixed(1)}%).` });
    }
    const a = this.assetAllocation();
    if (a.ok && a.topAllocation && p.holdingsCount > 1 && a.topAllocation.pct >= 70) {
      out.push({ type: 'info', code: 'invest_concentration', message: `${Math.round(a.topAllocation.pct)}% portofolio terkonsentrasi di "${a.topAllocation.type}" — pertimbangkan diversifikasi.` });
    }
  }
  const w = this.watchlistAlerts();
  if (w.ok && w.count > 0) {
    out.push({ type: 'info', code: 'invest_watchlist_alert', message: `${w.count} instrumen di watchlist sudah menyentuh harga target beli.` });
  }
  const s = this._surplus();
  if (s.ok && s.monthlySurplus > 0) {
    out.push({ type: 'positive', code: 'invest_surplus_available', message: `Ada surplus bulanan yang bisa dialokasikan ke investasi.` });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter), murni
// memanggil ke-4 fungsi di atas, TIDAK ada logic tambahan. `ok` true
// kalau portfolioOverview() ok (pola sama persis FinancialGoalAPI.
// summary()/BudgetRecommendationAPI.summary() — recommendation/alerts
// TIDAK ikut menentukan `ok` gabungan).
summary() {
  const portfolioOverview = this.portfolioOverview();
  const assetAllocation = this.assetAllocation();
  const watchlistAlerts = this.watchlistAlerts();
  const recommendation = this.investmentRecommendation();
  return {
    ok: !!portfolioOverview.ok,
    portfolioOverview,
    assetAllocation,
    watchlistAlerts,
    recommendation: Array.isArray(recommendation) ? recommendation : [],
  };
},

};
