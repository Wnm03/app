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

// _lowConfidenceHint(vehicleId) — {ok:false} kalau belum ada fuelState
// tersimpan sama sekali (kendaraan belum pernah dikoreksi — tidak ada
// confidenceScore utk dibandingkan) ATAU skornya masih >= ambang. Baca
// LANGSUNG dari D.vehicles (field opsional TASK-144, guard typeof D),
// 0 kalkulasi ulang skor di sini.
_lowConfidenceHint(vehicleId) {
  const vehicles = (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
  const veh = vehicles.find((v) => v.id === vehicleId);
  const score = veh && veh.fuelState ? veh.fuelState.confidenceScore : null;
  if (typeof score !== 'number' || score >= this.LOW_CONFIDENCE_THRESHOLD) return { ok: false };
  return { ok: true };
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

// _gaugeHtml(vehicleId) — mini gauge visual (blok terisi/kosong, warna
// beda utk area cadangan), 100% REUSE FuelBarCorrection._currentEstimate()
// (TASK-144, SUDAH ADA) utk ambil estimasi liter saat ini +
// FuelGaugeEngine.calculateFuelBar()/FuelTankProfile.get() (SUDAH ADA) utk
// konversi ke posisi bar & posisi cadangan — 0 rumus konversi baru di
// sini, murni presenter (pola sama _segmentHtml() di fuel-intelligence-
// ui.js, cuma dipakai read-only, tanpa tombol). '' (tidak render apa pun)
// kalau profil tangki belum diatur atau belum ada estimasi sama sekali —
// TIDAK PERNAH menampilkan gauge kosong yang menyesatkan.
_gaugeHtml(vehicleId) {
  if (typeof FuelTankProfile === 'undefined' || typeof FuelGaugeEngine === 'undefined' || typeof FuelBarCorrection === 'undefined') return '';
  const profile = FuelTankProfile.get(vehicleId);
  if (!profile || !profile.tankCapacityLiter) return '';
  const est = FuelBarCorrection._currentEstimate(vehicleId);
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
  return `<div class="fuelcard-gauge" data-action="FuelBarCorrection.open" data-args="${escapeHtml(JSON.stringify([vehicleId]))}" role="button" tabindex="0" aria-label="Koreksi estimasi BBM dengan speedometer" style="cursor:pointer">${segs}</div>`;
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
  const lowConfidence = this._lowConfidenceHint(insight.vehicleId);
  const lowConfidenceHtml = lowConfidence.ok
    ? `<div class="u-fs12 orange" style="margin:0 0 10px;line-height:1.5">⚠️ Estimasi mulai kurang akurat. Disarankan sinkronkan dengan speedometer.</div>`
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
    ${lowConfidenceHtml}
    ${this._briefingHtml(insight.vehicleId)}
    <div class="btn-row3" style="margin:10px 0 0">
      <button class="btn btn-ghost btn-sm" data-action="FuelModal.open" data-args="${escapeHtml(JSON.stringify([insight.vehicleId]))}">📊 Lihat Detail</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelBarCorrection.open" data-args="${escapeHtml(JSON.stringify([insight.vehicleId]))}" aria-label="Koreksi estimasi BBM dengan speedometer">⚙️ Koreksi</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelTankProfileUI.open" data-args="${escapeHtml(JSON.stringify([insight.vehicleId]))}" aria-label="Atur profil tangki kendaraan">⛽ Atur Tangki</button>
    </div>
  `;
},

};
