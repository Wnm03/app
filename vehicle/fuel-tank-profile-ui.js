// fuel-tank-profile-ui.js — Atur Tangki UI (companion untuk TASK-142
// FuelTankProfile & TASK-144 FuelBarCorrection).
//
// PRINSIP: UI/orkestrasi TIPIS saja, 100% REUSE FuelTankProfile.get()/
// validate()/save() (SUDAH ADA) — TIDAK ada rumus/validasi baru di sini.
// Modul ini murni mengisi & mewire modal #fuelTankProfileModal.
//
// Alasan dibuat: FuelBarCorrection.open() (fuel-intelligence-ui.js)
// sejak awal hanya menampilkan toast "⚠️ Atur dulu profil tangki
// kendaraan ini (kapasitas liter)" lalu BERHENTI kalau profil belum
// diatur — tidak ada jalan untuk mengatur profilnya dari situ (UI-nya
// memang belum pernah dibuat, walau backend FuelTankProfile sudah ada
// sejak TASK-142). Modul ini mengisi lubang itu: toast diganti buka
// modal ini, dan setelah Simpan berhasil modal Koreksi otomatis lanjut
// terbuka kalau memang itu alasan modal ini dibuka (lihat _pendingCorrectionVid).
const FuelTankProfileUI = {

curVehicleId: null,
// _pendingCorrectionVid — diisi kalau modal ini dibuka DARI alur Koreksi
// (FuelBarCorrection.open() gagal krn profil belum ada). Setelah Simpan
// sukses, dipakai untuk otomatis lanjut buka FuelBarCorrection.open()
// lagi utk kendaraan yang sama, supaya user tidak perlu tap "Koreksi"
// dua kali. null kalau modal dibuka langsung (bukan dari alur Koreksi).
_pendingCorrectionVid: null,

_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// open(vehicleId, opts?) — opts.fromCorrection:true kalau dipanggil dari
// FuelBarCorrection.open() krn profil belum diatur (lihat _pendingCorrectionVid
// di atas). Isi form dari FuelTankProfile.get() (DEFAULTS digabung nilai
// tersimpan, pola sama persis semua consumer FuelTankProfile lain).
open(vehicleId, opts) {
  const veh = this._vehicle(vehicleId);
  if (!veh) {
    if (typeof toast === 'function') toast('⚠️ Kendaraan tidak ditemukan');
    return;
  }
  if (typeof FuelTankProfile === 'undefined') {
    if (typeof toast === 'function') toast('⚠️ Modul Fuel Tank Profile belum dimuat');
    return;
  }
  this.curVehicleId = vehicleId;
  this._pendingCorrectionVid = (opts && opts.fromCorrection) ? vehicleId : null;

  const profile = FuelTankProfile.get(vehicleId);

  const nameEl = document.getElementById('ftpVehName');
  if (nameEl) nameEl.textContent = (veh.emoji ? veh.emoji + ' ' : '') + veh.name;

  const hintEl = document.getElementById('ftpFromCorrectionHint');
  if (hintEl) hintEl.style.display = this._pendingCorrectionVid ? '' : 'none';

  const capEl = document.getElementById('ftpCapacity');
  if (capEl) capEl.value = (profile.tankCapacityLiter !== null && profile.tankCapacityLiter !== undefined) ? profile.tankCapacityLiter : '';
  const barEl = document.getElementById('ftpBarCount');
  if (barEl) barEl.value = profile.fuelBarCount;
  const reserveEl = document.getElementById('ftpReserve');
  if (reserveEl) reserveEl.value = profile.reserveLiter;
  const fuelTypeEl = document.getElementById('ftpFuelType');
  if (fuelTypeEl) fuelTypeEl.value = profile.defaultFuelType || '';

  const errEl = document.getElementById('ftpError');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  if (typeof openModal === 'function') openModal('fuelTankProfileModal');
},

// save() — target data-action tombol Simpan. Baca form, PARSE angka
// (kosong -> null/default lewat FuelTankProfile.DEFAULTS via save()
// partial-merge, SUDAH ADA), lempar ke FuelTankProfile.save() (SUDAH
// ADA — validasi & tulis ke D di sana, 0 duplikasi logic di sini).
save() {
  if (!this.curVehicleId || typeof FuelTankProfile === 'undefined') return;

  const capRaw = (document.getElementById('ftpCapacity') || {}).value;
  const barRaw = (document.getElementById('ftpBarCount') || {}).value;
  const reserveRaw = (document.getElementById('ftpReserve') || {}).value;
  const fuelTypeRaw = ((document.getElementById('ftpFuelType') || {}).value || '').trim();

  const profileData = {
    tankCapacityLiter: capRaw === '' || capRaw === undefined ? null : parseFloat(capRaw),
    fuelBarCount: barRaw === '' || barRaw === undefined ? 8 : parseInt(barRaw, 10),
    reserveLiter: reserveRaw === '' || reserveRaw === undefined ? 0 : parseFloat(reserveRaw),
    defaultFuelType: fuelTypeRaw === '' ? null : fuelTypeRaw,
  };

  const result = FuelTankProfile.save(this.curVehicleId, profileData);
  if (!result.ok) {
    const errEl = document.getElementById('ftpError');
    if (errEl) {
      errEl.textContent = result.errors.join(' • ');
      errEl.style.display = '';
    } else if (typeof toast === 'function') {
      toast('⚠️ ' + result.errors.join(' • '));
    }
    return;
  }

  const vid = this.curVehicleId;
  const pendingCorrectionVid = this._pendingCorrectionVid;
  this._pendingCorrectionVid = null;

  if (typeof closeModal === 'function') closeModal('fuelTankProfileModal');
  if (typeof toast === 'function') toast('✅ Profil tangki tersimpan');

  // Refresh Fuel Intelligence Card kalau ada — 100% REUSE FuelCard.render()
  // (SUDAH ADA), 0 logic render baru di sini.
  if (typeof FuelCard !== 'undefined' && typeof FuelCard.render === 'function') FuelCard.render();

  // Lanjut otomatis buka modal Koreksi kalau memang dari situ asalnya —
  // sekarang profil sudah ada, FuelBarCorrection.open() akan lanjut normal
  // (bar picker dkk), TIDAK toast-block lagi.
  if (pendingCorrectionVid && typeof FuelBarCorrection !== 'undefined') {
    FuelBarCorrection.open(pendingCorrectionVid);
  }
},

};

// pola fix sama persis window.FuelBarCorrection di fuel-intelligence-ui.js —
// tanpa baris ini, `data-action="FuelTankProfileUI.open"` /
// "FuelTankProfileUI.save" tidak pernah ditemukan lewat window.<path>
// walau const-nya sudah ada di scope module, karena top-level `const`
// hasil concat TIDAK otomatis jadi properti window (beda dgn `var`/function
// declaration). Efeknya: dispatcher selalu jatuh ke toast "Tombol ini belum
// berfungsi" persis seperti yang dilaporkan (tombol Simpan di modal Atur
// Tangki, & tombol Atur Tangki di Fuel Intelligence card).
if (typeof FuelTankProfileUI !== 'undefined') window.FuelTankProfileUI = FuelTankProfileUI;
