// fuel-trend-dashboard.js — Fuel Trend Dashboard (TASK-156).
//
// PRINSIP: UI HANYA presenter, 0 rumus/skoring/engine/storage baru. 100%
// REUSE (persis 4 dependency yang diminta task, dipanggil LANGSUNG — bukan
// cuma lewat FuelInsightEngine.getSummary() seperti FuelDashboard/
// FuelCompare — supaya field trend granular yang tidak diekspos
// getSummary() (mis. biaya AKTUAL vs PROYEKSI terpisah, tahun berjalan,
// rata-rata harga BBM, frekuensi isi, estimasi tanggal isi berikutnya,
// status degradasi efisiensi + dropPct, daftar rekomendasi perawatan)
// tetap 100% dibaca APA ADANYA dari engine yang sudah ada):
//   - FuelInsightEngine.getSummary(vehicleId) (TASK-149/150A) -> healthScore
//     + highestInsight dibaca apa adanya, pola SAMA PERSIS FuelDashboard.
//   - FuelCostAnalytics (TASK-147) -> monthlyCost()/yearlyCost() (histori
//     AKTUAL), projectedMonthlyCost()/projectedYearlyCost() (100% reuse
//     FuelPredictionEngine di baliknya), averageFuelPrice(),
//     refillFrequency() — SEMUA dibaca apa adanya, 0 SUM/rata-rata baru
//     dihitung ulang di sini.
//   - FuelPredictionEngine (TASK-146) -> predictRemainingDistance()/
//     predictNextRefuel()/predictMonthlyFuelUsage() — dibaca apa adanya, 0
//     rumus km/L/proyeksi baru.
//   - FuelMaintenanceEngine (TASK-148) -> fuelEfficiencyHealth() (status
//     degradasi + dropPct APA ADANYA)/maintenanceRisk()/
//     maintenanceRecommendation() (daftar teks rekomendasi APA ADANYA, 0
//     kalimat baru disusun di sini) — dibaca apa adanya.
//
// TIDAK ADA method di atas yang diubah sesi ini (audit: seluruh 4
// dependency dipakai HANYA lewat API publik yang sudah ada, 0 rumus servis/
// efisiensi/proyeksi/degradasi baru ditulis di file ini). 0 storage baru
// (tidak pernah menulis ke D). 0 chart/grafik visual (di luar scope task —
// kandidat "Chart/grafik visual utk VehicleTrendAPI.monthlyCostTrend()" di
// AI_TASK_QUEUE.md tetap BLOCKED, task ini murni tabel angka trend/
// proyeksi, bukan visualisasi grafis).
//
// Dashboard ini mengelola kendaraan aktifnya SENDIRI (this.curVehicleId,
// pola sama persis FuelDashboard.curVehicleId/FuelModal.curVehicleId/
// FuelBarCorrection.curVehicleId, SUDAH ADA) supaya TIDAK menyentuh
// FuelFleetSelector ataupun variabel global curVehicleId (dipakai tab Car
// Notes) sama sekali — konsisten dgn batasan "Jangan mengubah engine yang
// ada kecuali ditemukan bug" (tidak ada bug ditemukan sesi ini, 0 engine
// disentuh).
//
// KONTRAK render(vehicleId?): vehicleId opsional. Kalau tidak diberikan,
// pakai this.curVehicleId (kendaraan terakhir dipilih di dashboard ini)
// atau curVehicleId global (kendaraan aktif Car Notes, SUDAH ADA) sbg
// default, pola sama persis FuelDashboard.render(). Kalau vehicleId yang
// diminta tidak ditemukan di D.vehicles ("Invalid vehicle"), fallback ke
// kendaraan pertama (BUKAN menyembunyikan dashboard begitu saja), pola
// sama persis FuelDashboard. Dashboard disembunyikan
// (wrap.style.display='none') HANYA kalau: (a) 0 kendaraan sama sekali
// ("No vehicle"), atau (b) FuelInsightEngine belum dimuat, atau (c)
// FuelInsightEngine.getSummary() balikin {ok:false} utk kendaraan yang
// dicoba — sama persis kontrak FuelDashboard. Section trend individual
// (biaya/prediksi/efisiensi-perawatan) masing-masing DIJAGA per-dependency
// (guard typeof + try/catch) — kalau salah satu dependency (FuelCostAnalytics/
// FuelPredictionEngine/FuelMaintenanceEngine) belum dimuat atau method-nya
// balikin {ok:false}, section itu saja yang tampil placeholder "-",
// section lain TIDAK ikut terblokir.
const FuelTrendDashboard = {

curVehicleId: null,

_vehicles() {
  return (typeof D !== 'undefined' && Array.isArray(D.vehicles)) ? D.vehicles : [];
},

// render(vehicleId?) — API publik satu-satunya utk menggambar dashboard.
// Dipanggil dari modules/shared/modules-render.js (renderCnTab(), pola
// sama persis FuelDashboard.render()/FuelCompare.render()) &
// FuelBarCorrection.save() (refresh setelah koreksi bar tersimpan).
render(vehicleId) {
  const wrap = document.getElementById('fuelTrendWrap');
  const body = document.getElementById('fuelTrendBody');
  if (!wrap || !body) return;

  const vehicles = this._vehicles();
  if (!vehicles.length) { wrap.style.display = 'none'; return; }
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getSummary !== 'function') {
    wrap.style.display = 'none';
    return;
  }

  // Tentukan kendaraan aktif: parameter -> state dashboard sendiri ->
  // curVehicleId global (kendaraan aktif Car Notes, SUDAH ADA) -> fallback
  // kendaraan pertama kalau semuanya tidak valid/tidak ada di D.vehicles
  // ("Invalid vehicle" case — TIDAK menyembunyikan dashboard begitu saja).
  let vid = vehicleId || this.curVehicleId || (typeof curVehicleId !== 'undefined' ? curVehicleId : null);
  if (!vid || !vehicles.find((v) => v.id === vid)) vid = vehicles[0].id;

  let summary;
  try {
    summary = FuelInsightEngine.getSummary(vid);
  } catch (e) {
    wrap.style.display = 'none';
    return;
  }
  if (!summary || !summary.ok) {
    wrap.style.display = 'none';
    return;
  }

  this.curVehicleId = vid;
  wrap.style.display = '';
  const trend = this._buildTrendData(vid);
  body.innerHTML = this._body(vid, vehicles, summary, trend);
},

// switchVehicle(vehicleId) — dipanggil dari tap chip kendaraan (data-action,
// lihat _vehicleChips()). Murni delegasi ke render() dgn vehicleId baru —
// 0 logic baru, supaya perilaku "kendaraan tidak ditemukan"/dsb konsisten
// dgn render() langsung.
switchVehicle(vehicleId) {
  this.render(vehicleId);
},

// _safeCall(fn) — panggil 1 method engine dgn guard typeof + try/catch,
// balikin hasilnya APA ADANYA kalau {ok:true}, atau null kalau method
// tidak ada/throw/{ok:false} — dipakai SELURUH pemanggilan engine di
// _buildTrendData() supaya 1 dependency gagal tidak menggagalkan section
// lain (pola sama semangatnya dgn guard per-field FuelInsightEngine.
// getSummary()).
_safeCall(fn) {
  if (typeof fn !== 'function') return null;
  try {
    const res = fn();
    return (res && res.ok) ? res : null;
  } catch (e) {
    return null;
  }
},

// _buildTrendData(vid) — kumpulkan SELURUH field trend/proyeksi dari 4
// dependency yang diminta task, masing-masing dibaca APA ADANYA (0 rumus
// baru). Setiap field individual bisa null (dependency belum dimuat/data
// belum cukup) — TIDAK memblokir field lain, pola sama persis
// FuelInsightEngine.getSummary().
_buildTrendData(vid) {
  const hasCost = typeof FuelCostAnalytics !== 'undefined';
  const hasPred = typeof FuelPredictionEngine !== 'undefined';
  const hasMaint = typeof FuelMaintenanceEngine !== 'undefined';
  return {
    monthlyCost: hasCost ? this._safeCall(() => FuelCostAnalytics.monthlyCost(vid)) : null,
    projectedMonthlyCost: hasCost ? this._safeCall(() => FuelCostAnalytics.projectedMonthlyCost(vid)) : null,
    yearlyCost: hasCost ? this._safeCall(() => FuelCostAnalytics.yearlyCost(vid)) : null,
    projectedYearlyCost: hasCost ? this._safeCall(() => FuelCostAnalytics.projectedYearlyCost(vid)) : null,
    averageFuelPrice: hasCost ? this._safeCall(() => FuelCostAnalytics.averageFuelPrice(vid)) : null,
    refillFrequency: hasCost ? this._safeCall(() => FuelCostAnalytics.refillFrequency(vid)) : null,
    remainingDistance: hasPred ? this._safeCall(() => FuelPredictionEngine.predictRemainingDistance(vid)) : null,
    nextRefuel: hasPred ? this._safeCall(() => FuelPredictionEngine.predictNextRefuel(vid)) : null,
    monthlyUsage: hasPred ? this._safeCall(() => FuelPredictionEngine.predictMonthlyFuelUsage(vid)) : null,
    efficiencyHealth: hasMaint ? this._safeCall(() => FuelMaintenanceEngine.fuelEfficiencyHealth(vid)) : null,
    maintenanceRisk: hasMaint ? this._safeCall(() => FuelMaintenanceEngine.maintenanceRisk(vid)) : null,
    maintenanceRecommendation: hasMaint ? this._safeCall(() => FuelMaintenanceEngine.maintenanceRecommendation(vid)) : null,
  };
},

// _vehicleChips(vehicles, activeId) — switcher multi-kendaraan, pola SAMA
// PERSIS FuelDashboard._vehicleChips() (duplikasi kecil disengaja, sama
// pola dgn duplikasi kecil lain yang sudah ada di project ini, mis.
// _priorityColor() vs _riskColor() — supaya modul ini tetap 100%
// independen). Disembunyikan kalau cuma 1 kendaraan.
_vehicleChips(vehicles, activeId) {
  if (vehicles.length < 2) return '';
  return `<div class="u-flex u-gap6 u-mb10" style="overflow-x:auto;padding-bottom:2px">`
    + vehicles.map((v) => `<button type="button" class="chip-btn${v.id === activeId ? ' active' : ''}" data-action="FuelTrendDashboard.switchVehicle" data-args="${escapeHtml(JSON.stringify([v.id]))}">${escapeHtml(v.emoji ? v.emoji + ' ' : '')}${escapeHtml(v.name)}</button>`).join('')
    + `</div>`;
},

// _priorityColor(priority) — mapping tampilan murni (bukan rumus/skoring
// baru), pola sama persis FuelDashboard._priorityColor().
_priorityColor(priority) {
  const map = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'orange', LOW: '', INFO: '' };
  return map[priority] || '';
},

// _rp(n) — format Rupiah tampilan murni, pola sama persis dipakai
// fuel-dashboard.js (Math.round + toLocaleString('id-ID')), 0 rumus baru.
_rp(n) {
  return (n === null || n === undefined) ? '-' : 'Rp' + Math.round(n).toLocaleString('id-ID');
},

// _row(label, value) — 1 baris label/value murni tampilan, dipakai
// berulang di seluruh section supaya markup konsisten & ringkas.
_row(label, value) {
  return `<div class="u-flex u-jcb u-aic u-fs12" style="margin-bottom:6px"><span class="u-t2">${escapeHtml(label)}</span><span class="u-fw700">${escapeHtml(String(value))}</span></div>`;
},

// _section(title, innerHtml) — bungkus 1 section trend dgn judul, pola
// tampilan murni dipakai berulang.
_section(title, innerHtml) {
  return `<div style="margin-bottom:12px">
    <div class="u-fs11 u-t2 u-fw800" style="text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">${escapeHtml(title)}</div>
    ${innerHtml}
  </div>`;
},

// _costSectionHtml(trend) — biaya BBM AKTUAL (histori bulan/tahun
// berjalan, FuelCostAnalytics.monthlyCost()/yearlyCost()) DAN PROYEKSI
// (FuelCostAnalytics.projectedMonthlyCost()/projectedYearlyCost(), yang
// sendiri 100% reuse FuelPredictionEngine) berdampingan — SEMUA angka
// dibaca apa adanya, 0 rumus baru. Field yang datanya belum tersedia
// tampil "-" (tidak memblokir baris lain).
_costSectionHtml(trend) {
  const rows = [
    this._row('Bulan Ini (Aktual)', trend.monthlyCost ? this._rp(trend.monthlyCost.totalCost) : '-'),
    this._row('Proyeksi Bulan Ini', trend.projectedMonthlyCost ? this._rp(trend.projectedMonthlyCost.estimatedCost) : '-'),
    this._row('Tahun Ini (Aktual)', trend.yearlyCost ? this._rp(trend.yearlyCost.totalCost) : '-'),
    this._row('Proyeksi Tahun Ini', trend.projectedYearlyCost ? this._rp(trend.projectedYearlyCost.estimatedCost) : '-'),
    this._row('Rata-rata Harga BBM', trend.averageFuelPrice ? this._rp(trend.averageFuelPrice.averagePrice) + '/L' : '-'),
    this._row('Frekuensi Isi BBM', trend.refillFrequency ? `${trend.refillFrequency.refillCount}x, rata-rata ${trend.refillFrequency.averageIntervalDays} hari` : '-'),
  ].join('');
  return this._section('Biaya & Frekuensi BBM', rows);
},

// _predictionSectionHtml(trend) — prediksi jarak tersisa/isi ulang
// berikutnya/pemakaian bulan depan, 100% REUSE FuelPredictionEngine, 0
// rumus baru.
_predictionSectionHtml(trend) {
  const rows = [
    this._row('Estimasi Jarak Tersisa', trend.remainingDistance ? `${Math.round(trend.remainingDistance.remainingKm)} km` : '-'),
    this._row('Prediksi Isi BBM Berikutnya', trend.nextRefuel ? `${trend.nextRefuel.estimatedDate || '-'} (${trend.nextRefuel.estimatedRemainingDays} hari lagi)` : '-'),
    this._row('Proyeksi Pemakaian Bulan Depan', trend.monthlyUsage ? `${trend.monthlyUsage.estimatedLiter} L (${this._rp(trend.monthlyUsage.estimatedCost)})` : '-'),
  ].join('');
  return this._section('Prediksi', rows);
},

// _maintenanceSectionHtml(trend) — status kesehatan efisiensi (termasuk
// trend dropPct kalau terdeteksi degradasi) + risiko perawatan +
// rekomendasi teks, 100% REUSE FuelMaintenanceEngine, 0 rumus baru.
_maintenanceSectionHtml(trend) {
  const eff = trend.efficiencyHealth;
  const effRows = eff
    ? [
        this._row('Status Efisiensi', eff.status === 'menurun' ? `Menurun (-${eff.dropPct}%)` : 'Baik'),
        this._row('km/Liter Saat Ini', `${eff.kmPerLiter}`),
        this._row('Rp/km Saat Ini', this._rp(eff.rpPerKm)),
      ].join('')
    : this._row('Status Efisiensi', '-');
  const risk = trend.maintenanceRisk;
  const riskRow = this._row('Risiko Perawatan', risk ? risk.riskLevel : '-');
  const recs = trend.maintenanceRecommendation && trend.maintenanceRecommendation.recommendations && trend.maintenanceRecommendation.recommendations.length
    ? `<ul class="u-fs12 u-t2" style="margin:6px 0 0;padding-left:18px">${trend.maintenanceRecommendation.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
    : '';
  return this._section('Efisiensi & Perawatan', effRows + riskRow + recs);
},

// _highestInsightHtml(insight) — summary.highestInsight APA ADANYA
// (FuelInsightEngine.getInsights(), sudah diurutkan prioritas oleh engine
// itu sendiri) — 0 logic sortir/prioritas baru ditulis di sini, pola sama
// persis FuelDashboard._highestInsightHtml(). `null` -> baris ini
// dilewati.
_highestInsightHtml(insight) {
  if (!insight) return '';
  const col = this._priorityColor(insight.priority);
  return this._section('Insight Prioritas Tertinggi', `<div class="u-fs12${col ? ' ' + col : ''}" style="line-height:1.5"><b>${escapeHtml(insight.title)}</b><br>${escapeHtml(insight.description)}</div>`);
},

// _body(vid, vehicles, summary, trend) — susun 1 kartu Fuel Trend
// Dashboard: header + (kalau >1 kendaraan) switcher + section biaya &
// frekuensi + section prediksi + section efisiensi & perawatan + insight
// prioritas tertinggi + CTA (100% reuse FuelModal.open()/
// FuelBarCorrection.open(), pola SAMA PERSIS baris CTA fuel-dashboard.js).
_body(vid, vehicles, summary, trend) {
  const veh = vehicles.find((v) => v.id === vid);
  const name = veh ? (veh.emoji ? veh.emoji + ' ' : '') + veh.name : '';
  return `
    <div class="dashhub-cat-head">
      <div class="dashhub-cat-icon">📈</div>
      <div>
        <div class="dashhub-cat-label">Fuel Trend Dashboard</div>
        <div class="dashhub-cat-desc">${escapeHtml(name)}</div>
      </div>
    </div>
    ${this._vehicleChips(vehicles, vid)}
    ${this._costSectionHtml(trend)}
    ${this._predictionSectionHtml(trend)}
    ${this._maintenanceSectionHtml(trend)}
    ${this._highestInsightHtml(summary.highestInsight)}
    <div class="btn-row" style="margin-bottom:0">
      <button class="btn btn-ghost btn-sm" data-action="FuelModal.open" data-args="${escapeHtml(JSON.stringify([vid]))}">📊 Lihat Detail</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelBarCorrection.open" data-args="${escapeHtml(JSON.stringify([vid]))}" aria-label="Koreksi estimasi BBM dengan speedometer">⚙️ Koreksi</button>
    </div>
  `;
},

};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action) bisa
// menemukan modul ini lewat window['FuelTrendDashboard']['switchVehicle']
// dst. `const FuelTrendDashboard = {...}` di atas HANYA membuat binding
// lexical-scope (bukan properti window), pola fix sama persis
// window.DashboardHub di dashboard-hub-search.js. Tanpa baris ini, chip
// pilih kendaraan, "📊 Lihat Detail" & "⚙️ Koreksi" di Fuel Trend
// Dashboard tidak akan pernah berfungsi meski test lolos (test memanggil
// fungsi langsung, bukan lewat jalur klik data-action yang sesungguhnya).
if (typeof FuelTrendDashboard !== 'undefined') window.FuelTrendDashboard = FuelTrendDashboard;
