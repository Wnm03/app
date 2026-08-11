// fuel-card.js — Fuel Card (TASK-141, Fuel Intelligence Card).
//
// PRINSIP: UI HANYA presenter. 100% REUSE FuelIntelligenceEngine.vehicleInsight()
// (sesi ini) utk kendaraan aktif (curVehicleId, SUDAH ADA — variabel yang
// sama dipakai VehicleDashboard/VehicleInsightPresenter/dll di tab Car
// Notes) — TIDAK ada rumus/skoring baru di sini, murni menyusun 1 kartu
// ringkas + CTA buka FuelModal (sesi ini). Silent (sembunyikan wrap)
// kalau belum ada kendaraan/data, pola sama persis #vehAlertWrap/
// #vehInsightFeedWrap.
//
// TASK-145 (Fuel Intelligence Integration): tambah tombol "⚙️ Koreksi"
// di baris CTA yang sama persis dgn tombol "Lihat Detail" yang sudah ada
// — 100% REUSE class button yang sudah ada (btn/btn-ghost/btn-sm), 0 style
// baru, 0 markup card lain diubah. Tombol panggil FuelBarCorrection.open()
// (TASK-144, sudah ada) via data-action, pola persis tombol lain di kartu
// ini. Juga tampilkan rekomendasi pasif (bukan dialog blocking) kalau
// veh.fuelState.confidenceScore SUDAH ADA & di bawah ambang LOW — dibaca
// langsung dari D.vehicles (field opsional dari TASK-144), 0 rumus/skoring
// baru dihitung di sini, murni tampilkan ulang skor yang sudah tersimpan.
//
// KONSOLIDASI (Sesi 156d, permintaan eksplisit user): section "Fuel
// Briefing" yang sebelumnya jadi card TERPISAH di dalam VehicleDailyBrief
// (modules/vehicle/vehicle-daily-brief.js, #vehBriefBody, TASK-151)
// DIPINDAH ke sini jadi SATU card dgn Fuel Intelligence — keduanya sama-
// sama soal BBM kendaraan aktif, jadi tidak perlu 2 card berbeda yang
// muncul berurutan (#vehBriefWrap lalu #fuelIntelWrap) utk info yang
// tumpang tindih. 100% REUSE FuelInsightEngine.getSummary(vehicleId)
// (TASK-149/150A, SUDAH ADA) — dipanggil dgn insight.vehicleId (vehicle
// yang SAMA yang sudah dipakai FuelIntelligenceEngine.vehicleInsight() di
// atas, BUKAN FuelFleetSelector — Fuel Card sudah scoped ke 1 kendaraan
// aktif, jadi tidak perlu lapisan pemilihan fleet-wide lagi utk data
// kendaraan yang sama). Field summary (healthScore/fuel/remainingDistance/
// monthlyCost/maintenanceRisk) & highestInsight (title/description/
// recommendation) dipakai APA ADANYA murni utk ditampilkan — 0 rumus baru,
// pola SAMA PERSIS _fuelBriefHtml() lama (isi/urutan baris tidak diubah,
// cuma pindah lokasi + ganti sumber pemilihan kendaraan). VehicleDailyBrief
// TIDAK lagi memanggil FuelFleetSelector sama sekali (lihat vehicle-daily-
// brief.js) — #vehBriefBody sekarang HANYA berisi ringkasan armada harian,
// bukan detail BBM 1 kendaraan.
//
// SESI FUEL-AUTOSYNC (badge sumber estimasi): tambah _sourceBadgeHtml(),
// dipasang tepat di bawah gauge (_gaugeHtml()) di _body(). 100% presenter
// -- baca ulang veh.fuelState.estimatedSource/correctedAt yang SUDAH
// ditulis FuelBarCorrection.save() (TASK-144) & syncFuelStateFromFullTankBbm()
// (tx-bbm.js, sesi s412), 0 field baru ditulis ke D, 0 rumus baru.
//
// SESI 416-lanjutan (FUEL-AUTOSYNC-06, "Sesi 3" rencana "Fuel Estimation
// Auto-Update"): gauge (_gaugeHtml()) sekarang baca liter via
// _liveEstimate() (BARU) -- 100% REUSE FuelStateEstimator.
// estimateCurrentLiter() (s415) kalau tersedia & ok:true. Bedanya dgn
// snapshot lama (FuelBarCorrection._currentEstimate(), yang cuma balikin
// veh.fuelState.currentFuelLiter APA ADANYA -- angka beku sejak BBM log/
// koreksi manual terakhir): estimator MENGHITUNG ULANG akumulasi km sejak
// titik acuan SETIAP kali render() dipanggil (tab switch/dashboard
// refresh) -- gauge jadi "hidup" (bar bisa turun seiring km jalan) TANPA
// nunggu BBM log baru maupun koreksi manual baru. 0 rumus baru di sini
// (estimator s415 sudah 100% ngerjain hitungannya), FuelCard cuma pilih
// sumber & tetap presenter murni. Fallback ke snapshot lama
// (FuelBarCorrection._currentEstimate()) kalau FuelStateEstimator belum
// dimuat ATAU belum ada titik acuan sama sekali (ok:false) -- gauge TIDAK
// PERNAH gagal render gara-gara sumber baru ini, pola guard sama persis
// field lain di file ini.
//
// SESI 5 (FUEL-AUTOSYNC-08, confidence decay dinamis): _lowConfidenceHint()
// sekarang baca skor lewat _currentConfidence() (BARU) -- 100% REUSE
// FuelStateEstimator.estimateCurrentLiter().decayedConfidenceScore, jadi
// rekomendasi "sinkronkan dengan speedometer" ikut muncul otomatis
// seiring km ditempuh (bukan cuma nunggu confidenceScore statis rendah
// dari sumber tulis). Fallback ke confidenceScore mentah tetap ada.
//
// SESI 421 (lanjutan "saran tambahan" rencana "Fuel Estimation
// Auto-Update", 2 item sisa dari s420): dua tambahan MURNI presenter, 0
// rumus baru, 0 field D baru:
//   1. _kmClampedHint() -- guard km non-monoton (s415) sebelumnya cuma
//      clamp diam-diam (kmClamped:true di estimator, TIDAK pernah
//      diberitahukan ke user). Sekarang FuelCard baca ulang flag itu &
//      tampilkan nudge pasif "cek odometer", pola identik
//      _lowConfidenceHint() (guard typeof, {ok:false} kalau estimator
//      belum dimuat/ok:false/kmClamped falsy).
//   2. _sourceBadgeHtml() sekarang tambah "Skor N/100" (100% REUSE
//      _currentConfidence(), SUDAH ADA sejak Sesi 5) di belakang label
//      sumber + umur estimasi -- transparansi angka, bukan cuma trigger
//      hint low-confidence tersembunyi.
//
// SESI 422 (item TERAKHIR tersisa dari "saran tambahan" rencana yang
// sama): _partialFillDriftHint() (BARU) -- 100% REUSE
// FuelStateEstimator.partialFillDriftRisk (BARU), pola identik
// _kmClampedHint() di atas.
const FuelCard = {

render() {
  const wrap = document.getElementById('fuelIntelWrap');
  const el = document.getElementById('fuelIntelBody');
  if (!wrap || !el) return;
  const vid = (typeof curVehicleId !== 'undefined') ? curVehicleId : null;
  if (typeof FuelIntelligenceEngine === 'undefined' || !vid) {
    wrap.style.display = 'none';
    return;
  }
  const insight = FuelIntelligenceEngine.vehicleInsight(vid);
  if (!insight.ok) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  el.innerHTML = this._body(insight);
},

_money(n) {
  return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
},

// LOW_CONFIDENCE_THRESHOLD — ambang tampilkan rekomendasi sinkronisasi
// pasif (requirement #6 TASK-145). confidenceScore SENDIRI 100% dibaca
// apa adanya dari veh.fuelState (ditulis FuelBarCorrection.save(),
// TASK-144) — konstanta ini murni ambang presenter (bukan rumus/skoring
// baru), sama prinsipnya dgn ambang warna overdue/due-soon di atas yang
// sudah ada.
LOW_CONFIDENCE_THRESHOLD: 50,

// _currentConfidence(vehicleId) — SESI 5 (FUEL-AUTOSYNC-08, confidence
// decay dinamis): 100% REUSE FuelStateEstimator.estimateCurrentLiter().
// decayedConfidenceScore (BARU, pola sama persis
// FuelPredictionEngine._confidence()/FuelCostAnalytics._confidenceScore())
// kalau tersedia & ok:true — jadi rekomendasi low-confidence di bawah
// ikut "hidup" seiring km ditempuh sejak titik acuan, TANPA nunggu BBM
// log/koreksi manual baru (selaras _liveEstimate() gauge s417). Fallback
// ke veh.fuelState.confidenceScore APA ADANYA (pola lama) kalau
// FuelStateEstimator belum dimuat ATAU estimator ok:false.
_currentConfidence(vehicleId) {
  if (typeof FuelStateEstimator !== 'undefined' && typeof FuelStateEstimator.estimateCurrentLiter === 'function') {
    const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
    if (est && est.ok && typeof est.decayedConfidenceScore === 'number') return est.decayedConfidenceScore;
  }
  const vehicles = (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
  const veh = vehicles.find((v) => v.id === vehicleId);
  const score = veh && veh.fuelState ? veh.fuelState.confidenceScore : null;
  return (typeof score === 'number') ? score : null;
},

// _lowConfidenceHint(vehicleId) — {ok:false} kalau belum ada fuelState
// tersimpan sama sekali (kendaraan belum pernah dikoreksi — tidak ada
// confidenceScore utk dibandingkan) ATAU skornya (SEKARANG hasil decay,
// lihat _currentConfidence() di atas) masih >= ambang.
_lowConfidenceHint(vehicleId) {
  const score = this._currentConfidence(vehicleId);
  if (typeof score !== 'number' || score >= this.LOW_CONFIDENCE_THRESHOLD) return { ok: false };
  return { ok: true };
},

// _kmClampedHint(vehicleId) — SESI 421: sisi PROAKTIF guard km
// non-monoton (versi dasar/clamp diam-diam sudah ada sejak s415,
// FuelStateEstimator.kmClamped). Kalau delta km sejak titik acuan
// terakhir NEGATIF (odometer kendaraan terbaca lebih kecil -- trip
// meter di-reset, ganti kendaraan, atau salah input manual), estimator
// SUDAH clamp ke 0 (matematis benar, liter tidak "nambah" gara-gara
// dianggap mundur) tapi sebelum sesi ini user tidak pernah diberi tahu
// kalau ini terjadi -- angka liter jadi diam-diam "macet" tanpa
// penjelasan. 100% REUSE FuelStateEstimator.estimateCurrentLiter()
// (0 rumus baru) -- {ok:false} kalau estimator belum dimuat, ok:false,
// atau kmClamped falsy (pola sama persis _lowConfidenceHint()/
// _currentConfidence()).
_kmClampedHint(vehicleId) {
  if (typeof FuelStateEstimator === 'undefined' || typeof FuelStateEstimator.estimateCurrentLiter !== 'function') {
    return { ok: false };
  }
  const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
  if (!est || !est.ok || !est.kmClamped) return { ok: false };
  return { ok: true };
},

// _partialFillDriftHint(vehicleId) — SESI 422: sisi UI dari guard
// akumulasi error fill-parsial berturut-turut (FuelStateEstimator.
// partialFillDriftRisk, BARU). BEDA penyebab dari _kmClampedHint() di
// atas (odometer non-monoton) -- ini soal terlalu banyak partial fill
// (liter input manual, bukan terukur) numpuk sejak titik acuan terakhir
// tanpa pernah di-reset lewat full-tank fill/koreksi manual baru. 100%
// REUSE FuelStateEstimator.estimateCurrentLiter() (0 rumus baru) --
// {ok:false} kalau estimator belum dimuat, ok:false, atau
// partialFillDriftRisk falsy (pola sama persis _kmClampedHint()/
// _lowConfidenceHint()).
_partialFillDriftHint(vehicleId) {
  if (typeof FuelStateEstimator === 'undefined' || typeof FuelStateEstimator.estimateCurrentLiter !== 'function') {
    return { ok: false };
  }
  const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
  if (!est || !est.ok || !est.partialFillDriftRisk) return { ok: false };
  return { ok: true };
},

// _estimationLimitedHint(vehicleId) — audit S444+ (temuan "fuel bar
// statis walau KM di-update"): SEBELUM ini, kalau estimator balikin
// estimationLimited:true (kmPerLiter kendaraan itu belum bisa dihitung
// -- butuh min. 2 log "Isi Full Tank" dgn km naik, lihat fuelEfficiency()
// vehicle-core.js), liter cuma jadi baseLiter+addedLiter APA ADANYA
// (konsumsi km TIDAK dikurangi) TANPA ada penjelasan apa pun di UI --
// user lihat angka "macet" tanpa tahu kenapa. Beda dari
// referenceKm-kosong (SEKARANG di-self-heal otomatis, lihat
// healFuelStateReferenceKm() di vehicle-core.js) -- ini kasus yang
// MEMANG butuh aksi user (isi lebih banyak log full-tank), jadi
// hint-nya proaktif kasih tahu caranya, bukan cuma diam. 100% REUSE
// FuelStateEstimator.estimateCurrentLiter() (0 rumus baru) -- {ok:false}
// kalau estimator belum dimuat, ok:false, atau estimationLimited falsy
// (pola sama persis 3 guard hint di atas).
_estimationLimitedHint(vehicleId) {
  if (typeof FuelStateEstimator === 'undefined' || typeof FuelStateEstimator.estimateCurrentLiter !== 'function') {
    return { ok: false };
  }
  const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
  if (!est || !est.ok || !est.estimationLimited) return { ok: false };
  return { ok: true, reason: (est.kmPerLiter === null) ? 'kmPerLiter' : 'referenceKm' };
},

// SOURCE_BADGE_LABEL — Sesi FUEL-AUTOSYNC (badge sumber estimasi, murni
// presenter). Peta estimatedSource -> label singkat. 100% REUSE nilai
// yang SUDAH ditulis field lain (FuelBarCorrection.ESTIMATED_SOURCE_MANUAL
// = 'manual-bar-correction', TASK-144; 'auto-bbm-log-full' dari
// recordBbmLog()/syncFuelStateFromFullTankBbm(), sesi s412) — 0 field baru
// ditulis ke D, 0 rumus baru, cuma menyusun ulang apa yang sudah tersimpan
// di veh.fuelState supaya user langsung tahu seberapa bisa dipercaya
// angkanya tanpa buka detail (permintaan eksplisit user, "Saran tambahan"
// rencana Fuel Estimation Auto-Update).
SOURCE_BADGE_LABEL: {
  'manual-bar-correction': '🔧 Manual',
  'auto-bbm-log-full': '⛽ Auto dari BBM log',
},

// _daysSince(iso) — selisih hari (integer, floor) antara sekarang & iso
// string. null kalau iso tidak valid/kosong (presenter diam, bukan
// menampilkan "NaN hari lalu"). Kalau selisih negatif (jam klien
// nyeleneh/correctedAt di masa depan), clamp ke 0 — bukan tampil minus.
_daysSince(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  const diffMs = Date.now() - t;
  return diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;
},

// _sourceBadgeHtml(vehicleId) — badge kecil "sumber estimasi" (Manual/
// Auto dari BBM log/fallback generik) + umur estimasi ("X hari lalu") +
// SESI 421: skor kepercayaan eksplisit ("Skor N/100", 100% REUSE
// _currentConfidence() SUDAH ADA sejak Sesi 5 -- decayedConfidenceScore
// kalau tersedia, fallback confidenceScore mentah, 0 rumus baru di sini),
// dipasang tepat di bawah gauge (_gaugeHtml()). Baca LANGSUNG dari
// veh.fuelState.estimatedSource/correctedAt (field yang SUDAH ada &
// ditulis modul lain) — 0 kalkulasi baru di sini utk bagian label/umur.
// '' (tidak render apa pun) kalau belum ada fuelState/estimatedSource/
// correctedAt sama sekali — TIDAK PERNAH menebak sumber yang sebenarnya
// kosong. Bagian skor sendiri OPSIONAL (dihilangkan diam-diam, bukan
// tampil "—") kalau _currentConfidence() balikin bukan angka.
_sourceBadgeHtml(vehicleId) {
  const vehicles = (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
  const veh = vehicles.find((v) => v.id === vehicleId);
  const fs = veh && veh.fuelState;
  if (!fs || !fs.estimatedSource) return '';
  const days = this._daysSince(fs.correctedAt);
  if (days === null) return '';
  const label = this.SOURCE_BADGE_LABEL[fs.estimatedSource] || '📉 Estimasi';
  const ageText = days === 0 ? 'hari ini' : (days === 1 ? '1 hari lalu' : `${days} hari lalu`);
  const score = this._currentConfidence(vehicleId);
  const scorePart = (typeof score === 'number') ? ` · Skor ${Math.round(score)}/100` : '';
  return `<div class="u-fs11 u-t2" style="margin:4px 0 0">${escapeHtml(label)} · ${escapeHtml(ageText)}${escapeHtml(scorePart)}</div>`;
},

// _briefingHtml(vehicleId) — Sesi 156d: section "Fuel Briefing" (dulu
// _fuelBriefHtml() di vehicle-daily-brief.js, TASK-151), DIPINDAH ke sini
// APA ADANYA (isi/urutan baris/teks placeholder tidak diubah). 100% REUSE
// FuelInsightEngine.getSummary(vehicleId) — vehicleId yang dipakai SAMA
// dgn kendaraan yang sedang ditampilkan card ini (insight.vehicleId dari
// FuelIntelligenceEngine.vehicleInsight() di render()), BUKAN hasil
// FuelFleetSelector (yang dulu dipakai VehicleDailyBrief utk memilih 1
// kendaraan dari SELURUH armada) — card ini sudah scoped ke 1 kendaraan
// aktif, jadi 0 logic pemilihan kendaraan dipakai/ditulis di sini. Balikin
// '' (tidak menambah apa pun) kalau FuelInsightEngine belum dimuat atau
// getSummary() gagal — TIDAK PERNAH menggagalkan render() card pemanggil.
_briefingHtml(vehicleId) {
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getSummary !== 'function') return '';

  let s;
  try {
    s = FuelInsightEngine.getSummary(vehicleId);
  } catch (e) {
    return ''; // presenter tidak boleh throw ke render() pemanggil
  }
  if (!s || !s.ok) return '';

  const fuel = s.fuel || {};
  const insight = s.highestInsight || {};

  const rows = [];
  rows.push(`Fuel Health ${s.healthScore != null ? s.healthScore + '/100' : '—'}`);
  rows.push(`Sisa BBM ${fuel.remainingLiter != null ? fuel.remainingLiter.toFixed(1) + ' L' : '—'}${fuel.fuelPercent != null ? ` (${Math.round(fuel.fuelPercent)}%)` : ''}`);
  rows.push(`Estimasi jarak tersisa ${s.remainingDistance != null ? Math.round(s.remainingDistance).toLocaleString('id-ID') + ' km' : '—'}`);
  rows.push(`Biaya BBM bulanan ${s.monthlyCost != null ? this._money(s.monthlyCost) : '—'}`);
  rows.push(`Risiko perawatan ${s.maintenanceRisk || '—'}`);

  let html = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">📋 Fuel Briefing</div>`
    + `<div class="u-fs12 u-lh15 u-t2">${escapeHtml(rows.join(' · '))}.</div>`;

  if (insight.title || insight.description) {
    const insightText = [insight.title, insight.description].filter(Boolean).join(': ');
    html += `<div class="u-fs12 u-lh15 u-t2 u-mt4">📌 ${escapeHtml(insightText)}</div>`;
  }
  if (insight.recommendation) {
    html += `<div class="u-fs12 u-lh15 u-t2 u-mt4">💡 ${escapeHtml(insight.recommendation)}</div>`;
  }

  return html;
},

// _liveEstimate(vehicleId) — lihat catatan header file (SESI
// 416-lanjutan, "Sesi 3"). Balikin {liter, source, estimationLimited?}
// atau null (0 sumber estimasi apa pun tersedia). estimator diutamakan
// (auto-refresh berbasis km), fallback ke snapshot beku lama.
_liveEstimate(vehicleId) {
  if (typeof FuelStateEstimator !== 'undefined' && typeof FuelStateEstimator.estimateCurrentLiter === 'function') {
    const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
    if (est && est.ok && typeof est.liter === 'number') {
      return { liter: est.liter, source: 'estimator', estimationLimited: !!est.estimationLimited };
    }
  }
  if (typeof FuelBarCorrection !== 'undefined' && typeof FuelBarCorrection._currentEstimate === 'function') {
    return FuelBarCorrection._currentEstimate(vehicleId);
  }
  return null;
},

// _gaugeHtml(vehicleId) — mini gauge visual (blok terisi/kosong, warna
// beda utk area cadangan), 100% REUSE _liveEstimate() (di atas) utk ambil
// estimasi liter saat ini + FuelGaugeEngine.calculateFuelBar()/
// FuelTankProfile.get() (SUDAH ADA) utk konversi ke posisi bar & posisi
// cadangan — 0 rumus konversi baru di sini, murni presenter (pola sama
// _segmentHtml() di fuel-intelligence-ui.js, cuma dipakai read-only,
// tanpa tombol). '' (tidak render apa pun) kalau profil tangki belum
// diatur atau belum ada estimasi sama sekali — TIDAK PERNAH menampilkan
// gauge kosong yang menyesatkan.
_gaugeHtml(vehicleId) {
  if (typeof FuelTankProfile === 'undefined' || typeof FuelGaugeEngine === 'undefined') return '';
  const profile = FuelTankProfile.get(vehicleId);
  if (!profile || !profile.tankCapacityLiter) return '';
  const est = this._liveEstimate(vehicleId);
  if (!est) return '';
  const barRes = FuelGaugeEngine.calculateFuelBar(vehicleId, est.liter);
  if (!barRes.ok) return '';
  const currentBar = Math.round(barRes.bar);
  const reserveRes = FuelGaugeEngine.calculateFuelBar(vehicleId, profile.reserveLiter || 0);
  const reserveBar = reserveRes.ok ? Math.round(reserveRes.bar) : 0;
  let segs = '';
  for (let bar = 0; bar <= profile.fuelBarCount; bar++) {
    const filled = bar <= currentBar;
    const isReserve = bar <= reserveBar;
    let cls = 'fuelcard-gauge-seg';
    if (filled) cls += isReserve ? ' fbc-seg-reserve' : ' fbc-seg-fill';
    segs += `<div class="${cls}"></div>`;
  }
  // BUKAN data-action lagi (rekomendasi #1 audit S444/S445, "diagnostic
  // view long-press gauge"): tap singkat & tap-lama harus buka 2 hal
  // BEDA (koreksi speedometer vs diagnostic mentah) dari elemen yang
  // SAMA, jadi ditangani manual lewat pointerdown/up/leave (lihat
  // _fuelGaugePointerDown/Up/Cancel di bawah) -- dispatcher data-action
  // global cuma bisa 1 aksi per klik, tidak cukup di sini.
  return `<div class="fuelcard-gauge" onpointerdown="FuelCard._gaugePointerDown(event,'${vehicleId}')" onpointerup="FuelCard._gaugePointerUp(event,'${vehicleId}')" onpointerleave="FuelCard._gaugePointerCancel()" onpointercancel="FuelCard._gaugePointerCancel()" role="button" tabindex="0" aria-label="Tap: koreksi estimasi BBM dengan speedometer. Tap lama: lihat diagnostic mentah." style="cursor:pointer">${segs}</div>`;
},

// _gaugePointerDown/Up/Cancel — long-press detector utk gauge di atas
// (rekomendasi #1 audit S444/S445): tap singkat = FuelBarCorrection.open()
// (perilaku LAMA, tidak berubah), tap-tahan >=550ms = showDiagnostic()
// (BARU). _longPressed dipakai supaya pointerup SETELAH long-press
// terpicu tidak ikut membuka FuelBarCorrection juga (1 gesture = 1 aksi).
_gaugeTimer: null,
_gaugeLongPressed: false,
_gaugePointerDown(e, vehicleId) {
  clearTimeout(this._gaugeTimer);
  this._gaugeLongPressed = false;
  this._gaugeTimer = setTimeout(() => {
    this._gaugeLongPressed = true;
    this.showDiagnostic(vehicleId);
  }, 550);
},
_gaugePointerUp(e, vehicleId) {
  clearTimeout(this._gaugeTimer);
  if (this._gaugeLongPressed) { this._gaugeLongPressed = false; return; }
  if (typeof FuelBarCorrection !== 'undefined') FuelBarCorrection.open(vehicleId);
},
_gaugePointerCancel() {
  clearTimeout(this._gaugeTimer);
  this._gaugeLongPressed = false;
},

// showDiagnostic(vehicleId) — rekomendasi #1 audit S444/S445 ("Diagnostic
// view untuk dev"): expose field MENTAH dari FuelStateEstimator.
// estimateCurrentLiter() (referenceKm/deltaKm/estimationLimited dst, lihat
// catatan header fuel-state-estimator.js) apa adanya lewat showAlertModal()
// (infoModalMsg sudah white-space:pre-line, jadi newline di sini tampil
// sebagai baris terpisah) -- 100% REUSE engine yang sudah ada, 0 kalkulasi
// baru, murni presenter read-only. Tujuan: audit kasus "fuel bar
// statis"-serupa ke depan tidak perlu lagi baca kode/console.log manual.
showDiagnostic(vehicleId) {
  if (typeof showAlertModal !== 'function') return;
  if (typeof FuelStateEstimator === 'undefined' || typeof FuelStateEstimator.estimateCurrentLiter !== 'function') {
    showAlertModal('FuelStateEstimator belum dimuat.', { icon: '🔍', title: 'Diagnostic Fuel Estimator' });
    return;
  }
  const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
  if (!est.ok) {
    showAlertModal(est.reason || 'Data BBM belum ada.', { icon: '🔍', title: 'Diagnostic Fuel Estimator' });
    return;
  }
  const fmt = (n) => (n === null || n === undefined || !isFinite(n)) ? '–' : (Math.round(n * 100) / 100);
  const lines = [
    'referenceKm: ' + (est.referenceKm === null ? '– (belum ada)' : fmt(est.referenceKm)),
    'currentKm: ' + fmt(est.currentKm),
    'deltaKm: ' + (est.deltaKm === null ? '– (estimationLimited)' : fmt(est.deltaKm) + (est.kmClamped ? ' (di-clamp dari negatif)' : '')),
    'kmPerLiter: ' + (est.kmPerLiter === null ? '– (data full-tank kurang)' : fmt(est.kmPerLiter)),
    'baseLiter (titik acuan): ' + fmt(est.baseLiter),
    'addedLiter (partial fill): ' + fmt(est.addedLiter) + ' (' + est.partialFillsCounted + 'x)',
    'consumedLiter: ' + fmt(est.consumedLiter),
    'liter (hasil akhir): ' + fmt(est.liter),
    'estimationLimited: ' + (est.estimationLimited ? 'YA' : 'tidak'),
    'partialFillDriftRisk: ' + (est.partialFillDriftRisk ? 'YA' : 'tidak'),
    'confidenceScore: ' + (est.confidenceScore === null ? '–' : est.confidenceScore) + ' → decayed: ' + (est.decayedConfidenceScore === null ? '–' : est.decayedConfidenceScore)
  ];
  showAlertModal(lines.join('\n'), { icon: '🔍', title: '🔍 Diagnostic Fuel Estimator', okText: 'Tutup' });
},

// _body(insight) — insight dari FuelIntelligenceEngine.vehicleInsight()
// apa adanya. Status text/warna diambil dari reminders[] (VehicleReminder.
// fuelReminders(), 0 ambang baru) — overdue diprioritaskan, lalu due-soon,
// lalu efisiensi saat ini kalau tidak ada pengingat aktif.
//
// TASK-145: baris CTA sekarang 2 tombol berdampingan (.btn-row, class
// SUDAH ADA & dipakai modal lain — 0 CSS baru): "Lihat Detail" (SUDAH
// ADA, TASK-141) + "⚙️ Koreksi" (baru, panggil FuelBarCorrection.open()
// TASK-144). Kalau confidenceScore rendah (_lowConfidenceHint()), tampilkan
// 1 baris rekomendasi pasif (bukan dialog/blocking) sebelum baris tombol.
//
// Sesi 156d: section "Fuel Briefing" (_briefingHtml(), lihat di atas)
// disisipkan SETELAH baris rekomendasi low-confidence & SEBELUM baris CTA
// — satu card gabungan, tombol CTA tetap di paling bawah pola sama persis
// sebelumnya.
//
// SESI 421: baris nudge km-clamped (_kmClampedHint(), BARU) disisipkan
// SEBELUM baris low-confidence — beda penyebab (odometer non-monoton vs
// skor kepercayaan meluruh krn jarak), jadi pesan beda & bisa tampil
// BERSAMAAN kalau keduanya kebetulan true (0 dibuat saling eksklusif,
// masing-masing presenter independen baca kondisinya sendiri).
_body(insight) {
  const overdue = insight.reminders.find((r) => r.severity === 'overdue');
  const dueSoon = insight.reminders.find((r) => r.severity === 'due-soon');
  const alertItem = overdue || dueSoon;
  const eff = (insight.current && insight.current.ok) ? insight.current : null;
  const effText = eff
    ? `${eff.kmPerLiter.toFixed(1)} km/L · ${this._money(eff.rpPerKm)}/km`
    : 'Data efisiensi belum cukup';
  const statusText = alertItem ? alertItem.message : (eff ? '✅ Efisiensi BBM terpantau normal' : 'Catat isi BBM (Full Tank) biar dapat insight efisiensi');
  const statusCls = overdue ? 'red' : (dueSoon ? 'orange' : '');
  const kmClamped = this._kmClampedHint(insight.vehicleId);
  const kmClampedHtml = kmClamped.ok
    ? `<div class="u-fs12 orange" style="margin:0 0 10px;line-height:1.5">⚠️ Estimasi mulai kurang akurat, cek odometer.</div>`
    : '';
  const partialFillDrift = this._partialFillDriftHint(insight.vehicleId);
  const partialFillDriftHtml = partialFillDrift.ok
    ? `<div class="u-fs12 orange" style="margin:0 0 10px;line-height:1.5">⚠️ Sudah beberapa kali isi BBM parsial berturut-turut. Disarankan Full Tank atau koreksi manual biar akurat lagi.</div>`
    : '';
  const lowConfidence = this._lowConfidenceHint(insight.vehicleId);
  const lowConfidenceHtml = lowConfidence.ok
    ? `<div class="u-fs12 orange" style="margin:0 0 10px;line-height:1.5">⚠️ Estimasi mulai kurang akurat. Disarankan sinkronkan dengan speedometer.</div>`
    : '';
  // audit S444+: _estimationLimitedHint() — sisi UI dari estimationLimited
  // (lihat catatan fungsinya). Hanya tampil kalau penyebabnya kmPerLiter
  // (data full-tank kendaraan ini belum cukup) — kasus referenceKm SUDAH
  // di-self-heal otomatis (healFuelStateReferenceKm(), dipanggil dari
  // renderCnTab() SEBELUM card ini render), jadi praktis tidak pernah
  // ketemu reason:'referenceKm' lagi di sini kecuali di render pertama
  // yang sama persis (langsung ke-heal juga). Independen dari 3 hint di
  // atas — bisa tampil bersamaan.
  const estLimited = this._estimationLimitedHint(insight.vehicleId);
  const estLimitedHtml = (estLimited.ok && estLimited.reason === 'kmPerLiter')
    ? `<div class="u-fs12 orange" style="margin:0 0 10px;line-height:1.5">⚠️ Estimasi belum mengurangi konsumsi km (butuh min. 2x catat "Isi Full Tank" dengan km naik). Liter di atas belum berkurang otomatis sampai data ini cukup.</div>`
    : '';
  return `
    <div class="dashhub-cat-head">
      <div class="dashhub-cat-icon">⛽</div>
      <div>
        <div class="dashhub-cat-label">Fuel Intelligence</div>
        <div class="dashhub-cat-desc">${escapeHtml(insight.emoji ? insight.emoji + ' ' : '')}${escapeHtml(insight.name)} — ${escapeHtml(effText)}</div>
      </div>
    </div>
    <div class="u-fs12${statusCls ? ' ' + statusCls : ''}" style="margin:6px 0 10px;line-height:1.5">${escapeHtml(statusText)}</div>
    ${this._gaugeHtml(insight.vehicleId)}
    ${this._sourceBadgeHtml(insight.vehicleId)}
    ${kmClampedHtml}
    ${partialFillDriftHtml}
    ${lowConfidenceHtml}
    ${estLimitedHtml}
    ${this._briefingHtml(insight.vehicleId)}
    <div class="btn-row3" style="margin:10px 0 0">
      <button class="btn btn-ghost btn-sm" data-action="FuelModal.open" data-args="${escapeHtml(JSON.stringify([insight.vehicleId]))}">📊 Lihat Detail</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelBarCorrection.open" data-args="${escapeHtml(JSON.stringify([insight.vehicleId]))}" aria-label="Koreksi estimasi BBM dengan speedometer">⚙️ Koreksi</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelTankProfileUI.open" data-args="${escapeHtml(JSON.stringify([insight.vehicleId]))}" aria-label="Atur profil tangki kendaraan">⛽ Atur Tangki</button>
    </div>
  `;
},

};
