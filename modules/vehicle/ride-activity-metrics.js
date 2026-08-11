// ride-activity-metrics.js — RideActivityMetrics (S522, "Ride Activity
// Metrics Foundation"). HARD SCOPE sesi ini: PURE deterministic math
// functions saja — fondasi buat Ride Activity GPS recorder yang akan
// dibangun sesi-sesi berikutnya (S523+).
//
// TIDAK ADA di file ini (sengaja, sesuai scope S522):
//   - 0 GPS/geolocation API call
//   - 0 UI/DOM
//   - 0 IndexedDB/storage
//   - 0 service worker
//   - 0 baca/tulis D
//   - 0 dependency ke vehicle-core.js/TripEngine/LogisticsEngine/fuel/
//     maintenance — file ini SENGAJA berdiri sendiri (zero dependency)
//     supaya bisa dites 100% terisolasi tanpa mock apa pun.
//
// TRACKPOINT CONTRACT (bentuk 1 titik GPS mentah, BUKAN tipe TypeScript,
// cuma dokumentasi shape objek plain yang diterima semua fungsi di sini):
//   {
//     timestamp,  // wajib — epoch ms (number) ATAU instance Date
//     latitude,   // wajib utk distance — derajat, -90..90
//     longitude,  // wajib utk distance — derajat, -180..180
//     accuracy,   // opsional, boleh null — meter (dari Geolocation API)
//     altitude,   // opsional, boleh null — meter
//     speed,      // opsional, boleh null — METER/DETIK (m/s), SAMA
//                 // persis unit `GeolocationCoordinates.speed` browser
//                 // native (bukan km/h) — semua fungsi di file ini yang
//                 // outputnya *Kmh mengonversi m/s -> km/h internal
//                 // (dikali 3.6), supaya kontrak titik GPS mentah cocok
//                 // 1:1 dengan apa yang nanti diteruskan Ride Recorder
//                 // GPS asli (S523+), 0 konversi tambahan dibutuhkan di
//                 // caller.
//   }
//
// PRINSIP UMUM (berlaku semua fungsi):
//   - Tidak pernah mutate array/objek input (semua filter/sort pakai
//     copy baru).
//   - Input null/undefined/bukan array/kosong -> selalu hasil "aman"
//     (0 utk angka akumulatif, null utk boundingBox — lihat catatan
//     per fungsi), TIDAK PERNAH throw.
//   - Invalid coordinate (bukan number/NaN/di luar rentang derajat
//     valid) TIDAK PERNAH dihitung ke distance/boundingBox.
//   - Invalid/null speed TIDAK PERNAH dihitung ke max/average speed
//     (dilewati, bukan dianggap 0).
//   - Interval waktu (dipakai calculateMovingTimeSec/calculateStoppedTimeSec)
//     punya TIGA klasifikasi, bukan dua: MOVING, STOPPED, atau
//     UNKNOWN/UNCLASSIFIED. speed=0 (angka valid) => STOPPED (bukti
//     kendaraan diam). speed=null/NaN/Infinity/negatif, ATAU accuracy
//     titik itu gagal filter => UNKNOWN (data tidak cukup utk
//     diklasifikasi) — UNKNOWN BUKAN STOPPED, dan TIDAK dihitung ke
//     movingTime maupun stoppedTime manapun (lihat "CORRECTIVE PASS"
//     di bawah). Konsekuensinya: `movingTime + stoppedTime <= duration`
//     (bisa lebih kecil kalau ada interval UNKNOWN), bukan selalu sama
//     dengan duration. TIDAK ADA API publik baru utk unknown time —
//     unknown cukup "tidak masuk ke mana pun".
//   - Null altitude TIDAK PERNAH dianggap elevation 0 (dilewati, titik
//     tsb tidak dipakai sbg salah satu sisi delta gain/loss).
//   - Accuracy filtering (options.maxAccuracyMeters) HANYA dipakai di
//     4 fungsi yang terima parameter `options`
//     (movingTime/stoppedTime/averageSpeed/maxSpeed) — distance murni,
//     duration, elevation, dan boundingBox TIDAK menerima/menerapkan
//     accuracy filtering (accuracy horizontal tidak relevan utk
//     altitude/waktu, dan distance/boundingBox sengaja dibiarkan raw
//     geometry supaya deterministic tanpa parameter tambahan — sesuai
//     Minimal API yang diminta, fungsi2 itu memang tidak punya
//     parameter `options`).
//   - accuracy === null/undefined/bukan number dianggap "tidak
//     diketahui" -> TIDAK di-exclude (permisif, sesuai kontrak
//     "accuracy boleh null"). accuracy di-exclude HANYA kalau berupa
//     number valid yang > options.maxAccuracyMeters.
//   - "Safe default" numerik dipakai KONSISTEN di seluruh file ini:
//     0 (bukan null) untuk semua fungsi akumulatif/rate (distance,
//     duration, moving/stopped time, average/max speed, elevation)
//     ketika input kosong/tidak ada sample valid — supaya konsumen
//     (UI/aggregator sesi depan) selalu bisa langsung pakai angka
//     tanpa null-check tambahan. SATU pengecualian: calculateBoundingBox
//     mengembalikan null kalau tidak ada koordinat valid sama sekali
//     (secara eksplisit diminta scope S522: "Empty input harus
//     menghasilkan null-safe result" khusus utk boundingBox, karena
//     objek {minLat:0,...} akan MENYESATKAN — 0,0 itu koordinat asli
//     yang valid di peta, beda dgn "tidak ada data").
//
// DISTANCE vs WAKTU — dua asumsi urutan yang BEDA (disengaja):
//   - calculateDistanceMeters mengikuti URUTAN ARRAY apa adanya (points
//     dianggap sudah berupa "jalur" sesuai urutan perekaman/pemanggil,
//     0 sorting tambahan) — path sebenarnya kendaraan bergerak TIDAK
//     bisa direkonstruksi dari timestamp ulang kalau array-nya
//     di-sort ulang.
//   - Semua fungsi berbasis WAKTU (duration/moving/stopped) TIDAK
//     mengasumsikan array sudah urut kronologis — GPS log kadang datang
//     out-of-order (buffering/batching). calculateDurationSec pakai
//     rentang (max - min) timestamp valid (bukan first/last array),
//     dan calculateMovingTimeSec/calculateStoppedTimeSec bekerja di atas
//     COPY yang di-sort ascending by timestamp dulu — supaya hasil
//     100% deterministic & tidak pernah negatif walau input out-of-order.
//
// CORRECTIVE PASS (audit pasca-approval): implementasi awal S522 salah
// menganggap interval dengan speed invalid/null ATAU accuracy buruk
// sebagai "stopped" (via formula duration - moving). Ini SALAH karena
// speed=null berarti "data tidak tersedia", bukan "terbukti diam" —
// beda makna dari speed=0 (angka valid, benar-benar bukti diam).
// Diperbaiki: calculateMovingTimeSec & calculateStoppedTimeSec sekarang
// masing-masing menjumlahkan interval yang SECARA EKSPLISIT
// diklasifikasi "moving"/"stopped" (lihat classifyIntervalSpeed di
// bawah) — bukan lagi selisih satu sama lain. Interval UNKNOWN
// (speed tidak valid/accuracy gagal) tidak masuk ke keduanya.

const EARTH_RADIUS_M = 6371000; // jari-jari bumi rata-rata, meter (dipakai Haversine)
const MPS_TO_KMH = 3.6; // 1 m/s = 3.6 km/h

const DEFAULT_OPTIONS = Object.freeze({
  movingSpeedThresholdKmh: 3,
  maxAccuracyMeters: 50,
});

// --- helpers murni internal (tidak diekspos) ---------------------------

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function toEpochMs(timestamp) {
  if (timestamp instanceof Date) {
    const t = timestamp.getTime();
    return Number.isFinite(t) ? t : null;
  }
  return isFiniteNumber(timestamp) ? timestamp : null;
}

function hasValidCoordinate(p) {
  if (!p || typeof p !== 'object') return false;
  const { latitude, longitude } = p;
  return (
    isFiniteNumber(latitude) && latitude >= -90 && latitude <= 90 &&
    isFiniteNumber(longitude) && longitude >= -180 && longitude <= 180
  );
}

function hasValidSpeed(p) {
  return !!p && typeof p === 'object' && isFiniteNumber(p.speed) && p.speed >= 0;
}

function hasValidAltitude(p) {
  return !!p && typeof p === 'object' && isFiniteNumber(p.altitude);
}

// accuracy === null/undefined/invalid -> dianggap "tidak diketahui", TIDAK
// di-exclude (permisif). Hanya di-exclude kalau berupa number valid yang
// melebihi ambang.
function passesAccuracyFilter(p, maxAccuracyMeters) {
  if (!p || typeof p !== 'object') return false;
  const acc = p.accuracy;
  if (acc === null || acc === undefined) return true;
  if (!isFiniteNumber(acc)) return true;
  if (!isFiniteNumber(maxAccuracyMeters)) return true;
  return acc <= maxAccuracyMeters;
}

function normalizeOptions(options) {
  const src = options && typeof options === 'object' ? options : {};
  const movingSpeedThresholdKmh = isFiniteNumber(src.movingSpeedThresholdKmh)
    ? src.movingSpeedThresholdKmh
    : DEFAULT_OPTIONS.movingSpeedThresholdKmh;
  const maxAccuracyMeters = isFiniteNumber(src.maxAccuracyMeters)
    ? src.maxAccuracyMeters
    : DEFAULT_OPTIONS.maxAccuracyMeters;
  return { movingSpeedThresholdKmh, maxAccuracyMeters };
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

// Copy baru, di-sort ascending by timestamp valid. Titik dengan timestamp
// invalid DIBUANG (bukan cuma tidak dipakai) — fungsi berbasis waktu tidak
// bisa menempatkan titik tanpa timestamp di urutan mana pun secara aman.
function sortedByTimestamp(points) {
  return points
    .map((p) => ({ point: p, t: toEpochMs(p && p.timestamp) }))
    .filter((entry) => entry.t !== null)
    .sort((a, b) => a.t - b.t);
}

function asArray(points) {
  return Array.isArray(points) ? points : [];
}

// Klasifikasi 1 interval [prev -> cur] berdasarkan speed titik AKHIR
// interval (cur), sesuai kontrak final S522:
//   - speed valid (angka finite, >=0) & accuracy titik itu lolos filter:
//       speedKmh >= threshold -> 'moving'
//       speedKmh <  threshold -> 'stopped'
//   - speed invalid (null/undefined/NaN/Infinity/negatif) ATAU accuracy
//     gagal filter -> 'unknown' (TIDAK dianggap 'stopped' — data tidak
//     cukup utk diklasifikasi, bukan bukti diam).
// Return null kalau intervalSec <= 0 (duplikat/anomali timestamp,
// interval ini tidak dihitung sbg apa pun).
function classifyIntervalSpeed(curPoint, opts) {
  if (!hasValidSpeed(curPoint)) return 'unknown';
  if (!passesAccuracyFilter(curPoint, opts.maxAccuracyMeters)) return 'unknown';
  const speedKmh = curPoint.speed * MPS_TO_KMH;
  return speedKmh >= opts.movingSpeedThresholdKmh ? 'moving' : 'stopped';
}

// Jumlahkan durasi (detik) semua interval ber-timestamp valid (copy
// ter-sort, 0 mutate input) yang classifyIntervalSpeed()-nya sama dengan
// `wantClassification` ('moving' atau 'stopped'). Interval dgn delta
// timestamp <= 0 dilewati sepenuhnya (tidak masuk kategori mana pun).
function sumClassifiedIntervalSec(points, options, wantClassification) {
  const opts = normalizeOptions(options);
  const sorted = sortedByTimestamp(asArray(points));
  if (sorted.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const intervalSec = (cur.t - prev.t) / 1000;
    if (intervalSec <= 0) continue;
    if (classifyIntervalSpeed(cur.point, opts) === wantClassification) {
      total += intervalSec;
    }
  }
  return total;
}

// --- RideActivityMetrics -------------------------------------------------

const RideActivityMetrics = {

DEFAULT_OPTIONS,

// calculateDistanceMeters(points) — total jarak (meter) sepanjang path,
// mengikuti URUTAN ARRAY apa adanya (lihat catatan header). Hanya titik
// dengan koordinat valid yang dipakai; titik invalid dilewati (bukan
// menghentikan/memutus perhitungan — pasangan berikutnya dihitung dari
// titik valid terakhir sebelumnya). 0 mutate input.
calculateDistanceMeters(points) {
  const pts = asArray(points).filter(hasValidCoordinate);
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += haversineMeters(
      pts[i - 1].latitude, pts[i - 1].longitude,
      pts[i].latitude, pts[i].longitude,
    );
  }
  return total;
},

// calculateTotalDistanceKm(points) — sama seperti calculateDistanceMeters,
// hasil dalam kilometer (meter / 1000).
calculateTotalDistanceKm(points) {
  return this.calculateDistanceMeters(points) / 1000;
},

// calculateDurationSec(points) — rentang waktu (detik) dari timestamp
// PALING AWAL sampai PALING AKHIR di antara titik dengan timestamp valid
// (bukan first/last array — jadi TIDAK PERNAH negatif walau array
// out-of-order). < 2 titik valid -> 0.
calculateDurationSec(points) {
  const sorted = sortedByTimestamp(asArray(points));
  if (sorted.length < 2) return 0;
  const first = sorted[0].t;
  const last = sorted[sorted.length - 1].t;
  return Math.max(0, (last - first) / 1000);
},

// calculateMovingTimeSec(points, options) — total durasi (detik) dari
// interval-interval antar titik BERURUTAN WAKTU (copy ter-sort, 0 mutate
// input) yang diklasifikasi "moving": titik akhir interval punya speed
// valid (>=0, sesudah konversi m/s->km/h) >= options.movingSpeedThresholdKmh
// DAN lolos accuracy filter (options.maxAccuracyMeters). Speed TIDAK
// PERNAH "dikarang" dari jarak/waktu 2 titik — murni field `speed` yang
// sudah ada di titik itu sendiri, sesuai scope S522 (derivasi speed dari
// posisi eksplisit TIDAK termasuk fungsi ini).
// Interval dengan speed invalid/tidak lolos accuracy diklasifikasi
// UNKNOWN, BUKAN otomatis stopped — TIDAK dihitung di sini (lihat
// classifyIntervalSpeed). Interval dengan delta timestamp <= 0
// (duplikat/anomali) dilewati.
calculateMovingTimeSec(points, options) {
  return sumClassifiedIntervalSec(points, options, 'moving');
},

// calculateStoppedTimeSec(points, options) — total durasi (detik) dari
// interval yang diklasifikasi "stopped": speed titik akhir interval
// VALID (angka nyata, bukan null/NaN/Infinity/negatif) dan < threshold
// — speed=0 (angka valid) TERMASUK stopped, karena itu bukti nyata
// kendaraan diam. Interval dengan speed TIDAK TERSEDIA/tidak valid, atau
// accuracy gagal filter, diklasifikasi UNKNOWN dan TIDAK dihitung sbg
// stopped (BUKAN lagi "duration - moving" — itu keliru menganggap semua
// waktu yang bukan moving otomatis stopped, padahal bisa saja unknown).
// Konsekuensi: movingTime + stoppedTime <= duration (bisa < kalau ada
// interval unknown), tidak selalu persis sama dengan duration.
calculateStoppedTimeSec(points, options) {
  return sumClassifiedIntervalSec(points, options, 'stopped');
},

// calculateAverageSpeedKmh(points, options) — total valid distance (km)
// / moving time (jam), BUKAN rata-rata arithmetic dari sample speed.
// Moving time 0 (termasuk kalau tidak ada data speed sama sekali) ->
// return 0 (safe default, lihat catatan header).
calculateAverageSpeedKmh(points, options) {
  const movingSec = this.calculateMovingTimeSec(points, options);
  if (movingSec <= 0) return 0;
  const distanceKm = this.calculateTotalDistanceKm(points);
  const movingHours = movingSec / 3600;
  return distanceKm / movingHours;
},

// calculateMaxSpeedKmh(points, options) — speed sample valid TERTINGGI
// (sesudah accuracy filtering & konversi m/s->km/h). Sample invalid/null
// TIDAK PERNAH dihitung. Tidak ada sample valid -> 0.
calculateMaxSpeedKmh(points, options) {
  const opts = normalizeOptions(options);
  let max = 0;
  let found = false;
  for (const p of asArray(points)) {
    if (!hasValidSpeed(p)) continue;
    if (!passesAccuracyFilter(p, opts.maxAccuracyMeters)) continue;
    const speedKmh = p.speed * MPS_TO_KMH;
    if (!found || speedKmh > max) {
      max = speedKmh;
      found = true;
    }
  }
  return found ? max : 0;
},

// calculateElevationGainM(points) — akumulasi delta altitude POSITIF
// antar titik BERURUTAN WAKTU yang sama-sama punya altitude valid (titik
// dengan altitude null DILEWATI, tidak dipakai sbg salah satu sisi delta
// — TIDAK dianggap elevation 0).
calculateElevationGainM(points) {
  return this._elevationDelta(points, 'gain');
},

// calculateElevationLossM(points) — sama seperti gain, akumulasi delta
// altitude NEGATIF sebagai nilai POSITIF (magnitude penurunan).
calculateElevationLossM(points) {
  return this._elevationDelta(points, 'loss');
},

// helper internal bersama gain/loss — 1 sumber kebenaran perhitungan
// delta supaya gain & loss selalu konsisten (0 rumus duplikat).
_elevationDelta(points, mode) {
  const sorted = sortedByTimestamp(asArray(points)).filter((e) => hasValidAltitude(e.point));
  if (sorted.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i].point.altitude - sorted[i - 1].point.altitude;
    if (mode === 'gain' && delta > 0) total += delta;
    if (mode === 'loss' && delta < 0) total += -delta;
  }
  return total;
},

// calculateBoundingBox(points) — {minLatitude,maxLatitude,minLongitude,
// maxLongitude} dari koordinat valid. TIDAK ADA koordinat valid -> null
// (BUKAN {min:0,...} — lihat catatan header kenapa null di-pilih khusus
// fungsi ini).
calculateBoundingBox(points) {
  const pts = asArray(points).filter(hasValidCoordinate);
  if (pts.length === 0) return null;
  let minLatitude = pts[0].latitude;
  let maxLatitude = pts[0].latitude;
  let minLongitude = pts[0].longitude;
  let maxLongitude = pts[0].longitude;
  for (let i = 1; i < pts.length; i++) {
    const { latitude, longitude } = pts[i];
    if (latitude < minLatitude) minLatitude = latitude;
    if (latitude > maxLatitude) maxLatitude = latitude;
    if (longitude < minLongitude) minLongitude = longitude;
    if (longitude > maxLongitude) maxLongitude = longitude;
  }
  return { minLatitude, maxLatitude, minLongitude, maxLongitude };
},

};
