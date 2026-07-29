// fuel-tank-profile.js — Fuel Tank Profile (TASK-142).
//
// PRINSIP: field baru & OPSIONAL di D.vehicles[i].fuelTankProfile (ADDITIVE
// — kendaraan lama tanpa field ini tetap jalan normal, get() balikin
// DEFAULTS penuh). TIDAK ada storage baru di luar D.vehicles (pola sama
// persis `intervalOverrides` di vehicle-core.js — object config kecil
// nempel di record kendaraan yang sudah ada, BUKAN koleksi terpisah).
// TIDAK menyentuh vehicle-core.js (CRUD kendaraan/saveVehicle() apa
// adanya, 0 baris diubah) — modul ini murni domain fuel, baca/tulis 1
// field baru lewat API sendiri (get/validate/save), dipanggil dari
// UI fuel-* (mis. form pengaturan tangki di FuelModal, sesi mendatang)
// bukan dari form kendaraan umum. PURE kecuali save() (satu-satunya
// method yang menulis ke D & panggil save() global, sama seperti
// saveVehicle()/recordBbmLog() di file lain project ini).
const FuelTankProfile = {

// DEFAULTS — dipakai get() buat isi field yang belum pernah diisi user
// (kendaraan lama / kendaraan baru yang belum diatur profil tangkinya).
DEFAULTS: {
  tankCapacityLiter: null,
  fuelBarCount: 8,
  reserveLiter: 0,
  tankShape: 'linear',
  calibrationCurve: [],
  defaultFuelType: null,
},

VALID_TANK_SHAPES: ['linear', 'nonLinear'],

// _vehicles() — baca D.vehicles apa adanya, pola sama persis _vehicles()
// di VehicleIntelligence/VehicleReminder/FuelIntelligenceEngine.
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

// get(vehicleId) — profil tangki 1 kendaraan, DEFAULTS digabung dgn
// field yang sudah diisi user (Object.assign dangkal — field individual
// yang belum diisi tetap dapat default, bukan seluruh objek jadi default
// kalau ADA field lain yang sudah diisi). null kalau kendaraan tidak
// ditemukan (bukan {} — biar caller bisa bedakan "tidak ada kendaraan"
// dari "kendaraan ada, profil masih default").
get(vehicleId) {
  const veh = this._vehicles().find((v) => v.id === vehicleId);
  if (!veh) return null;
  return Object.assign({}, this.DEFAULTS, veh.fuelTankProfile || {});
},

// validate(profile) — validasi PARTIAL (tiap field opsional & independen,
// biar mendukung update sebagian field lewat save() tanpa harus kirim
// semua field tiap kali) — {valid, errors[]}. errors dalam Bahasa
// Indonesia (pola sama persis pesan toast/error lain di project ini).
validate(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { valid: false, errors: ['Data profil tangki tidak valid'] };
  }
  if (profile.tankCapacityLiter !== undefined && profile.tankCapacityLiter !== null) {
    if (typeof profile.tankCapacityLiter !== 'number' || !isFinite(profile.tankCapacityLiter) || profile.tankCapacityLiter <= 0) {
      errors.push('Kapasitas tangki (liter) harus angka lebih besar dari 0');
    }
  }
  if (profile.fuelBarCount !== undefined && profile.fuelBarCount !== null) {
    if (!Number.isInteger(profile.fuelBarCount) || profile.fuelBarCount < 1) {
      errors.push('Jumlah bar indikator BBM harus bilangan bulat minimal 1');
    }
  }
  if (profile.reserveLiter !== undefined && profile.reserveLiter !== null) {
    if (typeof profile.reserveLiter !== 'number' || !isFinite(profile.reserveLiter) || profile.reserveLiter < 0) {
      errors.push('Cadangan tangki (reserve liter) harus angka 0 atau lebih');
    } else if (typeof profile.tankCapacityLiter === 'number' && profile.tankCapacityLiter > 0 && profile.reserveLiter > profile.tankCapacityLiter) {
      errors.push('Cadangan tangki tidak boleh lebih besar dari kapasitas tangki');
    }
  }
  if (profile.tankShape !== undefined && profile.tankShape !== null) {
    if (this.VALID_TANK_SHAPES.indexOf(profile.tankShape) === -1) {
      errors.push('Bentuk tangki harus "linear" atau "nonLinear"');
    }
  }
  if (profile.calibrationCurve !== undefined && profile.calibrationCurve !== null) {
    if (!Array.isArray(profile.calibrationCurve)) {
      errors.push('Kurva kalibrasi harus berupa array titik {liter, percent}');
    } else {
      const badPoint = profile.calibrationCurve.some((p) => (
        !p || typeof p !== 'object'
        || typeof p.liter !== 'number' || !isFinite(p.liter) || p.liter < 0
        || typeof p.percent !== 'number' || !isFinite(p.percent) || p.percent < 0 || p.percent > 100
      ));
      if (badPoint) errors.push('Setiap titik kurva kalibrasi harus {liter:angka>=0, percent:0-100}');
    }
  }
  // tankShape nonLinear butuh kurva kalibrasi (linear cukup asumsi liter
  // proporsional lurus ke tinggi/bar, tidak butuh titik kalibrasi).
  const effectiveShape = profile.tankShape !== undefined ? profile.tankShape : undefined;
  if (effectiveShape === 'nonLinear') {
    const curve = profile.calibrationCurve;
    if (!Array.isArray(curve) || curve.length < 1) {
      errors.push('Bentuk tangki "nonLinear" butuh minimal 1 titik kurva kalibrasi');
    }
  }
  if (profile.defaultFuelType !== undefined && profile.defaultFuelType !== null) {
    if (typeof profile.defaultFuelType !== 'string' || !profile.defaultFuelType.trim()) {
      errors.push('Jenis BBM default harus teks, tidak boleh kosong');
    }
  }
  return { valid: errors.length === 0, errors };
},

// save(vehicleId, profileData) — merge profileData ke profil yang sudah
// ada (partial update, field yang tidak dikirim tetap dipertahankan),
// validasi HASIL gabungan (bukan cuma profileData mentah — supaya
// kombinasi lama+baru tetap konsisten, mis. reserveLiter lama vs
// tankCapacityLiter baru), baru tulis ke D & panggil save() (SUDAH ADA,
// pola sama persis saveVehicle()/recordBbmLog()). {ok:false, errors}
// kalau invalid ATAU kendaraan tidak ditemukan — TIDAK menulis apa pun
// ke D dalam kondisi manapun selain sukses penuh.
save(vehicleId, profileData) {
  const veh = this._vehicles().find((v) => v.id === vehicleId);
  if (!veh) return { ok: false, errors: ['Kendaraan tidak ditemukan'] };
  const merged = Object.assign({}, veh.fuelTankProfile || {}, profileData || {});
  const result = this.validate(merged);
  if (!result.valid) return { ok: false, errors: result.errors };
  veh.fuelTankProfile = merged;
  if (typeof save === 'function') save();
  return { ok: true, profile: Object.assign({}, this.DEFAULTS, merged) };
},

};
