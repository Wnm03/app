// fuel-gauge-engine.js — Fuel Gauge Engine (TASK-143).
//
// PRINSIP: 100% REUSE FuelTankProfile.get() (TASK-142, kalibrasi tangki per
// kendaraan) + fuelEfficiency() global (vehicle-core.js, SUDAH ADA, dipakai
// VehicleFuelTrendSummary/FuelIntelligenceEngine) utk kmPerLiter. TIDAK ada
// storage baru, TIDAK menyentuh fuel-tank-profile.js/vehicle-core.js, TIDAK
// ada UI. PURE (read-only, tidak pernah panggil save()) & DETERMINISTIK —
// input+profil sama selalu balikin output sama persis (tidak ada Date.now(),
// Math.random(), atau state mutable tersimpan di objek ini).
//
// SINGLE SOURCE OF TRUTH: modul ini dimaksudkan jadi SATU-SATUNYA tempat
// rumus konversi bar↔liter↔persen/estimasi jangkauan/status reserve dihitung
// utk domain fuel gauge. Konsumen MASA DEPAN (FuelCard, FuelAnalytics, serta
// Fuel Prediction/Fuel Reality Check yang belum ada) WAJIB pakai
// FuelGaugeEngine.* alih-alih menghitung ulang sendiri — sesi ini TIDAK
// mengubah fuel-card.js/fuel-analytics.js (keduanya saat ini belum punya
// rumus bar/liter/persen apa pun, jadi tidak ada yang perlu diganti; lihat
// AI_STATE.md § Sesi 143 untuk catatan audit ini) — wiring itu jadi kerjaan
// sesi lain yang eksplisit memintanya (1 task = 1 sesi, sesuai AI_RULES.md).
//
// METADATA KALIBRASI (internal): helper interpolasi di bawah balikin objek
// {value, segmentIndex, source} secara internal supaya kalau nanti ada
// auto-kalibrasi (mis. mendeteksi titik kurva yang kurang akurat dari histori
// BBM), engine ini sudah punya jejak "titik interpolasi mana yang dipakai"
// tanpa perlu ubah API publik. Field ini SENGAJA tidak diteruskan ke hasil
// publik (_stripMeta() di bawah) — caller cuma butuh angka hasil akhir.
//
// EXTENSION POINT CONFIDENCE (belum diimplementasi): _confidence() di bawah
// adalah stub yang DISENGAJA belum dipanggil dari mana pun & selalu balikin
// null — reserved utk sesi masa depan yang eksplisit memintanya (skor
// keyakinan estimasi, mis. berdasarkan jumlah titik kalibrasi/histori BBM).
// TIDAK mengubah API publik saat ini.
const FuelGaugeEngine = {

// _profile(vehicleId) — ambil profil tangki (TASK-142) + guard umum yang
// dipakai semua method publik di bawah: FuelTankProfile belum dimuat,
// kendaraan tidak ditemukan, atau tankCapacityLiter belum diisi (semua
// perhitungan liter/bar/persen butuh kapasitas tangki > 0 sbg pembagi).
// {ok:false, reason} kalau salah satu guard gagal, {ok:true, data} kalau
// lolos (pola {ok,...} sama persis modul fuel-* lain di project ini).
_profile(vehicleId) {
  if (typeof FuelTankProfile === 'undefined') {
    return { ok: false, reason: 'FuelTankProfile belum dimuat' };
  }
  const data = FuelTankProfile.get(vehicleId);
  if (!data) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  if (typeof data.tankCapacityLiter !== 'number' || !isFinite(data.tankCapacityLiter) || data.tankCapacityLiter <= 0) {
    return { ok: false, reason: 'Kapasitas tangki belum diatur (isi profil tangki dulu)' };
  }
  return { ok: true, data };
},

// _isValidNumber(n) — guard input angka umum (bukan number, NaN, Infinity
// ditolak). Dipakai semua method publik sebelum clamp, biar pesan error
// invalid-input konsisten satu tempat.
_isValidNumber(n) {
  return typeof n === 'number' && isFinite(n);
},

// _clamp(n, min, max) — batasi n ke rentang [min, max]. Dipakai buat
// requirement #8 (clamp semua nilai) di semua method publik.
_clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
},

// _curvePoints(profile) — titik kalibrasi nonLinear DIGABUNG dgn 2 jangkar
// fisik yang selalu berlaku apa pun bentuk tangki: liter 0 = 0% (kosong),
// liter tankCapacityLiter = 100% (penuh). Titik user (profile.calibrationCurve)
// menimpa jangkar kalau kebetulan liter-nya sama (mis. user isi titik di
// liter 0). Diurutkan menaik berdasarkan liter — dipakai _percentFromLiter().
// CATATAN: kurva diasumsikan monoton (liter naik -> persen naik), sama
// seperti validate() TASK-142 yang tidak memaksa monotonicity — GIGO by
// design, konsisten dgn modul fuel-* lain yang percaya data profil apa
// adanya.
_curvePoints(profile) {
  const map = new Map();
  map.set(0, 0);
  map.set(profile.tankCapacityLiter, 100);
  (profile.calibrationCurve || []).forEach((p) => map.set(p.liter, p.percent));
  return Array.from(map.entries())
    .map(([liter, percent]) => ({ liter, percent }))
    .sort((a, b) => a.liter - b.liter);
},

// _interpolate(points, x, xKey, yKey, segmentSource) — interpolasi linear
// piecewise generik: cari 2 titik yang mengapit x di sumbu xKey, balikin y
// di sumbu yKey secara proporsional. Balikin {value, segmentIndex, source}
// (metadata internal utk auto-kalibrasi masa depan, lihat catatan header —
// TIDAK diteruskan ke caller publik). x diasumsikan sudah di-clamp ke
// rentang titik oleh pemanggil, jadi loop selalu ketemu bracket (fallback
// titik terakhir kalau tidak, cuma jaga-jaga floating point).
_interpolate(points, x, xKey, yKey, segmentSource) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (x >= a[xKey] && x <= b[xKey]) {
      const span = b[xKey] - a[xKey];
      const value = span === 0 ? a[yKey] : a[yKey] + ((x - a[xKey]) / span) * (b[yKey] - a[yKey]);
      return { value, segmentIndex: i, source: segmentSource };
    }
  }
  const last = points[points.length - 1];
  return { value: last[yKey], segmentIndex: points.length - 2, source: segmentSource };
},

// _percentFromLiter(profile, liter) — liter (SUDAH di-clamp pemanggil ke
// [0, tankCapacityLiter]) -> persen 0-100. Tangki 'linear' (atau nonLinear
// tanpa titik kalibrasi, seharusnya tidak kejadian krn validate() TASK-142
// mewajibkan >=1 titik) pakai rumus proporsional langsung (source
// 'linear-formula'). Tangki 'nonLinear' interpolasi lewat _curvePoints()
// (source 'calibration-curve'). Balikin {value, segmentIndex, source}
// (metadata internal, lihat _interpolate()).
_percentFromLiter(profile, liter) {
  if (profile.tankShape !== 'nonLinear' || !profile.calibrationCurve || !profile.calibrationCurve.length) {
    return { value: (liter / profile.tankCapacityLiter) * 100, segmentIndex: null, source: 'linear-formula' };
  }
  return this._interpolate(this._curvePoints(profile), liter, 'liter', 'percent', 'calibration-curve');
},

// _literFromPercent(profile, percent) — kebalikan _percentFromLiter():
// persen (SUDAH di-clamp pemanggil ke [0,100]) -> liter. 'linear' pakai
// rumus proporsional langsung. 'nonLinear' interpolasi titik kalibrasi yang
// sama (diurutkan ulang berdasarkan persen, bukan liter, krn sumbu-x
// interpolasi kali ini persen).
_literFromPercent(profile, percent) {
  if (profile.tankShape !== 'nonLinear' || !profile.calibrationCurve || !profile.calibrationCurve.length) {
    return { value: (percent / 100) * profile.tankCapacityLiter, segmentIndex: null, source: 'linear-formula' };
  }
  const points = this._curvePoints(profile).slice().sort((a, b) => a.percent - b.percent);
  return this._interpolate(points, percent, 'percent', 'liter', 'calibration-curve');
},

// _confidence(profile, meta) — EXTENSION POINT, belum diimplementasi
// (requirement #3: reserved, tidak dipanggil dari mana pun sesi ini).
// Rencana masa depan: skor keyakinan estimasi dari jumlah titik kalibrasi/
// histori BBM tersedia. Sengaja selalu balikin null sekarang — TIDAK
// mengubah API publik.
_confidence(profile, meta) {
  return null;
},

// calculateFuelLiter(vehicleId, fuelBar) — konversi bar indikator BBM ->
// liter, sesuai profil kalibrasi tangki kendaraan (TASK-142, linear/nonLinear).
// Parameter:
//   vehicleId (string) — id kendaraan.
//   fuelBar (number) — posisi bar indikator saat ini (0..fuelBarCount).
// Return: {ok:true, vehicleId, liter, clamped} kalau sukses — liter
//   dibulatkan 2 desimal. {ok:false, reason} kalau: FuelTankProfile belum
//   dimuat, kendaraan tidak ditemukan, tankCapacityLiter belum diatur, atau
//   fuelBar bukan angka valid (NaN/Infinity/bukan number).
// Clamping: fuelBar DI-CLAMP ke [0, fuelBarCount] SEBELUM dihitung (bukan
//   ditolak) — `clamped:true` menandakan input asli di luar rentang & sudah
//   dibatasi.
calculateFuelLiter(vehicleId, fuelBar) {
  const profile = this._profile(vehicleId);
  if (!profile.ok) return profile;
  if (!this._isValidNumber(fuelBar)) return { ok: false, reason: 'Nilai bar BBM tidak valid' };
  const barCount = profile.data.fuelBarCount;
  const clampedBar = this._clamp(fuelBar, 0, barCount);
  const percent = this._clamp((clampedBar / barCount) * 100, 0, 100);
  const literMeta = this._literFromPercent(profile.data, percent);
  const liter = Math.round(this._clamp(literMeta.value, 0, profile.data.tankCapacityLiter) * 100) / 100;
  return { ok: true, vehicleId, liter, clamped: clampedBar !== fuelBar };
},

// calculateFuelBar(vehicleId, liter) — konversi liter -> posisi bar
// indikator BBM, sesuai profil kalibrasi tangki kendaraan.
// Parameter:
//   vehicleId (string) — id kendaraan.
//   liter (number) — jumlah BBM saat ini dalam liter.
// Return: {ok:true, vehicleId, bar, clamped} kalau sukses — bar dibulatkan
//   2 desimal. {ok:false, reason} kalau: profil tidak tersedia (lihat
//   _profile()) atau liter bukan angka valid.
// Clamping: liter DI-CLAMP ke [0, tankCapacityLiter] SEBELUM dihitung;
//   hasil bar juga DI-CLAMP ke [0, fuelBarCount] (jaga-jaga floating point).
//   `clamped:true` kalau liter asli di luar rentang tangki.
calculateFuelBar(vehicleId, liter) {
  const profile = this._profile(vehicleId);
  if (!profile.ok) return profile;
  if (!this._isValidNumber(liter)) return { ok: false, reason: 'Nilai liter tidak valid' };
  const cap = profile.data.tankCapacityLiter;
  const clampedLiter = this._clamp(liter, 0, cap);
  const percentMeta = this._percentFromLiter(profile.data, clampedLiter);
  const barRaw = (this._clamp(percentMeta.value, 0, 100) / 100) * profile.data.fuelBarCount;
  const bar = Math.round(this._clamp(barRaw, 0, profile.data.fuelBarCount) * 100) / 100;
  return { ok: true, vehicleId, bar, clamped: clampedLiter !== liter };
},

// calculateFuelPercent(vehicleId, liter) — konversi liter -> persentase
// BBM 0-100, sesuai profil kalibrasi tangki kendaraan.
// Parameter:
//   vehicleId (string) — id kendaraan.
//   liter (number) — jumlah BBM saat ini dalam liter.
// Return: {ok:true, vehicleId, percent, clamped} kalau sukses — percent
//   bilangan bulat 0-100 (Math.round). {ok:false, reason} kalau: profil
//   tidak tersedia atau liter bukan angka valid.
// Clamping: liter DI-CLAMP ke [0, tankCapacityLiter] SEBELUM dihitung;
//   percent hasil DI-CLAMP ke [0,100]. `clamped:true` kalau liter asli di
//   luar rentang tangki.
calculateFuelPercent(vehicleId, liter) {
  const profile = this._profile(vehicleId);
  if (!profile.ok) return profile;
  if (!this._isValidNumber(liter)) return { ok: false, reason: 'Nilai liter tidak valid' };
  const cap = profile.data.tankCapacityLiter;
  const clampedLiter = this._clamp(liter, 0, cap);
  const percentMeta = this._percentFromLiter(profile.data, clampedLiter);
  const percent = Math.round(this._clamp(percentMeta.value, 0, 100));
  return { ok: true, vehicleId, percent, clamped: clampedLiter !== liter };
},

// estimateRemainingDistance(vehicleId, liter) — estimasi jarak tempuh
// tersisa (km) dari sisa BBM saat ini, 100% REUSE fuelEfficiency() global
// (vehicle-core.js — SUDAH ADA, 0 rumus km/L baru dihitung di sini).
// Parameter:
//   vehicleId (string) — id kendaraan.
//   liter (number) — jumlah BBM saat ini dalam liter (dihitung dari SISA
//     seluruh tangki, TIDAK dikurangi reserve — pakai getReserveStatus()
//     terpisah kalau butuh tahu status reserve).
// Return: {ok:true, vehicleId, km, kmPerLiter, clamped} kalau sukses — km
//   dibulatkan (Math.round). {ok:false, reason} kalau: profil tidak
//   tersedia, liter bukan angka valid, fuelEfficiency() belum dimuat, atau
//   data efisiensi BBM kendaraan belum cukup (reason dari fuelEfficiency()
//   diteruskan apa adanya).
// Clamping: liter DI-CLAMP ke [0, tankCapacityLiter] SEBELUM dihitung.
//   `clamped:true` kalau liter asli di luar rentang tangki.
estimateRemainingDistance(vehicleId, liter) {
  const profile = this._profile(vehicleId);
  if (!profile.ok) return profile;
  if (!this._isValidNumber(liter)) return { ok: false, reason: 'Nilai liter tidak valid' };
  if (typeof fuelEfficiency !== 'function') return { ok: false, reason: 'fuelEfficiency belum dimuat' };
  const eff = fuelEfficiency(vehicleId);
  if (!eff.ok) return { ok: false, reason: eff.reason || 'Data efisiensi BBM belum cukup' };
  const cap = profile.data.tankCapacityLiter;
  const clampedLiter = this._clamp(liter, 0, cap);
  const km = Math.round(clampedLiter * eff.kmPerLiter);
  return { ok: true, vehicleId, km, kmPerLiter: eff.kmPerLiter, clamped: clampedLiter !== liter };
},

// getReserveStatus(vehicleId, liter) — status cadangan (reserve) BBM saat
// ini, dari reserveLiter profil tangki (TASK-142, default 0 kalau belum
// diatur).
// Parameter:
//   vehicleId (string) — id kendaraan.
//   liter (number) — jumlah BBM saat ini dalam liter.
// Return: {ok:true, vehicleId, inReserve, reserveLiter, literAboveReserve,
//   clamped} kalau sukses. inReserve true kalau liter <= reserveLiter.
//   literAboveReserve (liter di atas ambang reserve, minimal 0, dibulatkan
//   2 desimal). {ok:false, reason} kalau profil tidak tersedia atau liter
//   bukan angka valid.
// Clamping: liter DI-CLAMP ke [0, tankCapacityLiter] SEBELUM dihitung.
//   `clamped:true` kalau liter asli di luar rentang tangki.
getReserveStatus(vehicleId, liter) {
  const profile = this._profile(vehicleId);
  if (!profile.ok) return profile;
  if (!this._isValidNumber(liter)) return { ok: false, reason: 'Nilai liter tidak valid' };
  const cap = profile.data.tankCapacityLiter;
  const reserve = profile.data.reserveLiter || 0;
  const clampedLiter = this._clamp(liter, 0, cap);
  const inReserve = clampedLiter <= reserve;
  const literAboveReserve = Math.round(Math.max(clampedLiter - reserve, 0) * 100) / 100;
  return {
    ok: true,
    vehicleId,
    inReserve,
    reserveLiter: reserve,
    literAboveReserve,
    clamped: clampedLiter !== liter,
  };
},

};
