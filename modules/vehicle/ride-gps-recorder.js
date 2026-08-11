// ride-gps-recorder.js — RideGpsRecorder (S523, "GPS Recorder +
// Permission Foundation"). HARD SCOPE sesi ini: PRODUCER trackpoint via
// browser Geolocation API + lifecycle permission/start/pause/resume/stop
// yang deterministic. File ini TIDAK menghitung metrics apa pun — itu
// tetap tanggung jawab RideActivityMetrics (S522, modules/vehicle/
// ride-activity-metrics.js), yang TIDAK disentuh sama sekali di sini.
//
// GPS Recorder = PRODUCER
// S522 Metrics = CONSUMER
//
// TIDAK ADA di file ini (sengaja, sesuai scope S523):
//   - 0 IndexedDB/localStorage/sessionStorage/filesystem/server API
//   - 0 recovery
//   - 0 service worker
//   - 0 UI/DOM/HTML/map/route/polyline
//   - 0 TripEngine/LogisticsEngine/vehicle-core/fuel/maintenance
//   - 0 distance/duration/movingTime/stoppedTime/averageSpeed/maxSpeed/
//     elevation/boundingBox calculation — recorder BUKAN source of
//     truth kedua untuk metrics
//   - 0 setInterval() polling manual utk GPS — sumber posisi murni
//     navigator.geolocation.watchPosition()/clearWatch()
//
// TRACKPOINT CONTRACT (identik 1:1 dengan kontrak S522 — lihat header
// modules/vehicle/ride-activity-metrics.js):
//   {
//     timestamp,  // wajib — epoch ms dari GeolocationPosition.timestamp
//                 // (BUKAN Date.now())
//     latitude,   // wajib — derajat, -90..90
//     longitude,  // wajib — derajat, -180..180
//     accuracy,   // meter, boleh null (preserve apa adanya dari browser)
//     altitude,   // meter, boleh null (TIDAK PERNAH di-default ke 0)
//     speed,      // METER/DETIK (m/s), SAMA PERSIS unit browser native —
//                 // TIDAK dikonversi ke km/h di sini (itu tanggung jawab
//                 // S522 Metrics)
//   }
//
// PRINSIP UMUM:
//   - Setiap GeolocationPosition dinormalisasi menjadi object BARU
//     (bukan referensi ke coords/position browser) — internal state
//     recorder tidak bisa dimutasi tidak sengaja dari luar.
//   - getTrackpoints() selalu mengembalikan DEFENSIVE COPY (array baru +
//     object baru per titik), bukan referensi internal langsung.
//   - Point invalid (koordinat/timestamp/accuracy/altitude/speed tidak
//     valid sesuai kontrak) DILEWATI (ignore), TIDAK PERNAH throw —
//     satu GPS point buruk tidak boleh menghentikan recording.
//   - Trackpoints disimpan HANYA di runtime memory (this._points/
//     closure array) selama hidup instance — reload halaman = recording
//     hilang, dan itu acceptable utk S523 (persistence adalah S524).
//   - Callback safety: posisi/error dari watcher HANYA diproses kalau
//     watcher tsb masih watcher yang AKTIF (generation guard, lihat
//     bawah) DAN state saat ini RECORDING. Callback yang datang setelah
//     pause()/stop() (race GPS browser) TIDAK PERNAH menambahkan point.
//   - Lifecycle state machine deterministic, transisi yang di-dukung
//     HANYA: IDLE->start()->RECORDING, RECORDING->pause()->PAUSED,
//     PAUSED->resume()->RECORDING, RECORDING/PAUSED->stop()->STOPPED.
//     start() dua kali saat RECORDING TIDAK membuat watcher kedua.
//     stop() dipanggil berkali-kali aman (idempotent, tidak throw).
//   - Error dari Geolocation API dinormalisasi menjadi struktur
//     deterministic { code, message, raw } dengan code salah satu dari
//     PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT / UNKNOWN /
//     API_UNAVAILABLE / INVALID_STATE — tidak pernah "ditelan" tanpa
//     informasi, tapi juga tidak pernah throw dari callback (recording
//     tidak boleh crash karena satu error GPS).
//   - Permissions API (navigator.permissions.query) SENGAJA TIDAK
//     dipakai sama sekali di file ini (bukan cuma "fallback") — supaya
//     recorder tidak pernah bergantung pada API yang browser support-nya
//     tidak seragam. Sumber kebenaran posisi tetap murni
//     navigator.geolocation.watchPosition().

// --- helpers murni internal (tidak diekspos) ---------------------------

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNullish(v) {
  return v === null || v === undefined;
}

// Validasi + normalisasi 1 GeolocationPosition menjadi trackpoint plain
// object baru sesuai kontrak S522/S523. Return null kalau posisi invalid
// (point tsb harus di-ignore oleh caller, BUKAN throw).
function normalizeTrackpoint(position) {
  if (!position || typeof position !== 'object') return null;
  const coords = position.coords;
  if (!coords || typeof coords !== 'object') return null;

  const timestamp = position.timestamp;
  const { latitude, longitude, accuracy, altitude, speed } = coords;

  if (!isFiniteNumber(timestamp)) return null;
  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) return null;
  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) return null;

  // accuracy/altitude: boleh null/undefined (preserve sbg null). Kalau
  // HADIR tapi bukan number finite -> point dianggap invalid (bukan
  // di-default ke 0/diam-diam diperbaiki).
  if (!isNullish(accuracy) && !isFiniteNumber(accuracy)) return null;
  if (!isNullish(altitude) && !isFiniteNumber(altitude)) return null;
  // speed: boleh null/undefined, kalau hadir harus finite & non-negative
  // (m/s negatif tidak masuk akal secara fisik -> invalid).
  if (!isNullish(speed) && (!isFiniteNumber(speed) || speed < 0)) return null;

  return {
    timestamp,
    latitude,
    longitude,
    accuracy: isNullish(accuracy) ? null : accuracy,
    altitude: isNullish(altitude) ? null : altitude,
    speed: isNullish(speed) ? null : speed,
  };
}

// Normalisasi GeolocationPositionError (atau error apa pun) menjadi
// struktur deterministic. Code W3C: 1=PERMISSION_DENIED,
// 2=POSITION_UNAVAILABLE, 3=TIMEOUT. Selain itu -> UNKNOWN (informasi
// asli tetap dipertahankan di `raw`, tidak ditelan).
function normalizeGeoError(err) {
  if (err && typeof err === 'object' && isFiniteNumber(err.code)) {
    switch (err.code) {
      case 1:
        return { code: 'PERMISSION_DENIED', message: err.message || 'Permission denied', raw: err };
      case 2:
        return { code: 'POSITION_UNAVAILABLE', message: err.message || 'Position unavailable', raw: err };
      case 3:
        return { code: 'TIMEOUT', message: err.message || 'Timeout', raw: err };
      default:
        return { code: 'UNKNOWN', message: (err && err.message) || 'Unknown geolocation error', raw: err };
    }
  }
  return { code: 'UNKNOWN', message: (err && err.message) || 'Unknown geolocation error', raw: err || null };
}

function geolocationAvailable() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator &&
    typeof navigator.geolocation === 'object' &&
    navigator.geolocation !== null &&
    typeof navigator.geolocation.watchPosition === 'function'
  );
}

// Ambil hanya key GPS options yang relevan (enableHighAccuracy/
// maximumAge/timeout). SENGAJA tidak menerima movingSpeedThresholdKmh/
// maxAccuracyMeters di sini — itu tetap milik S522 Metrics, recorder
// hanya minta posisi mentah.
function pickGeoOptions(options) {
  const src = options && typeof options === 'object' ? options : {};
  const geoOptions = {};
  if (typeof src.enableHighAccuracy === 'boolean') {
    geoOptions.enableHighAccuracy = src.enableHighAccuracy;
  }
  if (isFiniteNumber(src.maximumAge)) {
    geoOptions.maximumAge = src.maximumAge;
  }
  if (isFiniteNumber(src.timeout)) {
    geoOptions.timeout = src.timeout;
  }
  return geoOptions;
}

// --- factory instance -----------------------------------------------------

// create(options) -> instance dengan lifecycle start/pause/resume/stop +
// getState/getTrackpoints/clear/getLastError. Options opsional:
//   enableHighAccuracy, maximumAge, timeout  -> diteruskan ke
//     watchPosition() apa adanya (lihat pickGeoOptions).
//   onTrackpoint(point)  -> dipanggil setiap kali 1 trackpoint valid
//     berhasil direkam (opsional, tidak wajib dipakai caller).
//   onError(normalizedError)  -> dipanggil setiap kali ada error GPS
//     ternormalisasi (opsional).
//   onStateChange(newState)  -> dipanggil setiap transisi state
//     (opsional).
function createRecorderInstance(options) {
  const geoOptions = pickGeoOptions(options);
  const onTrackpoint = options && typeof options.onTrackpoint === 'function' ? options.onTrackpoint : null;
  const onError = options && typeof options.onError === 'function' ? options.onError : null;
  const onStateChange = options && typeof options.onStateChange === 'function' ? options.onStateChange : null;

  let state = 'IDLE';
  let watchId = null;
  let points = [];
  let lastError = null;

  // generation guard: setiap kali watcher baru dibuat (start()/resume())
  // ATAU watcher lama dibersihkan (pause()/stop()), generation naik.
  // Callback yang "terlambat" (tertangkap closure generation LAMA)
  // otomatis diabaikan walau browser/environment masih memanggilnya
  // setelah clearWatch() — pertahanan kedua di atas cek state, supaya
  // race antara pause()/stop() dan callback GPS yang sudah di-queue
  // tetap deterministic.
  let generation = 0;

  function setState(next) {
    if (state === next) return;
    state = next;
    if (onStateChange) onStateChange(state);
  }

  function setError(normalized) {
    lastError = normalized;
    if (onError) onError(normalized);
  }

  function makeCallbacks() {
    const myGeneration = generation;
    return {
      onSuccess(position) {
        if (myGeneration !== generation) return; // watcher stale, diabaikan
        if (state !== 'RECORDING') return; // callback after pause/stop
        const point = normalizeTrackpoint(position);
        if (point === null) return; // invalid GPS data, ignore (no throw)
        points.push(point);
        if (onTrackpoint) onTrackpoint(point);
      },
      onFailure(err) {
        if (myGeneration !== generation) return; // watcher stale, diabaikan
        setError(normalizeGeoError(err));
      },
    };
  }

  function clearActiveWatch() {
    generation += 1; // invalidasi callback yang mungkin masih di-queue
    if (watchId !== null && geolocationAvailable() && typeof navigator.geolocation.clearWatch === 'function') {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
  }

  function beginWatch() {
    generation += 1;
    const callbacks = makeCallbacks();
    watchId = navigator.geolocation.watchPosition(callbacks.onSuccess, callbacks.onFailure, geoOptions);
  }

  function start() {
    if (state === 'RECORDING') return { ok: true }; // no duplicate watcher
    if (state !== 'IDLE') {
      const normalized = { code: 'INVALID_STATE', message: `cannot start() from state ${state}`, raw: null };
      setError(normalized);
      return { ok: false, error: normalized };
    }
    if (!geolocationAvailable()) {
      const normalized = { code: 'API_UNAVAILABLE', message: 'navigator.geolocation is not available', raw: null };
      setError(normalized);
      return { ok: false, error: normalized };
    }
    beginWatch();
    setState('RECORDING');
    return { ok: true };
  }

  function pause() {
    if (state !== 'RECORDING') {
      return { ok: false, error: { code: 'INVALID_STATE', message: `cannot pause() from state ${state}`, raw: null } };
    }
    clearActiveWatch();
    setState('PAUSED');
    return { ok: true };
  }

  function resume() {
    if (state !== 'PAUSED') {
      return { ok: false, error: { code: 'INVALID_STATE', message: `cannot resume() from state ${state}`, raw: null } };
    }
    if (!geolocationAvailable()) {
      const normalized = { code: 'API_UNAVAILABLE', message: 'navigator.geolocation is not available', raw: null };
      setError(normalized);
      return { ok: false, error: normalized };
    }
    beginWatch(); // existing points DIPERTAHANKAN — tidak di-reset
    setState('RECORDING');
    return { ok: true };
  }

  // stop() aman dipanggil dari state apa pun, termasuk berkali-kali
  // berturut-turut (idempotent) — TIDAK throw, TIDAK duplicate clear
  // yang berbahaya (clearActiveWatch sendiri sudah aman dipanggil
  // berulang karena watchId di-null-kan sesudahnya).
  function stop() {
    clearActiveWatch();
    setState('STOPPED');
    return { ok: true };
  }

  function getState() {
    return state;
  }

  // Defensive copy: array baru + object baru per titik, supaya caller
  // tidak bisa mutate internal state recorder secara tidak sengaja.
  function getTrackpoints() {
    return points.map((p) => ({ ...p }));
  }

  // clear() HANYA menghapus trackpoints runtime memory — bukan storage
  // (belum ada storage di S523) dan TIDAK dipanggil otomatis oleh
  // stop(). Aman dipanggil di state apa pun.
  function clear() {
    points = [];
  }

  function getLastError() {
    return lastError ? { ...lastError } : null;
  }

  return {
    start,
    pause,
    resume,
    stop,
    getState,
    getTrackpoints,
    clear,
    getLastError,
  };
}

// --- RideGpsRecorder -------------------------------------------------

const RideGpsRecorder = {
  create: createRecorderInstance,
};
