// modules/finance/retirement-planner-api.js — Retirement Planner API
// (Sesi 97, Batch 10). Target sesi: Retirement Planner Foundation —
// Retirement Overview, Gap Analysis, Contribution Recommendation,
// Retirement Recommendation, Presenter.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE `Pensiun` (modules/shared/
// modules-calc.js, MODUL LAMA — sudah punya danaTerkumpul()/proyeksi()/
// sisaBulan()/rekomendasiKontribusi(), field-field & rumus (FV anuitas
// bertumbuh) di dalamnya SUDAH FINAL, dihitung ulang oleh Pensiun
// sendiri — TIDAK dihitung ulang di sini) — TIDAK ada rumus keuangan
// baru, TIDAK duplikasi logic, TIDAK framework baru, TIDAK mengubah
// struktur data D (murni membaca D.pensiun lewat Pensiun, yang sudah
// ada sejak lama). Pola file/komentar sama persis modules/finance/
// debt-optimizer-api.js (Sesi 96)/investment-planner-api.js (Sesi 95).
//
// Retirement Overview di bawah BUKAN hasil hitungan baru — murni
// MEMBACA ULANG hasil `Pensiun.danaTerkumpul()`/`Pensiun.proyeksi()`/
// `Pensiun.sisaBulan()` apa adanya (0 recompute) + field konfigurasi
// `D.pensiun.targetDana`/`usiaSekarang`/`usiaPensiun`/
// `kontribusiBulanan` dibaca APA ADANYA (bukan hitungan, field mentah
// yang JUGA dibaca langsung apa adanya oleh `Pensiun.render()` sendiri
// — lihat `const p=D.pensiun||{}` di sana), pola sama persis
// `payoffPlan()` (debt-optimizer-api.js) yang membaca `D.debtStrategy`
// langsung.
//
// Gap Analysis di bawah SATU-SATUNYA "logic" baru sesi ini — murni
// `proyeksi - target` (selisih sederhana), bentuk yang SAMA PERSIS
// dipakai `Pensiun.render()` sendiri (`proyeksi>=target` -> status
// surplus/gap) — bukan rumus finansial baru, murni perbandingan atas
// field yang sudah final.
//
// Retirement Recommendation di bawah derivatif murni dari Retirement
// Overview + Gap Analysis + Contribution Recommendation (semua milik
// file ini sendiri) — pola sama persis `debtRecommendation()`
// (debt-optimizer-api.js) yang juga cuma menyusun rule dari
// klasifikasi/angka yang sudah final, BUKAN duplikasi
// `Pensiun.render()` (cakupan beda: khusus rekomendasi ringkas, tanpa
// DOM).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (RetirementPlannerPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const RetirementPlannerAPI = {

// _overview() — helper internal: satu titik akses ke
// `Pensiun.danaTerkumpul()`/`Pensiun.proyeksi()`/`Pensiun.sisaBulan()` +
// field konfigurasi `D.pensiun`. Guard berlapis (Pensiun belum dimuat)
// — pola sama persis guard `typeof DebtStrategy==='undefined'` di
// DebtOptimizerAPI._overview().
_overview() {
  if (typeof Pensiun === 'undefined') {
    return { ok: false, reason: 'Pensiun belum dimuat' };
  }
  let terkumpul, proyeksi, sisaBulan;
  try {
    terkumpul = Pensiun.danaTerkumpul();
    proyeksi = Pensiun.proyeksi();
    sisaBulan = Pensiun.sisaBulan();
  } catch (e) {
    return { ok: false, reason: 'Pensiun gagal dipanggil' };
  }
  const p = (typeof D !== 'undefined' && D.pensiun) || {};
  const usiaSekarang = Number(p.usiaSekarang) || 0;
  const usiaPensiun = Number(p.usiaPensiun) || 0;
  const target = Number(p.targetDana) || 0;
  const kontribusiBulanan = Number(p.kontribusiBulanan) || 0;
  const configured = !!(p.usiaSekarang && p.usiaPensiun && p.accId);
  return { ok: true, configured, terkumpul, proyeksi, sisaBulan, target, usiaSekarang, usiaPensiun, kontribusiBulanan };
},

// retirementOverview() — Retirement Overview. `Pensiun.danaTerkumpul()`/
// `Pensiun.proyeksi()`/`Pensiun.sisaBulan()` APA ADANYA (0 recompute) +
// field konfigurasi `D.pensiun` apa adanya.
retirementOverview() {
  return this._overview();
},

// _contribution() — helper internal: satu titik akses ke
// `Pensiun.rekomendasiKontribusi()`. Guard sama pola dgn _overview().
_contribution() {
  if (typeof Pensiun === 'undefined') {
    return { ok: false, reason: 'Pensiun belum dimuat' };
  }
  let r;
  try {
    r = Pensiun.rekomendasiKontribusi();
  } catch (e) {
    return { ok: false, reason: 'Pensiun.rekomendasiKontribusi() gagal dipanggil' };
  }
  return { ok: true, ...r };
},

// contributionRecommendation() — Contribution Recommendation.
// `Pensiun.rekomendasiKontribusi()` APA ADANYA (reko/surplus/months/pct
// — 0 recompute, rumus & sumber surplus sama persis dipakai `Pensiun.
// render()` sendiri).
contributionRecommendation() {
  return this._contribution();
},

// gapAnalysis() — Gap Analysis. Derivatif murni dari
// retirementOverview() (`proyeksi - target`, pola sama persis status
// surplus/gap di `Pensiun.render()`) — 0 rumus baru.
gapAnalysis() {
  const o = this.retirementOverview();
  if (!o.ok) return o;
  if (!(o.target > 0)) {
    return { ok: true, hasTarget: false, gap: 0, onTrack: false };
  }
  const gap = o.proyeksi - o.target;
  return { ok: true, hasTarget: true, gap, onTrack: gap >= 0 };
},

// retirementRecommendation() — Retirement Recommendation. Derivatif
// murni dari retirementOverview() + gapAnalysis() + _contribution()
// milik file ini sendiri — pola sama persis debtRecommendation()
// (debt-optimizer-api.js). Rule turunan, murni perbandingan sederhana
// atas field yang sudah final (0 rumus baru):
//   - !configured -> info (belum diatur usia/target/akun)
//   - configured & !hasTarget -> info (belum isi target dana)
//   - configured & hasTarget & onTrack -> positive (proyeksi melampaui
//     target)
//   - configured & hasTarget & !onTrack -> warning (proyeksi masih
//     kurang dari target)
//   - reko>kontribusiBulanan (dari _contribution(), kalau tersedia) ->
//     info (kontribusi bulanan saat ini di bawah rekomendasi)
retirementRecommendation() {
  const o = this.retirementOverview();
  const out = [];
  if (!o.ok) return out;
  if (!o.configured) {
    out.push({ type: 'info', code: 'retire_not_configured', message: 'Dana Pensiun belum diatur — isi usia sekarang, usia pensiun & akun tabungan dulu di menu 🏖️ Dana Pensiun.' });
    return out;
  }
  const g = this.gapAnalysis();
  if (g.ok) {
    if (!g.hasTarget) {
      out.push({ type: 'info', code: 'retire_no_target', message: 'Target Dana Pensiun belum diisi — isi dulu supaya gap terhadap proyeksi bisa dihitung.' });
    } else if (g.onTrack) {
      out.push({ type: 'positive', code: 'retire_on_track', message: `Proyeksi dana pensiun sudah melampaui target sebesar ${Math.round(g.gap).toLocaleString('id-ID')}.` });
    } else {
      out.push({ type: 'warning', code: 'retire_gap', message: `Proyeksi dana pensiun masih kurang ${Math.round(-g.gap).toLocaleString('id-ID')} dari target.` });
    }
  }
  const c = this._contribution();
  if (c.ok && c.reko > o.kontribusiBulanan) {
    out.push({ type: 'info', code: 'retire_contribution_below_reko', message: `Kontribusi bulanan saat ini di bawah rekomendasi (${Math.round(c.reko).toLocaleString('id-ID')}/bln berdasarkan surplus).` });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter), murni
// memanggil ke-4 fungsi di atas, TIDAK ada logic tambahan. `ok` true
// kalau retirementOverview() ok (pola sama persis DebtOptimizerAPI.
// summary() — gapAnalysis/contributionRecommendation/recommendation
// TIDAK ikut menentukan `ok` gabungan).
summary() {
  const retirementOverview = this.retirementOverview();
  const gapAnalysis = this.gapAnalysis();
  const contributionRecommendation = this.contributionRecommendation();
  const recommendation = this.retirementRecommendation();
  return {
    ok: !!retirementOverview.ok,
    retirementOverview,
    gapAnalysis,
    contributionRecommendation,
    recommendation: Array.isArray(recommendation) ? recommendation : [],
  };
},

};
