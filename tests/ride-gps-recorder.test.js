'use strict';
// tests/ride-gps-recorder.test.js — cakupan modules/vehicle/
// ride-gps-recorder.js (S523, "GPS Recorder + Permission Foundation").
// RideGpsRecorder = PRODUCER trackpoint (bukan consumer/metrics) —
// dites via loadSource dengan extraGlobals `navigator` PALSU (fake
// Geolocation provider), TANPA GPS/browser asli.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- fake Geolocation provider -------------------------------------------
//
// Meniru navigator.geolocation browser: watchPosition(success, error,
// options) mengembalikan watchId number & menyimpan callback yang
// di-capture di `calls` (BUKAN cuma disimpan di internal map yang hilang
// begitu clearWatch dipanggil) — supaya test bisa sengaja memanggil
// callback yang "sudah di-queue" LANGSUNG walau clearWatch() sudah
// dipanggil, mensimulasikan race callback GPS asli vs pause()/stop().
function createFakeGeolocation() {
  let nextId = 1;
  const calls = []; // { id, success, error, options }
  const clearedIds = new Set();
  return {
    calls,
    clearedIds,
    watchPosition(success, error, options) {
      const id = nextId++;
      calls.push({ id, success, error, options });
      return id;
    },
    clearWatch(id) {
      clearedIds.add(id);
    },
  };
}

function load(extraGlobals) {
  return loadSource(
    ['modules/vehicle/ride-gps-recorder.js'],
    extraGlobals || {},
    ['RideGpsRecorder'],
  ).RideGpsRecorder;
}

function loadWithFakeGeo() {
  const fakeGeo = createFakeGeolocation();
  const RideGpsRecorder = load({ navigator: { geolocation: fakeGeo } });
  return { RideGpsRecorder, fakeGeo };
}

function makePosition(overrides) {
  const coords = {
    latitude: -6.175392,
    longitude: 106.827153,
    accuracy: 5,
    altitude: 10,
    speed: 2.5,
    ...(overrides && overrides.coords),
  };
  return {
    timestamp: 1000,
    ...overrides,
    coords,
  };
}

// --- 1. API availability --------------------------------------------------

test('navigator.geolocation unavailable -> start() gagal deterministic, tidak throw', () => {
  const RideGpsRecorder = load({ navigator: {} }); // 0 geolocation
  const recorder = RideGpsRecorder.create();
  const result = recorder.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'API_UNAVAILABLE');
  assert.equal(recorder.getState(), 'IDLE');
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('navigator sendiri undefined -> start() gagal deterministic, tidak throw', () => {
  const RideGpsRecorder = load({}); // navigator tidak diinject sama sekali
  const recorder = RideGpsRecorder.create();
  assert.doesNotThrow(() => recorder.start());
  const result = recorder.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'API_UNAVAILABLE');
});

// --- 2. start() ------------------------------------------------------------

test('start() memanggil watchPosition tepat 1x dan masuk RECORDING', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  const result = recorder.start();
  assert.equal(result.ok, true);
  assert.equal(fakeGeo.calls.length, 1);
  assert.equal(recorder.getState(), 'RECORDING');
});

test('duplicate start() saat RECORDING tidak membuat watcher kedua', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const second = recorder.start();
  assert.equal(second.ok, true);
  assert.equal(fakeGeo.calls.length, 1); // masih 1, bukan 2
  assert.equal(recorder.getState(), 'RECORDING');
});

test('start() meneruskan geo options (enableHighAccuracy/maximumAge/timeout) apa adanya', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create({ enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
  recorder.start();
  // per-field, bukan deepEqual whole-object -- geoOptions dibuat di dalam
  // realm vm sandbox (loadSource), sedangkan literal pembanding di sini
  // dari realm test -- deepStrictEqual (assert/strict) menganggap objek
  // lintas realm TIDAK reference-equal walau structurally sama (lihat
  // konvensi yang sama di tests/ride-activity-metrics.test.js).
  const opts = fakeGeo.calls[0].options;
  assert.equal(opts.enableHighAccuracy, true);
  assert.equal(opts.maximumAge, 0);
  assert.equal(opts.timeout, 5000);
});

test('start() tidak menyisipkan movingSpeedThresholdKmh/maxAccuracyMeters ke geo options', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create({ movingSpeedThresholdKmh: 3, maxAccuracyMeters: 50 });
  recorder.start();
  assert.equal('movingSpeedThresholdKmh' in fakeGeo.calls[0].options, false);
  assert.equal('maxAccuracyMeters' in fakeGeo.calls[0].options, false);
});

// --- 3. successful position -> trackpoint normalization -------------------

test('successful position dinormalisasi menjadi {timestamp,latitude,longitude,accuracy,altitude,speed}', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 123456 }));
  const points = recorder.getTrackpoints();
  assert.equal(points.length, 1);
  // per-field (bukan deepEqual whole-object) — lihat catatan konvensi
  // realm-vm di atas.
  assert.equal(points[0].timestamp, 123456);
  assert.equal(points[0].latitude, -6.175392);
  assert.equal(points[0].longitude, 106.827153);
  assert.equal(points[0].accuracy, 5);
  assert.equal(points[0].altitude, 10);
  assert.equal(points[0].speed, 2.5);
});

test('timestamp dari position.timestamp, BUKAN Date.now()', () => {
  const before = Date.now();
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 })); // jauh di bawah Date.now()
  const [point] = recorder.getTrackpoints();
  assert.equal(point.timestamp, 1);
  assert.ok(point.timestamp < before);
});

test('altitude null tetap dipertahankan sebagai null (tidak jadi 0)', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { altitude: null } }));
  assert.equal(recorder.getTrackpoints()[0].altitude, null);
});

test('speed null tetap dipertahankan sebagai null', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { speed: null } }));
  assert.equal(recorder.getTrackpoints()[0].speed, null);
});

test('accuracy null tetap dipertahankan sebagai null', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { accuracy: null } }));
  assert.equal(recorder.getTrackpoints()[0].accuracy, null);
});

test('speed TIDAK dikonversi ke km/h — tetap unit m/s browser native', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { speed: 12.34 } }));
  assert.equal(recorder.getTrackpoints()[0].speed, 12.34); // bukan *3.6
});

// --- 4. invalid GPS data ----------------------------------------------------

test('invalid latitude (di luar -90..90) -> point diabaikan, tidak throw', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  assert.doesNotThrow(() => fakeGeo.calls[0].success(makePosition({ coords: { latitude: 999 } })));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('invalid longitude (di luar -180..180) -> point diabaikan', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { longitude: -181 } }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('invalid timestamp (NaN/non-number) -> point diabaikan', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: NaN }));
  fakeGeo.calls[0].success(makePosition({ timestamp: 'not-a-number' }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('speed negatif -> point diabaikan (bukan diclamp ke 0)', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { speed: -5 } }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('accuracy/altitude hadir tapi bukan number valid -> point diabaikan', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { accuracy: 'bad' } }));
  fakeGeo.calls[0].success(makePosition({ coords: { altitude: NaN } }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('satu point invalid tidak menghentikan recording — point valid berikutnya tetap masuk', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ coords: { latitude: 999 } })); // invalid
  fakeGeo.calls[0].success(makePosition({ timestamp: 2 })); // valid
  assert.equal(recorder.getTrackpoints().length, 1);
  assert.equal(recorder.getTrackpoints()[0].timestamp, 2);
});

// --- 5. error handling: permission denied / unavailable / timeout ----------

test('PERMISSION_DENIED (code 1) dinormalisasi dengan benar', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].error({ code: 1, message: 'User denied Geolocation' });
  const err = recorder.getLastError();
  assert.equal(err.code, 'PERMISSION_DENIED');
  assert.equal(err.message, 'User denied Geolocation');
});

test('POSITION_UNAVAILABLE (code 2) dibedakan dari permission denied', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].error({ code: 2, message: 'Position unavailable' });
  assert.equal(recorder.getLastError().code, 'POSITION_UNAVAILABLE');
});

test('TIMEOUT (code 3) dibedakan dari 2 error lainnya', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].error({ code: 3, message: 'Timeout' });
  assert.equal(recorder.getLastError().code, 'TIMEOUT');
});

test('unknown error code -> UNKNOWN, informasi asli tetap ada di raw', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const original = { code: 999, message: 'weird' };
  fakeGeo.calls[0].error(original);
  const err = recorder.getLastError();
  assert.equal(err.code, 'UNKNOWN');
  assert.equal(err.raw, original);
});

test('error tidak menghentikan recording (state tetap RECORDING, tidak throw)', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  assert.doesNotThrow(() => fakeGeo.calls[0].error({ code: 2 }));
  assert.equal(recorder.getState(), 'RECORDING');
});

// --- 6. pause/resume --------------------------------------------------------

test('pause() memanggil clearWatch dan tidak ada point baru setelah pause', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const watchCall = fakeGeo.calls[0];
  const result = recorder.pause();
  assert.equal(result.ok, true);
  assert.equal(recorder.getState(), 'PAUSED');
  assert.equal(fakeGeo.clearedIds.has(watchCall.id), true);

  // Callback lama yang masih "hidup" (belum di-GC oleh browser) TIDAK
  // boleh menambah point walau dipanggil langsung setelah pause().
  watchCall.success(makePosition({ timestamp: 999 }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('resume() membuat watcher baru dan point kembali diterima', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  recorder.pause();
  const result = recorder.resume();
  assert.equal(result.ok, true);
  assert.equal(recorder.getState(), 'RECORDING');
  assert.equal(fakeGeo.calls.length, 2); // watcher baru dibuat

  fakeGeo.calls[1].success(makePosition({ timestamp: 42 }));
  assert.equal(recorder.getTrackpoints().length, 1);
  assert.equal(recorder.getTrackpoints()[0].timestamp, 42);
});

test('resume() TIDAK mereset trackpoints yang sudah ada', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 }));
  recorder.pause();
  recorder.resume();
  assert.equal(recorder.getTrackpoints().length, 1);
  assert.equal(recorder.getTrackpoints()[0].timestamp, 1);
});

test('stale watcher generasi lama (sebelum pause->resume) tetap diabaikan walau dipanggil setelah resume', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const oldWatchCall = fakeGeo.calls[0];
  recorder.pause();
  recorder.resume();
  // simulasikan callback watcher LAMA yang telat datang setelah resume
  oldWatchCall.success(makePosition({ timestamp: 777 }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('pause() dari state selain RECORDING tidak melakukan apa-apa yang merusak', () => {
  const { RideGpsRecorder } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  const result = recorder.pause(); // masih IDLE
  assert.equal(result.ok, false);
  assert.equal(recorder.getState(), 'IDLE');
});

test('resume() dari state selain PAUSED tidak melakukan apa-apa yang merusak', () => {
  const { RideGpsRecorder } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  const result = recorder.resume(); // masih IDLE
  assert.equal(result.ok, false);
  assert.equal(recorder.getState(), 'IDLE');
});

// --- 7. stop -----------------------------------------------------------------

test('stop() memanggil clearWatch dan pindah ke STOPPED', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const watchCall = fakeGeo.calls[0];
  recorder.stop();
  assert.equal(recorder.getState(), 'STOPPED');
  assert.equal(fakeGeo.clearedIds.has(watchCall.id), true);
});

test('callback setelah stop() tidak menambahkan point', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const watchCall = fakeGeo.calls[0];
  recorder.stop();
  watchCall.success(makePosition({ timestamp: 555 }));
  assert.equal(recorder.getTrackpoints().length, 0);
});

test('duplicate stop() aman, tidak throw, tidak duplicate clear yang berbahaya', () => {
  const { RideGpsRecorder } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  assert.doesNotThrow(() => {
    recorder.stop();
    recorder.stop();
    recorder.stop();
  });
  assert.equal(recorder.getState(), 'STOPPED');
});

test('stop() mempertahankan trackpoints yang sudah direkam', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 }));
  fakeGeo.calls[0].success(makePosition({ timestamp: 2 }));
  recorder.stop();
  assert.equal(recorder.getTrackpoints().length, 2);
});

test('stop() dari IDLE aman (belum pernah start)', () => {
  const { RideGpsRecorder } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  assert.doesNotThrow(() => recorder.stop());
  assert.equal(recorder.getState(), 'STOPPED');
});

// --- 8. clear() ---------------------------------------------------------------

test('clear() menghapus trackpoints runtime tanpa mengubah state', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 }));
  recorder.stop();
  recorder.clear();
  assert.equal(recorder.getTrackpoints().length, 0);
  assert.equal(recorder.getState(), 'STOPPED'); // clear != stop, state tidak berubah
});

test('stop() TIDAK otomatis memanggil clear() — point tetap ada sampai clear() eksplisit', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 }));
  recorder.stop();
  assert.equal(recorder.getTrackpoints().length, 1);
});

// --- 9. immutability / defensive copy -----------------------------------------

test('getTrackpoints() mengembalikan defensive copy — mutasi hasil tidak mengubah internal state', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 }));
  const points = recorder.getTrackpoints();
  points[0].latitude = 9999;
  points.push({ timestamp: 2, latitude: 0, longitude: 0, accuracy: null, altitude: null, speed: null });
  const pointsAgain = recorder.getTrackpoints();
  assert.equal(pointsAgain.length, 1);
  assert.notEqual(pointsAgain[0].latitude, 9999);
});

test('trackpoint internal bukan referensi langsung ke coords/position browser', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  const position = makePosition({ timestamp: 1 });
  fakeGeo.calls[0].success(position);
  position.coords.latitude = 12345; // mutate objek browser asli setelah direkam
  assert.notEqual(recorder.getTrackpoints()[0].latitude, 12345);
});

// --- 10. full lifecycle ---------------------------------------------------------

test('lifecycle penuh: IDLE -> RECORDING -> PAUSED -> RECORDING -> STOPPED', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  assert.equal(recorder.getState(), 'IDLE');
  recorder.start();
  assert.equal(recorder.getState(), 'RECORDING');
  fakeGeo.calls[0].success(makePosition({ timestamp: 1 }));
  recorder.pause();
  assert.equal(recorder.getState(), 'PAUSED');
  recorder.resume();
  assert.equal(recorder.getState(), 'RECORDING');
  fakeGeo.calls[fakeGeo.calls.length - 1].success(makePosition({ timestamp: 2 }));
  recorder.stop();
  assert.equal(recorder.getState(), 'STOPPED');
  assert.equal(recorder.getTrackpoints().length, 2);
});

// --- 11. no metrics logic --------------------------------------------------------

test('recorder tidak mengekspos/menghitung distance/speed/elevation apa pun', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1, coords: { latitude: -6.1, longitude: 106.8, speed: 5 } }));
  fakeGeo.calls[0].success(makePosition({ timestamp: 2000, coords: { latitude: -6.2, longitude: 106.9, speed: 6 } }));
  const forbiddenKeys = [
    'totalDistance', 'distance', 'averageSpeed', 'maxSpeed', 'movingTime',
    'stoppedTime', 'elevationGain', 'elevationLoss', 'boundingBox', 'duration',
  ];
  for (const key of forbiddenKeys) {
    assert.equal(key in recorder, false, `recorder tidak boleh punya key "${key}"`);
  }
});

// --- 12. S522 integration boundary --------------------------------------------

test('output trackpoint recorder bisa langsung diberikan ke RideActivityMetrics (S522) tanpa transformasi', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const RideActivityMetrics = loadSource(
    ['modules/vehicle/ride-activity-metrics.js'],
    {},
    ['RideActivityMetrics'],
  ).RideActivityMetrics;

  const recorder = RideGpsRecorder.create();
  recorder.start();
  fakeGeo.calls[0].success(makePosition({
    timestamp: 0,
    coords: { latitude: -6.175392, longitude: 106.827153, speed: 0, altitude: 10, accuracy: 5 },
  }));
  fakeGeo.calls[0].success(makePosition({
    timestamp: 60000,
    coords: { latitude: -6.195000, longitude: 106.823059, speed: 3, altitude: 15, accuracy: 5 },
  }));
  recorder.stop();

  const points = recorder.getTrackpoints();
  assert.doesNotThrow(() => {
    RideActivityMetrics.calculateDistanceMeters(points);
    RideActivityMetrics.calculateDurationSec(points);
    RideActivityMetrics.calculateElevationGainM(points);
  });
  const distance = RideActivityMetrics.calculateDistanceMeters(points);
  assert.ok(distance > 0);
});

// --- 13. INVALID_STATE reporting (extra safety, tidak mengubah lifecycle resmi) ---

test('start() dari state STOPPED ditolak deterministic (tidak diam-diam merestart)', () => {
  const { RideGpsRecorder, fakeGeo } = loadWithFakeGeo();
  const recorder = RideGpsRecorder.create();
  recorder.start();
  recorder.stop();
  const result = recorder.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATE');
  assert.equal(recorder.getState(), 'STOPPED');
  assert.equal(fakeGeo.calls.length, 1); // tidak ada watcher baru
});

// --- 14. Regression: global "create()" hoisting collision vs ride-map.js --
//
// KRONOLOGI BUG (S529/S530/S531): scripts/build.js menggabungkan seluruh
// GROUP_B (termasuk ride-gps-recorder.js DAN ride-map.js) jadi SATU
// program JS tanpa scope isolation per-file. Sebelum fix ini, KEDUA file
// itu punya top-level `function create(...)` dengan nama identik tapi
// signature beda (ride-gps-recorder.js: create(options) vs ride-map.js:
// create(elementId, options)). Karena function-declaration hoisting
// diselesaikan SEKALI untuk SELURUH program sebelum baris apa pun
// dieksekusi, deklarasi TERAKHIR di source order (ride-map.js) menimpa
// punya ride-gps-recorder.js — walau `const RideGpsRecorder = { create }`
// letaknya lebih awal di file. Produksinya: RideGpsRecorder.create()
// diam-diam menjalankan create(elementId, options) milik RideMap, yang
// balikannya TIDAK punya .start() -> `RideUI.start()` throw
// "this._recorder.start is not a function" di browser (bundle asli),
// walau setiap file lolos test individual (loadSource men-load tiap file
// sebagai script TERPISAH, jadi collision hoisting lintas-file tidak
// pernah kejadian di situ -- itu sebabnya bug ini lolos dari 3703 test
// yang ada sebelumnya).
//
// FIX: helper internal di ride-gps-recorder.js di-rename dari
// `function create(options)` -> `function createRecorderInstance(options)`
// (API publik RideGpsRecorder.create(options) TIDAK berubah). Test di
// bawah ini secara sengaja memuat ride-gps-recorder.js BERSAMA
// ride-map.js sebagai SATU program tunggal (persis pola build.js/bundle
// produksi -- BUKAN loadSource per-file terpisah seperti test lain di
// file ini) supaya collision hoisting lintas-file benar-benar teruji,
// bukan cuma diasumsikan tidak ada.
test('REGRESSION: create() tidak collision dgn ride-map.js saat digabung jadi 1 program (pola build.js)', () => {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');

  const root = path.join(__dirname, '..');
  const combined = [
    'modules/vehicle/ride-gps-recorder.js',
    'modules/vehicle/ride-map.js',
  ]
    .map((f) => fs.readFileSync(path.join(root, f), 'utf8'))
    .join('\n');

  const fakeGeo = createFakeGeolocation();
  const sandbox = {
    console,
    navigator: { geolocation: fakeGeo },
    document: {
      getElementById: () => null,
    },
  };
  vm.createContext(sandbox);
  // SATU vm.Script untuk KEDUA file -- ini yang membedakan dari
  // loadSource() (yang jalankan tiap file sbg Script terpisah, sehingga
  // TIDAK bisa mendeteksi bug hoisting lintas-file ini).
  new vm.Script(combined, { filename: 'combined-ride-gps-recorder+ride-map' }).runInContext(sandbox);
  new vm.Script(
    'this.RideGpsRecorder = RideGpsRecorder; this.RideMap = RideMap;',
    { filename: 'expose' },
  ).runInContext(sandbox);

  // RideGpsRecorder.create() harus tetap menghasilkan recorder instance asli
  assert.equal(typeof sandbox.RideGpsRecorder.create, 'function');
  const recorder = sandbox.RideGpsRecorder.create();
  assert.equal(typeof recorder.start, 'function');
  assert.equal(typeof recorder.pause, 'function');
  assert.equal(typeof recorder.resume, 'function');
  assert.equal(typeof recorder.stop, 'function');
  assert.equal(typeof recorder.getState, 'function');
  assert.equal(typeof recorder.getTrackpoints, 'function');
  assert.equal(typeof recorder.clear, 'function');
  assert.equal(typeof recorder.getLastError, 'function');

  // start() harus benar2 berjalan (bukan throw "X is not a function")
  assert.doesNotThrow(() => {
    const result = recorder.start();
    assert.equal(result.ok, true);
  });
  assert.equal(recorder.getState(), 'RECORDING');

  // RideMap.create() (API publik map, signature elementId+options) HARUS
  // tetap berfungsi normal -- fix ini tidak boleh merusak RideMap.
  assert.equal(typeof sandbox.RideMap.create, 'function');
  const mapResult = sandbox.RideMap.create('some-el-id');
  assert.equal(mapResult.ok, true);
  assert.equal(mapResult.id, 'some-el-id');
});
