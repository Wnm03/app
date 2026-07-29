// vehicle-intelligence.js — Vehicle Intelligence Foundation (Sesi 76, Batch 7).
// Target sesi: lapisan agregasi domain VEHICLE — vehicle overview, health
// score per kendaraan, ringkasan armada (fleet), insight dasar — lihat
// docs/BATCH_PLAN.md § Batch 7. Pola SAMA PERSIS modules/finance/
// finance-intelligence.js (Sesi 74, Batch 6) — cuma dipindah ke domain
// vehicle, tidak ada arsitektur baru.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE, TIDAK ada framework/state baru,
// TIDAK duplikasi logic, TIDAK mengubah struktur data D. Semua angka di
// bawah dihitung dari service yang SUDAH ADA:
//   - getVehicleKm()      (modules/vehicle/vehicle-core.js)
//   - fuelEfficiency()    (modules/vehicle/vehicle-core.js)
//   - predictService()    (modules/vehicle/sparepart-servis.js)
//   - maintenanceForecast() (modules/vehicle/sparepart-servis.js)
// VehicleIntelligence TIDAK menghitung ulang estimasi KM/hari, konsumsi
// BBM, interval servis, atau jadwal servis berikutnya — semua itu dibaca
// apa adanya lewat pemanggilan fungsi di atas. Satu-satunya logic yang
// genuinely baru di sini adalah skoring komposit `healthScore()` (bobot
// per komponen, pola sama persis FinanceIntelligence.healthScore()) &
// agregasi lintas-kendaraan `fleetSummary()` (belum ada versi murninya
// sebelum sesi ini — yang ada baru per-kendaraan lewat predictService()/
// fuelEfficiency()).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. Dipakai sbg lapisan
// data utk widget/dashboard masa depan & AI briefing (di luar scope sesi
// ini — TIDAK ada UI/panel/wiring baru sesi ini, murni fondasi data/
// service, sama seperti finance-intelligence.js di Sesi 74).
const VehicleIntelligence = {

// _vehicles() — helper internal: baca D.vehicles apa adanya (array kosong
// kalau D/D.vehicles belum ada — guard typeof, pola sama persis guard
// D.budgets di FinanceIntelligence.budgetSummary()).
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

// vehicleOverview(vehicleId) — ringkasan 1 kendaraan: KM saat ini
// (getVehicleKm), prediksi servis (predictService), efisiensi BBM
// (fuelEfficiency). Reuse murni, TIDAK ada rumus baru. {ok:false} kalau
// kendaraan tidak ditemukan (pola sama persis {ok:false} predictService()
// saat vehicleId tidak ketemu).
vehicleOverview(vehicleId) {
  const veh = this._vehicles().find((v) => v.id === vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const curKm = (typeof getVehicleKm === 'function') ? getVehicleKm(vehicleId) : 0;
  const service = (typeof predictService === 'function')
    ? predictService({ vehicleId })
    : { ok: false, reason: 'predictService belum dimuat' };
  const fuel = (typeof fuelEfficiency === 'function')
    ? fuelEfficiency(vehicleId)
    : { ok: false, reason: 'fuelEfficiency belum dimuat' };
  return { ok: true, vehicleId, name: veh.name, emoji: veh.emoji, curKm, service, fuel };
},

// healthScore(vehicleId) — skor 0-100, komposit dari komponen yang
// TERSEDIA (bukan dihitung ulang, murni dibaca dari service yang sudah
// ada):
//   (1) service adherence — dari predictService().items, status per
//       kategori sparepart ('aman'=1, 'segera'=0.5, 'lewat'=0), status
//       ITU SENDIRI sama persis yang dipakai Servis.renderReminder() &
//       rule AIDecision 'vehicle-service-overdue' (tidak mengarang ambang
//       baru)
//   (2) ketersediaan data BBM & efisiensi terjaga — dari fuelEfficiency()
//       ok/tidak (butuh min. 2 log "Isi Full Tank" dgn km naik, syarat
//       yang sama persis dgn estimateRpPerKm())
// Tiap komponen bobot 50, HANYA disertakan kalau service-nya tersedia
// (guard ok/length, pola sama persis FinanceIntelligence.healthScore()) —
// skor akhir diskalakan ulang dari bobot yang benar-benar tersedia (bukan
// gagal total/0 kalau 1 komponen belum ada datanya). Rule-based murni,
// TIDAK ada panggilan AI/ML.
healthScore(vehicleId) {
  const parts = [];
  if (typeof predictService === 'function') {
    const pred = predictService({ vehicleId });
    if (pred.ok && Array.isArray(pred.items) && pred.items.length) {
      const scores = pred.items.map((it) => (it.status === 'aman' ? 1 : it.status === 'segera' ? 0.5 : 0));
      const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
      parts.push({ key: 'service', weight: 50, score: avg * 50 });
    }
  }
  if (typeof fuelEfficiency === 'function') {
    const fuel = fuelEfficiency(vehicleId);
    if (fuel.ok) parts.push({ key: 'fuel', weight: 50, score: 50 });
  }
  const maxScore = parts.reduce((s, p) => s + p.weight, 0);
  const rawScore = parts.reduce((s, p) => s + p.score, 0);
  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const label = maxScore === 0
    ? 'Data Kurang'
    : (score >= 80 ? 'Sehat' : score >= 60 ? 'Cukup Sehat' : score >= 40 ? 'Waspada' : 'Perlu Perhatian');
  return { score, label, parts };
},

// fleetSummary() — agregasi lintas SEMUA D.vehicles: total kendaraan,
// total item servis 'lewat' jatuh tempo (reuse predictService() per
// kendaraan — status yang SAMA dipakai _vehicleOverdueCheck() di
// sparepart-servis.js, TIDAK menduplikasi logic overdue, cuma membaca
// ulang hasil predictService() yang sudah ada), rata-rata healthScore
// seluruh armada. Belum ada versi murni (non-DOM, lintas-kendaraan) untuk
// ini sebelum sesi ini.
// fleetSummary() (Sesi 196, Ownership Sync Vehicle): TAMBAH 1 filter
// isVehicleOwnershipSelf(v.id) di atas this._vehicles() (0 logic lama
// diubah). Kendaraan ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY
// dikecualikan dari agregat armada (Dashboard/AI briefing), TAPI
// vehicleOverview(vehicleId)/healthScore(vehicleId) per-kendaraan TIDAK
// disentuh — kendaraan itu tetap kehitung normal kalau dilihat langsung
// by id (sama pola totalSaldoAkun() Sesi 192).
fleetSummary() {
  const vehicles = this._vehicles().filter((v) => (typeof isVehicleOwnershipSelf !== 'function') || isVehicleOwnershipSelf(v.id));
  const rows = vehicles.map((v) => {
    const hs = this.healthScore(v.id);
    let overdueCount = 0;
    if (typeof predictService === 'function') {
      const pred = predictService({ vehicleId: v.id });
      if (pred.ok && Array.isArray(pred.items)) {
        overdueCount = pred.items.filter((it) => it.status === 'lewat').length;
      }
    }
    return { vehicleId: v.id, name: v.name, healthScore: hs.score, healthLabel: hs.label, overdueCount };
  });
  const totalOverdue = rows.reduce((s, r) => s + r.overdueCount, 0);
  const avgHealth = rows.length ? Math.round(rows.reduce((s, r) => s + r.healthScore, 0) / rows.length) : 0;
  return { totalVehicles: vehicles.length, totalOverdue, avgHealth, vehicles: rows };
},

// insights(vehicleId?) — insight dasar, murni derivasi ambang batas dari
// fungsi di atas. BUKAN duplikasi rule AIDecision ('vehicle-service-
// overdue'/'vehicle-fuel-efficiency-drop' di sparepart-servis.js) — rule
// itu proaktif (registered ke AIDecision.rules, ada cooldown/weight/
// severity utk briefing), insight di sini derivatif ringan tanpa
// cooldown/registrasi apa pun, murni baca ulang hasil fungsi
// VehicleIntelligence sendiri. Tanpa vehicleId: insight FLEET-LEVEL (dari
// fleetSummary()). Dengan vehicleId: insight kendaraan itu saja (dari
// vehicleOverview()/healthScore()).
insights(vehicleId) {
  const out = [];
  if (vehicleId) {
    const ov = this.vehicleOverview(vehicleId);
    if (!ov.ok) return out;
    if (ov.service.ok && Array.isArray(ov.service.items)) {
      const lewat = ov.service.items.filter((it) => it.status === 'lewat');
      if (lewat.length) {
        out.push({ type: 'warning', code: 'service_overdue', message: `${lewat.length} item servis ${ov.name} sudah lewat jatuh tempo.` });
      }
    }
    if (ov.fuel.ok && ov.fuel.estMonthlyCost) {
      out.push({ type: 'info', code: 'fuel_cost_estimate', message: `Estimasi biaya BBM ${ov.name} bulan ini \u2248 ${Math.round(ov.fuel.estMonthlyCost)}.` });
    }
    const hs = this.healthScore(vehicleId);
    out.push({ type: 'info', code: 'health_score', message: `Skor kesehatan ${ov.name}: ${hs.score}/100 (${hs.label}).` });
    return out;
  }
  const fleet = this.fleetSummary();
  if (fleet.totalOverdue > 0) {
    out.push({ type: 'warning', code: 'fleet_overdue', message: `${fleet.totalOverdue} item servis lewat jatuh tempo di seluruh kendaraan.` });
  }
  if (fleet.totalVehicles > 0) {
    out.push({ type: 'info', code: 'fleet_health', message: `Rata-rata skor kesehatan armada: ${fleet.avgHealth}/100 dari ${fleet.totalVehicles} kendaraan.` });
  }
  return out;
},

// summary(vehicleId?) — satu pintu masuk gabungan (dipakai widget/AI
// briefing masa depan), murni memanggil fungsi di atas, TIDAK ada logic
// tambahan. Tanpa vehicleId: fleet-level (fleetSummary + insights fleet).
// Dengan vehicleId: tambahkan vehicleOverview + healthScore + insights
// kendaraan itu — pola sama persis FinanceIntelligence.summary().
summary(vehicleId) {
  const base = { fleet: this.fleetSummary(), insights: this.insights() };
  if (!vehicleId) return base;
  return {
    ...base,
    vehicle: this.vehicleOverview(vehicleId),
    healthScore: this.healthScore(vehicleId),
    vehicleInsights: this.insights(vehicleId),
  };
},

};
