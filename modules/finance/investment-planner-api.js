// modules/finance/investment-planner-api.js — Investment Planner API
// (Sesi 95, Batch 10; REWIRED Sesi 161 — lihat catatan di atas
// `_portfolio()`/`_allocation()`/`watchlistAlerts()` di bawah). Target
// sesi: Investment Planner Foundation — Portfolio Overview, Asset
// Allocation, Watchlist Alerts, Investment Recommendation, Presenter.
//
// PRINSIP (RULE #1 sesi ini, per Sesi 161): 100% REUSE
// `Aset.investmentPerformance()` (modules/asset/aset.js, diekstrak dari
// Aset.renderInvestasi() yang sudah lama ada & sudah dipakai halaman Buku
// Aset — field-fieldnya SUDAH FINAL, dihitung ulang oleh Aset sendiri —
// TIDAK dihitung ulang di sini) + `FinancialGoalAPI._surplus()`
// (modules/finance/financial-goal-api.js, Sesi 94 — method ini SUDAH
// membaca `CashFlowProjectionAPI.summary()` & menghasilkan
// `monthlySurplus`, dipanggil ULANG di sini APA ADANYA supaya TIDAK ada
// duplikasi helper "baca CashFlowProjectionAPI.summary() lalu
// income.avgMonthly-expense.avgMonthly" yang SUDAH ADA persis di
// financial-goal-api.js) — TIDAK ada rumus keuangan baru, TIDAK
// duplikasi logic, TIDAK framework baru, TIDAK mengubah struktur data D
// (murni membaca D.assets lewat `Aset.investmentPerformance()`, yang
// sudah ada sejak fitur "Performa Investasi" di Buku Aset).
//
// `Investment`/`D.investments` (modules/asset/investasi.js, Sesi 9) TIDAK
// dipakai lagi di sini — modul itu tidak pernah punya UI penulis data
// (Investment.addHolding() tidak pernah dipanggil dari mana pun), jadi
// selalu kosong. Buku Aset (D.assets) adalah tempat user SEBENARNYA
// mengisi data investasi.
//
// Portfolio Overview/Asset Allocation di bawah BUKAN hasil hitungan baru
// — murni MEMBACA ULANG hasil `Aset.investmentPerformance()` apa adanya
// (0 recompute selain grouping by-jenis yang sudah ada polanya di
// AssetInsight.compute()), pola sama persis `financialGoals()`
// (financial-goal-api.js) yang murni membaca ulang `goalAdapterList(D)`.
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
// terpisah, sesi ini juga, 100% konsumsi objek ini.
// SESI 160B — GAP FIX: `Investment`/`D.investments` (modules/asset/
// investasi.js) DIGANTI jadi `Aset.investmentPerformance()` (modules/asset/
// aset.js) sbg sumber data. Alasan: TIDAK ADA UI di app ini yang pernah
// menulis ke `D.investments` (Investment.addHolding() tidak pernah
// dipanggil dari button/modal manapun) — jadi Investment Planner yang
// baca `Investment.*` PASTI selalu kosong berapa pun data yang user isi,
// krn user SEBENARNYA mengisi data investasinya lewat 📋 Buku Aset
// (D.assets, field modalInvestasi/hargaBeli/jumlahUnit — SUDAH ADA UI-nya
// & SUDAH dipakai Aset.renderInvestasi() utk kartu "Performa Investasi").
// `Aset.investmentPerformance()` (diekstrak dari Aset.renderInvestasi()
// sesi ini, 0 rumus baru — lihat modules/asset/aset.js) adalah SATU-
// SATUNYA tempat yang benar-benar merepresentasikan data investasi yang
// user isi. `Investment`/`D.investments` TIDAK dihapus (masih dipakai
// modul lain / mungkin dipakai lagi kalau nanti dibuatkan UI-nya sendiri)
// — hanya TIDAK dipakai lagi sbg sumber Investment Planner.
const InvestmentPlannerAPI = {

// _portfolio() — helper internal: satu titik akses ke
// `Aset.investmentPerformance()`. Guard berlapis (Aset belum dimuat) —
// pola sama persis guard `typeof goalAdapterList==='function'` di
// FinancialGoalAPI._goals(). Field di-mapping APA ADANYA dari hasil
// investmentPerformance() (0 recompute) ke bentuk yang sama seperti
// sebelumnya (holdingsCount/totalValue/totalCost/totalGainLoss/roiPct)
// supaya presenter & investmentRecommendation() di bawah TIDAK perlu
// diubah sama sekali. totalDividend/totalRealizedGain selalu 0 — Buku
// Aset memang tidak melacak riwayat dividen/transaksi jual per instrumen
// (beda cakupan dari `Investment`), jadi jujur dilaporkan 0, BUKAN
// dihitung-hitung/diperkirakan.
_portfolio() {
  if (typeof Aset === 'undefined' || typeof Aset.investmentPerformance !== 'function') {
    return { ok: false, reason: 'Aset belum dimuat' };
  }
  let p;
  try {
    p = Aset.investmentPerformance();
  } catch (e) {
    return { ok: false, reason: 'Aset.investmentPerformance() gagal dipanggil' };
  }
  return {
    ok: true,
    holdingsCount: p.holdingsCount,
    totalValue: p.totalNilai,
    totalCost: p.totalModal,
    totalGainLoss: p.gain,
    roiPct: p.roiPct,
    totalDividend: 0,
    totalRealizedGain: 0,
  };
},

// portfolioOverview() — Investment Portfolio Overview. `Aset.
// investmentPerformance()` APA ADANYA (lewat _portfolio() — 0 recompute).
portfolioOverview() {
  return this._portfolio();
},

// _allocation() — helper internal: alokasi per `jenis` aset (field yang
// SUDAH ADA di Buku Aset, dipilih user tiap input aset — lihat
// modules/asset/aset.js), dihitung dari `tracked` (list aset yang punya
// data modal) hasil `Aset.investmentPerformance()`. Bentuk output
// {type,value,pct} SAMA PERSIS pola lama (Investment.assetAllocation())
// supaya presenter tidak perlu diubah. Pengelompokan by-jenis & reduce
// max/sort di bawah bentuknya SAMA PERSIS pola grouping-by-kategori yang
// sudah ada di AssetInsight.compute() (aset.js) — bukan rumus baru.
_allocation() {
  if (typeof Aset === 'undefined' || typeof Aset.investmentPerformance !== 'function') {
    return { ok: false, reason: 'Aset belum dimuat' };
  }
  let p;
  try {
    p = Aset.investmentPerformance();
  } catch (e) {
    return { ok: false, reason: 'Aset.investmentPerformance() gagal dipanggil' };
  }
  const tracked = Array.isArray(p.tracked) ? p.tracked : [];
  const totalValue = tracked.reduce((s, x) => s + (x.a.nilai || 0), 0);
  const byType = new Map();
  for (const x of tracked) {
    const type = x.a.jenis || 'Lainnya';
    const v = x.a.nilai || 0;
    byType.set(type, (byType.get(type) || 0) + v);
  }
  const allocation = Array.from(byType.entries())
    .map(([type, value]) => ({ type, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
  return { ok: true, allocation };
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

// watchlistAlerts() — Watchlist Alerts. SESI 160B: Buku Aset (sumber data
// Investment Planner sekarang, lihat catatan _portfolio()/_allocation() di
// atas) TIDAK punya konsep watchlist (instrumen yang dipantau tapi belum
// dibeli) — field itu cuma ada di `Investment`/`D.investments` yang tidak
// pernah terisi. Jadi selalu `ok:true, count:0` (BUKAN error — watchlist
// memang belum jadi fitur di Buku Aset, bukan gagal load), supaya
// investmentRecommendation() di bawah tetap jalan normal tanpa alert
// watchlist apa pun.
watchlistAlerts() {
  return { ok: true, alerts: [], count: 0 };
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
    out.push({ type: 'info', code: 'invest_no_holdings', message: 'Belum ada instrumen dengan data modal — isi Modal Investasi (atau Harga Beli × Jumlah Unit) di 📋 Buku Aset utk mulai memantau ROI & alokasi aset.' });
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
