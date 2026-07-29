// fuel-intelligence-ui.js — Fuel Bar Correction (TASK-144).
//
// PRINSIP: UI/orkestrasi TIPIS saja, 100% REUSE FuelGaugeEngine (TASK-143,
// konversi bar<->liter<->persen) + FuelTankProfile (TASK-142, kapasitas
// tangki & jumlah bar) — TIDAK ada rumus konversi baru di sini. Modal
// markup (#fuelBarCorrectionModal) sudah ada di modals.js (dibuat sesi
// sebelumnya) — modul ini murni mengisi & mewire-nya. Satu file tunggal
// (bukan dipecah fuel-gauge-ui.js/fuel-bar-correction.js terpisah) sesuai
// TASK-REF-001 — konsolidasi modul UI/helper kecil yang selalu jalan
// bersama, supaya tidak menambah fragmentasi file baru sejak awal.
//
// Penyimpanan: field baru & OPSIONAL di D.vehicles[i].fuelState (ADDITIVE,
// pola sama persis D.vehicles[i].fuelTankProfile di fuel-tank-profile.js —
// kendaraan lama tanpa field ini tetap jalan normal). TIDAK ada koleksi
// baru di D, TIDAK mengubah riwayat D.bbmLogs (koreksi ini cuma
// memperbaiki ESTIMASI saat ini, bukan transaksi/log BBM historis).
//
// TASK-145 (Fuel Intelligence Integration): trigger UI "⚙️ Koreksi" utk
// open() akhirnya dipasang di fuel-card.js sesi ini (di luar file ini,
// 0 baris di sini berubah utk itu). Satu-satunya perubahan di file ini
// adalah teks toast sukses di save() disamakan dgn spesifikasi task —
// murni copy, 0 perubahan urutan/logic refresh FuelCard/FuelModal yang
// sudah ada dari TASK-144.
const FuelBarCorrection = {

curVehicleId: null,
selectedBar: null,

// ESTIMATED_SOURCE — nilai yang dipakai field estimatedSource. Konstanta
// dipisah supaya konsisten & gampang direferensikan test/konsumen lain
// di masa depan (mis. kalau nanti ada sumber estimasi otomatis lain,
// tinggal tambah konstanta baru di sini, tidak ada string literal
// tersebar).
ESTIMATED_SOURCE_MANUAL: 'manual-bar-correction',

_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// _currentEstimate(vehicleId) — estimasi BBM saat ini SEBELUM koreksi.
// Prioritas: (1) veh.fuelState tersimpan (koreksi sebelumnya), (2) log
// BBM terbaru KALAU full tank (asumsi tangki penuh = tankCapacityLiter,
// 100% REUSE FuelTankProfile, 0 rumus baru), (3) null (belum ada dasar
// estimasi apa pun — UI tampilkan "-", bukan menebak angka).
_currentEstimate(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return null;
  if (veh.fuelState && typeof veh.fuelState.currentFuelLiter === 'number') {
    return { liter: veh.fuelState.currentFuelLiter, source: 'stored' };
  }
  if (typeof FuelStorage !== 'undefined' && typeof FuelTankProfile !== 'undefined') {
    const latest = FuelStorage.latest(vehicleId);
    if (latest && latest.fullTank) {
      const profile = FuelTankProfile.get(vehicleId);
      if (profile && profile.tankCapacityLiter) {
        return { liter: profile.tankCapacityLiter, source: 'bbm-log-full' };
      }
    }
  }
  return null;
},

// open(vehicleId?) — vehicleId opsional, default curVehicleId (kendaraan
// aktif, pola sama persis FuelModal.open()). {toast, tidak jadi buka
// modal} kalau kendaraan tidak ditemukan atau profil tangki belum diatur
// (butuh tankCapacityLiter & fuelBarCount buat render bar picker & hitung
// preview — tanpa itu modal tidak berguna).
open(vehicleId) {
  const vid = vehicleId || (typeof curVehicleId !== 'undefined' ? curVehicleId : null);
  const veh = this._vehicle(vid);
  if (!veh) {
    if (typeof toast === 'function') toast('⚠️ Kendaraan tidak ditemukan');
    return;
  }
  if (typeof FuelGaugeEngine === 'undefined' || typeof FuelTankProfile === 'undefined') {
    if (typeof toast === 'function') toast('⚠️ Modul Fuel Gauge belum dimuat');
    return;
  }
  const profile = FuelTankProfile.get(vid);
  if (!profile || !profile.tankCapacityLiter) {
    // Dulu cuma toast lalu berhenti (belum ada UI utk atur profil tangki).
    // Sekarang langsung buka modal "Atur Tangki" (FuelTankProfileUI, TASK-142
    // UI companion) — setelah Simpan, modal Koreksi ini otomatis lanjut
    // terbuka lagi (lihat FuelTankProfileUI.save()), jadi user tidak perlu
    // tap "Koreksi" dua kali.
    if (typeof FuelTankProfileUI !== 'undefined') {
      if (typeof toast === 'function') toast('⚠️ Atur dulu profil tangki kendaraan ini (kapasitas liter)');
      FuelTankProfileUI.open(vid, { fromCorrection: true });
    } else if (typeof toast === 'function') {
      toast('⚠️ Atur dulu profil tangki kendaraan ini (kapasitas liter)');
    }
    return;
  }

  this.curVehicleId = vid;
  this.selectedBar = null;

  const nameEl = document.getElementById('fbcVehName');
  if (nameEl) nameEl.textContent = (veh.emoji ? veh.emoji + ' ' : '') + veh.name;

  this._renderCurrentEstimate(vid, profile);
  this._renderBarPicker(vid, profile);

  const previewBox = document.getElementById('fbcPreviewBox');
  if (previewBox) previewBox.style.display = 'none';
  const saveBtn = document.getElementById('fbcSaveBtn');
  if (saveBtn) saveBtn.disabled = true;

  if (typeof openModal === 'function') openModal('fuelBarCorrectionModal');
},

// _renderCurrentEstimate(vehicleId, profile) — isi kotak "Estimasi
// Aplikasi" (bar/liter/persen) dari _currentEstimate(). "-" kalau belum
// ada dasar estimasi apa pun (pola sama placeholder di markup modals.js).
_renderCurrentEstimate(vehicleId, profile) {
  const barLabel = document.getElementById('fbcCurrentBarLabel');
  const literLabel = document.getElementById('fbcCurrentLiterLabel');
  const percentLabel = document.getElementById('fbcCurrentPercentLabel');
  const est = this._currentEstimate(vehicleId);
  if (!est) {
    if (barLabel) barLabel.textContent = `- / ${profile.fuelBarCount} Bar`;
    if (literLabel) literLabel.textContent = '- Liter';
    if (percentLabel) percentLabel.textContent = '-%';
    return;
  }
  const barRes = FuelGaugeEngine.calculateFuelBar(vehicleId, est.liter);
  const percentRes = FuelGaugeEngine.calculateFuelPercent(vehicleId, est.liter);
  if (barLabel) barLabel.textContent = `${barRes.ok ? Math.round(barRes.bar) : '-'} / ${profile.fuelBarCount} Bar`;
  if (literLabel) literLabel.textContent = `${est.liter} Liter`;
  if (percentLabel) percentLabel.textContent = `${percentRes.ok ? percentRes.percent : '-'}%`;
},

// _renderBarPicker(vehicleId, profile) — render dinamis 1 SEGMEN visual
// per posisi bar (0..fuelBarCount, sesuai profil tangki kendaraan ini —
// BUKAN hardcode 8 bar). Ditulis urutan menaik (0 dulu) supaya secara
// visual (wrapper pakai flex-direction:column-reverse di markup) bar
// TERTINGGI (tangki penuh) muncul PALING ATAS, sama seperti indikator BBM
// asli di speedometer.
//
// Gauge visual (blok terisi/kosong, warna beda utk area cadangan): 100%
// REUSE FuelGaugeEngine.calculateFuelBar() (SUDAH ADA, TASK-143) utk
// konversi reserveLiter profil tangki (FuelTankProfile, SUDAH ADA) jadi
// posisi bar cadangan (this._reserveBar) — 0 rumus konversi baru, murni
// dipakai utk menentukan warna segmen. Fill kumulatif dari bar 0 s/d bar
// yang aktif (currentBar saat render awal, lalu selectedBar tiap tap di
// selectBar()), meniru tampilan indikator BBM fisik.
_renderBarPicker(vehicleId, profile) {
  const wrap = document.getElementById('fbcBarPicker');
  if (!wrap) return;
  const est = this._currentEstimate(vehicleId);
  const currentBar = est ? Math.round(FuelGaugeEngine.calculateFuelBar(vehicleId, est.liter).bar) : null;
  const reserveRes = FuelGaugeEngine.calculateFuelBar(vehicleId, profile.reserveLiter || 0);
  this._reserveBar = reserveRes.ok ? Math.round(reserveRes.bar) : 0;
  let html = '';
  for (let bar = 0; bar <= profile.fuelBarCount; bar++) {
    html += this._segmentHtml(bar, currentBar);
  }
  wrap.innerHTML = html;
},

// _segmentHtml(bar, selectedBar) — markup 1 segmen gauge visual. Murni
// PRESENTER: filled/isReserve dihitung dari posisi bar vs selectedBar &
// this._reserveBar (data yang SUDAH dihitung FuelGaugeEngine di
// _renderBarPicker() — 0 rumus baru di sini).
_segmentHtml(bar, selectedBar) {
  const filled = selectedBar !== null && selectedBar !== undefined && bar <= selectedBar;
  const isReserve = bar <= this._reserveBar;
  let cls = 'fbc-seg';
  if (filled) cls += isReserve ? ' fbc-seg-reserve' : ' fbc-seg-fill';
  else cls += ' fbc-seg-empty';
  if (bar === selectedBar) cls += ' fbc-seg-active';
  return `<button type="button" class="${cls}" data-action="FuelBarCorrection.selectBar" data-args="[${bar}]" data-bar="${bar}" aria-label="${bar} Bar" aria-pressed="${bar === selectedBar ? 'true' : 'false'}"><span class="fbc-seg-label">${bar}</span></button>`;
},

// selectBar(bar) — dipanggil tiap tap segmen bar picker. Live preview:
// hitung liter dari bar terpilih (100% REUSE FuelGaugeEngine.
// calculateFuelLiter(), 0 rumus baru), tampilkan Sebelum/Sesudah/Selisih,
// aktifkan tombol Simpan. Update ulang warna SEMUA segmen (fill
// kumulatif) lewat _segmentHtml() yang sama dipakai saat render awal —
// 0 logic warna duplikat.
selectBar(bar) {
  if (!this.curVehicleId || typeof FuelGaugeEngine === 'undefined') return;
  this.selectedBar = bar;

  const wrap = document.getElementById('fbcBarPicker');
  if (wrap) {
    // Snapshot ke array biasa dulu (Array.prototype.slice.call) — wrap.children
    // itu live HTMLCollection, outerHTML replace di tengah iterasi atas
    // collection yang sama bisa bikin index geser/kelewat.
    Array.prototype.slice.call(wrap.children).forEach((btn) => {
      const idx = parseInt(btn.dataset.bar, 10);
      btn.outerHTML = this._segmentHtml(idx, bar);
    });
  }

  const literRes = FuelGaugeEngine.calculateFuelLiter(this.curVehicleId, bar);
  if (!literRes.ok) return;
  const est = this._currentEstimate(this.curVehicleId);
  const beforeLiter = est ? est.liter : null;
  const afterLiter = literRes.liter;
  const diff = beforeLiter !== null ? Math.round((afterLiter - beforeLiter) * 100) / 100 : null;

  const beforeEl = document.getElementById('fbcBeforeLiter');
  const afterEl = document.getElementById('fbcAfterLiter');
  const diffEl = document.getElementById('fbcDiffLiter');
  if (beforeEl) beforeEl.textContent = beforeLiter !== null ? `${beforeLiter} L` : 'Belum ada data';
  if (afterEl) afterEl.textContent = `${afterLiter} L`;
  if (diffEl) diffEl.textContent = diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff} L`;

  const previewBox = document.getElementById('fbcPreviewBox');
  if (previewBox) previewBox.style.display = '';
  const saveBtn = document.getElementById('fbcSaveBtn');
  if (saveBtn) saveBtn.disabled = false;
},

// save() — target data-action tombol Simpan. Tulis currentFuelBar/
// currentFuelLiter/correctedAt/estimatedSource/confidenceScore ke
// D.vehicles[i].fuelState (partial object, additive, TIDAK menyentuh
// D.bbmLogs/riwayat), panggil save() global (SUDAH ADA, pola sama persis
// FuelTankProfile.save()), lalu refresh Fuel Intelligence Card + Fuel
// Modal (kalau sedang terbuka utk kendaraan yang sama).
save() {
  if (!this.curVehicleId || this.selectedBar === null || this.selectedBar === undefined) return;
  const veh = this._vehicle(this.curVehicleId);
  if (!veh || typeof FuelGaugeEngine === 'undefined') return;

  const literRes = FuelGaugeEngine.calculateFuelLiter(this.curVehicleId, this.selectedBar);
  if (!literRes.ok) {
    if (typeof toast === 'function') toast('⚠️ ' + literRes.reason);
    return;
  }

  // confidenceScore: 100 — pembacaan manual langsung dari speedometer
  // fisik adalah ground truth (bukan estimasi tidak langsung dari log
  // BBM/rata-rata efisiensi), jadi confidence maksimum.
  veh.fuelState = {
    currentFuelBar: this.selectedBar,
    currentFuelLiter: literRes.liter,
    correctedAt: new Date().toISOString(),
    estimatedSource: this.ESTIMATED_SOURCE_MANUAL,
    confidenceScore: 100,
  };
  if (typeof save === 'function') save();

  const vid = this.curVehicleId;
  if (typeof closeModal === 'function') closeModal('fuelBarCorrectionModal');
  // TASK-145: teks toast disamakan dgn spesifikasi task (sebelumnya
  // "Estimasi BBM disinkronkan dengan speedometer" — beda kata-kata saja,
  // 0 perubahan perilaku/logic, reuse toast() global apa adanya).
  if (typeof toast === 'function') toast('✅ Kalibrasi bensin berhasil diperbarui');

  // Refresh Fuel Intelligence Card — 100% REUSE FuelCard.render() (SUDAH
  // ADA, TASK-141), 0 logic render baru di sini.
  if (typeof FuelCard !== 'undefined') FuelCard.render();
  // Refresh Fuel Modal HANYA kalau sedang terbuka utk kendaraan yang sama
  // (FuelModal.curVehicleId, SUDAH ADA) — reuse FuelModal.open() apa
  // adanya (sudah re-render FuelAnalytics/FuelHistory di dalamnya).
  if (typeof FuelModal !== 'undefined' && FuelModal.curVehicleId === vid) {
    FuelModal.open(vid);
  }
  // TASK-150: Refresh Fuel Dashboard — 100% REUSE FuelDashboard.render()
  // (SUDAH ADA), pola sama persis refresh FuelCard/FuelModal di atas. 0
  // logic render baru di sini.
  if (typeof FuelDashboard !== 'undefined') FuelDashboard.render(vid);
  // TASK-156: Refresh Fuel Trend Dashboard — 100% REUSE
  // FuelTrendDashboard.render() (SUDAH ADA), pola sama persis refresh
  // FuelCard/FuelModal/FuelDashboard di atas. 0 logic render baru di sini.
  if (typeof FuelTrendDashboard !== 'undefined') FuelTrendDashboard.render(vid);

  this.curVehicleId = null;
  this.selectedBar = null;
},

};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['FuelBarCorrection']['open']. `const FuelBarCorrection = {...}`
// di atas HANYA membuat binding lexical-scope (bukan properti window),
// pola fix sama persis window.DashboardHub di dashboard-hub-search.js
// (bug yang sama pernah terjadi & diperbaiki di sana). Tanpa baris ini,
// tombol "⚙️ Koreksi" di FuelCard/FuelDashboard/FuelTrendDashboard tidak
// akan pernah berfungsi meski test lolos, karena test memanggil
// FuelBarCorrection.open()/selectBar() langsung (referensi lexical, bukan
// lewat window), tidak lewat jalur klik data-action yang sesungguhnya.
// (Tombol bar picker di dalam modal ini sendiri pakai data-onclick, bukan
// data-action, jadi TIDAK terpengaruh bug ini — new Function() di
// handler data-onclick membaca lewat lexical scope global, bukan lewat
// window[...] — tapi tombol "⚙️ Koreksi" yang MEMBUKA modal ini tetap
// butuh baris ini karena dipanggil lewat data-action="FuelBarCorrection.open".)
if (typeof FuelBarCorrection !== 'undefined') window.FuelBarCorrection = FuelBarCorrection;
