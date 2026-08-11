// modules/finance/debt-optimizer-api.js — Debt Optimizer API (Sesi 96,
// Batch 10). Target sesi: Debt Optimizer Foundation — Debt Overview,
// DSR (Debt Service Ratio), Payoff Plan, Debt Recommendation, Presenter.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE `Debt`/`DebtStrategy`
// (modules/finance/piutang-utang.js, MODUL LAMA — sudah punya
// totalValue()/totalCicilanBulanan()/activeDebts()/computeOrder()/
// computeDSR()/simulate(), field-field & rumus di dalamnya SUDAH FINAL,
// dihitung ulang oleh Debt/DebtStrategy sendiri — TIDAK dihitung ulang
// di sini) — TIDAK ada rumus keuangan baru, TIDAK duplikasi logic,
// TIDAK framework baru, TIDAK mengubah struktur data D (murni membaca
// D.debts/D.debtStrategy lewat Debt/DebtStrategy, yang sudah ada sejak
// Sesi 16). Pola file/komentar sama persis
// modules/finance/investment-planner-api.js (Sesi 95).
//
// Debt Overview/DSR di bawah BUKAN hasil hitungan baru — murni MEMBACA
// ULANG hasil `Debt.totalValue()`/`Debt.totalCicilanBulanan()`/
// `DebtStrategy.activeDebts()`/`DebtStrategy.computeDSR()` apa adanya
// (0 recompute), pola sama persis `portfolioOverview()`
// (investment-planner-api.js) yang murni membaca ulang
// `Investment.portfolioSummary()`.
//
// Payoff Plan di bawah murni memanggil `DebtStrategy.computeOrder()` +
// `DebtStrategy.simulate()` APA ADANYA dengan method/extra yang SUDAH
// tersimpan di `D.debtStrategy` (state yang sama dipakai `DebtStrategy.
// render()` sendiri) — 0 rumus baru, 0 duplikasi loop simulasi bunga.
//
// Debt Recommendation di bawah derivatif murni dari Debt Overview + DSR
// + Payoff Plan (semua milik file ini sendiri) — pola sama persis
// `investmentRecommendation()` (investment-planner-api.js) yang juga
// cuma menyusun rule dari klasifikasi/angka yang sudah final, BUKAN
// duplikasi `FinanceIntelligence.insights()`/`DebtStrategy.render()`
// (cakupan beda: khusus utang, tanpa DOM).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (DebtOptimizerPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const DebtOptimizerAPI = {

// _overview() — helper internal: satu titik akses ke
// `Debt.totalValue()`/`Debt.totalCicilanBulanan()`/
// `DebtStrategy.activeDebts()`. Guard berlapis (Debt/DebtStrategy belum
// dimuat) — pola sama persis guard `typeof Investment==='undefined'`
// di InvestmentPlannerAPI._portfolio().
_overview() {
  if (typeof Debt === 'undefined' || typeof DebtStrategy === 'undefined') {
    return { ok: false, reason: 'Debt/DebtStrategy belum dimuat' };
  }
  let totalValue, totalCicilanBulanan, activeCount;
  try {
    // KW-170: DebtStrategy.activeDebts() SEKARANG SUDAH gabung Utang
    // formal (D.debts) + cicilan barang aktif (Buku Tagihan
    // kind:'cicilan', lihat DebtStrategy.billCicilanAsDebtLike()) — 1
    // sumber utk activeCount, TIDAK dijumlah manual lagi di sini spy
    // tidak dobel hitung (sebelum KW-170 ini masih dijumlah terpisah,
    // krn dulu activeDebts() cuma D.debts).
    activeCount = DebtStrategy.activeDebts().length;
    // Cicilan non-utang (Buku Tagihan kind:'cicilan') — filter SAMA
    // PERSIS dgn DebtStrategy.computeDSR() (totalCicilanLain), 0 rumus
    // baru, biar Ringkasan Utang & DSR konsisten sumbernya. totalValue
    // ikut ditambah outstanding-nya (amount×sisaTenor, sama persis
    // formula di Debt.renderList()/getBillStats()) biar konsisten sama
    // total yang sekarang tampil di header Buku Utang.
    const billCicilan = (D.bills || []).filter(b => b.kind === 'cicilan' && b.sisaTenor != null);
    totalValue = Debt.totalValue() + billCicilan.reduce((s, b) => s + (b.amount || 0) * (b.sisaTenor || 0), 0);
    totalCicilanBulanan = Debt.totalCicilanBulanan() + billCicilan.reduce((s, b) => s + (b.amount || 0), 0);
  } catch (e) {
    return { ok: false, reason: 'Debt/DebtStrategy gagal dipanggil' };
  }
  return { ok: true, activeCount, totalValue, totalCicilanBulanan };
},

// debtOverview() — Debt Overview. `Debt.totalValue()`/
// `Debt.totalCicilanBulanan()`/`DebtStrategy.activeDebts().length` APA
// ADANYA (0 recompute).
debtOverview() {
  return this._overview();
},

// _dsr() — helper internal: satu titik akses ke
// `DebtStrategy.computeDSR()`. Guard sama pola dgn _overview().
_dsr() {
  if (typeof DebtStrategy === 'undefined') {
    return { ok: false, reason: 'DebtStrategy belum dimuat' };
  }
  let d;
  try {
    d = DebtStrategy.computeDSR();
  } catch (e) {
    return { ok: false, reason: 'DebtStrategy.computeDSR() gagal dipanggil' };
  }
  return { ok: true, ...d };
},

// dsr() — Debt Service Ratio. `DebtStrategy.computeDSR()` APA ADANYA
// (totalCicilanUtang/totalCicilanLain/totalCicilan/incAvg/pct — 0
// recompute, rumus & sumber income sama persis dipakai `DebtStrategy.
// render()` sendiri).
dsr() {
  return this._dsr();
},

// payoffPlan() — Payoff Plan. `DebtStrategy.computeOrder()` +
// `DebtStrategy.simulate()` APA ADANYA, dengan method/extra dari
// `D.debtStrategy` (state yang sama dipakai `DebtStrategy.render()`
// sendiri, default 'avalanche'/0 sama persis pola default di
// `DebtStrategy.render()`) — 0 rumus baru.
payoffPlan() {
  if (typeof DebtStrategy === 'undefined' || typeof D === 'undefined') {
    return { ok: false, reason: 'DebtStrategy/D belum dimuat' };
  }
  let active;
  try {
    active = DebtStrategy.activeDebts();
  } catch (e) {
    return { ok: false, reason: 'DebtStrategy.activeDebts() gagal dipanggil' };
  }
  const ds = (D && D.debtStrategy) || {};
  const method = ds.method === 'snowball' ? 'snowball' : 'avalanche';
  const extra = ds.extra || 0;
  if (!active.length) {
    return { ok: true, method, extra, order: [], simulation: { months: null, totalInterest: 0, payoffMonth: {} } };
  }
  let order, simulation;
  try {
    order = DebtStrategy.computeOrder(active, method);
    simulation = DebtStrategy.simulate(order, extra);
  } catch (e) {
    return { ok: false, reason: 'DebtStrategy.computeOrder()/simulate() gagal dipanggil' };
  }
  return { ok: true, method, extra, order, simulation };
},

// debtRecommendation() — Debt Recommendation. Derivatif murni dari
// debtOverview() + dsr() + payoffPlan() milik file ini sendiri — pola
// sama persis investmentRecommendation() (investment-planner-api.js).
// 5 rule turunan, murni perbandingan sederhana atas field yang sudah
// final (0 rumus baru):
//   - activeCount===0 -> info (belum ada utang aktif)
//   - dsr.pct>35 -> warning (DSR lewat batas aman)
//   - dsr.pct>30 (<=35) -> info (DSR mendekati batas aman)
//   - dsr.pct<=30 (incAvg>0) -> positive (DSR masih di zona aman)
//   - payoffPlan.simulation.months tersedia -> info (estimasi lunas
//     semua & total bunga yang masih akan dibayar)
debtRecommendation() {
  const o = this.debtOverview();
  const out = [];
  if (!o.ok) return out;
  if (o.activeCount === 0) {
    out.push({ type: 'info', code: 'debt_none', message: 'Belum ada utang aktif — Debt Optimizer akan aktif begitu ada utang tercatat di 📕 Buku Utang.' });
    return out;
  }
  const d = this.dsr();
  if (d.ok && d.incAvg > 0 && typeof d.pct === 'number') {
    if (d.pct > 35) {
      out.push({ type: 'warning', code: 'debt_dsr_high', message: `DSR (rasio cicilan) ${d.pct.toFixed(0)}% sudah lewat batas aman (30–35%) — pertimbangkan percepat pelunasan atau tunda kewajiban baru.` });
    } else if (d.pct > 30) {
      out.push({ type: 'info', code: 'debt_dsr_watch', message: `DSR (rasio cicilan) ${d.pct.toFixed(0)}% mendekati batas aman 30–35% — mulai hati-hati sebelum nambah utang baru.` });
    } else {
      out.push({ type: 'positive', code: 'debt_dsr_safe', message: `DSR (rasio cicilan) ${d.pct.toFixed(0)}% masih di zona aman.` });
    }
  }
  const p = this.payoffPlan();
  if (p.ok && p.simulation && p.simulation.months != null) {
    out.push({ type: 'info', code: 'debt_payoff_estimate', message: `Estimasi lunas semua utang: ${p.simulation.months} bulan lagi, dengan total bunga ${Math.round(p.simulation.totalInterest).toLocaleString('id-ID')} (metode ${p.method}).` });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter), murni
// memanggil ke-4 fungsi di atas, TIDAK ada logic tambahan. `ok` true
// kalau debtOverview() ok (pola sama persis InvestmentPlannerAPI.
// summary() — dsr/payoffPlan/recommendation TIDAK ikut menentukan `ok`
// gabungan).
summary() {
  const debtOverview = this.debtOverview();
  const dsr = this.dsr();
  const payoffPlan = this.payoffPlan();
  const recommendation = this.debtRecommendation();
  return {
    ok: !!debtOverview.ok,
    debtOverview,
    dsr,
    payoffPlan,
    recommendation: Array.isArray(recommendation) ? recommendation : [],
  };
},

};
