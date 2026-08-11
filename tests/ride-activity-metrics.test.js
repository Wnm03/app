'use strict';
// tests/ride-activity-metrics.test.js — cakupan modules/vehicle/
// ride-activity-metrics.js (S522, "Ride Activity Metrics Foundation";
// termasuk CORRECTIVE PASS pasca-audit: speed=null/invalid/accuracy
// gagal filter => UNKNOWN/UNCLASSIFIED, BUKAN otomatis "stopped").
// RideActivityMetrics 0-dependency (0 D, 0 DOM, 0 GPS) — dites via
// loadSource TANPA extraGlobals/mocks sama sekali, pola paling sederhana
// di harness ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load() {
  return loadSource(
    ['modules/vehicle/ride-activity-metrics.js'],
    {},
    ['RideActivityMetrics'],
  ).RideActivityMetrics;
}

// Jakarta ~ Bandung-ish reference points buat known-distance check.
// Monas (-6.175392, 106.827153) -> Bunderan HI (-6.195000, 106.823059)
// jarak lurus (Haversine) ~ 2.29 km (dihitung ulang manual di bawah,
// bukan angka "percaya begitu saja").
const MONAS = { latitude: -6.175392, longitude: 106.827153 };
const HI = { latitude: -6.195000, longitude: 106.823059 };

function haversineRef(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pt(overrides) {
  return {
    timestamp: 0,
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    speed: null,
    ...overrides,
  };
}

// --- 1. empty points -----------------------------------------------------

test('empty points — semua fungsi akumulatif balik 0, boundingBox balik null', () => {
  const M = load();
  assert.equal(M.calculateDistanceMeters([]), 0);
  assert.equal(M.calculateTotalDistanceKm([]), 0);
  assert.equal(M.calculateDurationSec([]), 0);
  assert.equal(M.calculateMovingTimeSec([]), 0);
  assert.equal(M.calculateStoppedTimeSec([]), 0);
  assert.equal(M.calculateAverageSpeedKmh([]), 0);
  assert.equal(M.calculateMaxSpeedKmh([]), 0);
  assert.equal(M.calculateElevationGainM([]), 0);
  assert.equal(M.calculateElevationLossM([]), 0);
  assert.equal(M.calculateBoundingBox([]), null);
});

test('null/undefined points — sama seperti empty (null-safe, tidak throw)', () => {
  const M = load();
  assert.equal(M.calculateDistanceMeters(null), 0);
  assert.equal(M.calculateDurationSec(undefined), 0);
  assert.equal(M.calculateMovingTimeSec(null), 0);
  assert.equal(M.calculateMaxSpeedKmh(undefined), 0);
  assert.equal(M.calculateBoundingBox(null), null);
});

// --- 2. single point ------------------------------------------------------

test('single point — distance/duration/moving/stopped/elevation semua 0, boundingBox min=max', () => {
  const M = load();
  const points = [pt({ timestamp: 1000, latitude: -6.2, longitude: 106.8, altitude: 10, speed: 5 })];
  assert.equal(M.calculateDistanceMeters(points), 0);
  assert.equal(M.calculateDurationSec(points), 0);
  assert.equal(M.calculateMovingTimeSec(points), 0);
  assert.equal(M.calculateStoppedTimeSec(points), 0);
  assert.equal(M.calculateElevationGainM(points), 0);
  assert.equal(M.calculateElevationLossM(points), 0);
  const bbox = M.calculateBoundingBox(points);
  // per-field, bukan deepEqual whole-object -- bbox datang dari realm vm
  // sandbox (loadSource), sedangkan literal pembanding dari realm test
  // ini; deepStrictEqual (dipakai assert/strict) menganggap objek lintas
  // realm TIDAK reference-equal walau structurally sama.
  assert.equal(bbox.minLatitude, -6.2);
  assert.equal(bbox.maxLatitude, -6.2);
  assert.equal(bbox.minLongitude, 106.8);
  assert.equal(bbox.maxLongitude, 106.8);
});

// --- 3. two-point known distance ------------------------------------------

test('calculateDistanceMeters() — 2 titik dikenal (Monas -> Bunderan HI) cocok Haversine manual', () => {
  const M = load();
  const points = [pt({ timestamp: 0, ...MONAS }), pt({ timestamp: 1000, ...HI })];
  const expected = haversineRef(MONAS, HI);
  const actual = M.calculateDistanceMeters(points);
  assert.ok(Math.abs(actual - expected) < 0.001, `expected ~${expected}, got ${actual}`);
  // sanity: harus di kisaran ~2.2-2.3km, bukan angka acak
  assert.ok(actual > 2000 && actual < 2500);
});

test('calculateTotalDistanceKm() — konsisten dgn calculateDistanceMeters/1000', () => {
  const M = load();
  const points = [pt({ timestamp: 0, ...MONAS }), pt({ timestamp: 1000, ...HI })];
  assert.equal(M.calculateTotalDistanceKm(points), M.calculateDistanceMeters(points) / 1000);
});

// --- 4. multiple-point accumulated distance -------------------------------

test('calculateDistanceMeters() — akumulasi 3+ titik = jumlah tiap segmen (bukan cuma titik awal-akhir)', () => {
  const M = load();
  const A = { latitude: -6.0, longitude: 106.0 };
  const B = { latitude: -6.01, longitude: 106.0 };
  const C = { latitude: -6.01, longitude: 106.02 };
  const points = [pt({ timestamp: 0, ...A }), pt({ timestamp: 1000, ...B }), pt({ timestamp: 2000, ...C })];
  const expected = haversineRef(A, B) + haversineRef(B, C);
  const actual = M.calculateDistanceMeters(points);
  assert.ok(Math.abs(actual - expected) < 0.001);
  // pasti > jarak langsung A->C (jalur bengkok lebih jauh dari garis lurus)
  assert.ok(actual > haversineRef(A, C));
});

// --- 5. invalid coordinates -------------------------------------------------

test('calculateDistanceMeters() — titik koordinat invalid (NaN/di luar rentang/string) dilewati, tidak dihitung', () => {
  const M = load();
  const A = { latitude: -6.0, longitude: 106.0 };
  const B = { latitude: -6.01, longitude: 106.0 };
  const points = [
    pt({ timestamp: 0, ...A }),
    pt({ timestamp: 500, latitude: NaN, longitude: 106.0 }),
    pt({ timestamp: 700, latitude: 999, longitude: 106.0 }), // di luar rentang derajat
    pt({ timestamp: 800, latitude: '−6.01', longitude: 106.0 }), // string, bukan number
    pt({ timestamp: 1000, ...B }),
  ];
  const actual = M.calculateDistanceMeters(points);
  const expected = haversineRef(A, B);
  assert.ok(Math.abs(actual - expected) < 0.001, `expected ~${expected}, got ${actual}`);
});

test('calculateBoundingBox() — koordinat invalid tidak mempengaruhi min/max', () => {
  const M = load();
  const points = [
    pt({ latitude: -6.0, longitude: 106.0 }),
    pt({ latitude: 999, longitude: 106.0 }), // invalid, harus diabaikan
    pt({ latitude: -6.5, longitude: 106.5 }),
  ];
  const bbox = M.calculateBoundingBox(points);
  assert.equal(bbox.minLatitude, -6.5);
  assert.equal(bbox.maxLatitude, -6.0);
  assert.equal(bbox.minLongitude, 106.0);
  assert.equal(bbox.maxLongitude, 106.5);
});

// --- 6. null accuracy --------------------------------------------------------

test('accuracy null -> tetap dihitung (tidak di-exclude) di moving/max/average speed', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, latitude: -6.0, longitude: 106.0, accuracy: null, speed: 10 }), // 36 km/h
    pt({ timestamp: 10000, latitude: -6.001, longitude: 106.0, accuracy: null, speed: 10 }),
  ];
  assert.equal(M.calculateMovingTimeSec(points), 10); // seluruh interval moving
  assert.equal(M.calculateMaxSpeedKmh(points), 36);
});

// --- 7. accuracy filtering -----------------------------------------------

test('calculateMaxSpeedKmh() — sample dengan accuracy melebihi maxAccuracyMeters di-exclude', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: 5, accuracy: 10 }),   // 18 km/h, lolos (default max 50)
    pt({ timestamp: 1000, speed: 50, accuracy: 200 }), // 180 km/h, tapi accuracy jelek -> exclude
  ];
  assert.equal(M.calculateMaxSpeedKmh(points), 18);
  // dengan maxAccuracyMeters custom yang lebih longgar, titik ke-2 ikut dihitung
  assert.equal(M.calculateMaxSpeedKmh(points, { maxAccuracyMeters: 500 }), 180);
});

test('calculateMovingTimeSec() — interval dgn accuracy buruk tidak dihitung moving', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: 0 }),
    pt({ timestamp: 10000, speed: 20, accuracy: 999 }), // speed tinggi tapi accuracy sangat buruk
  ];
  assert.equal(M.calculateMovingTimeSec(points), 0);
  assert.equal(M.calculateMovingTimeSec(points, { maxAccuracyMeters: 1000 }), 10);
});

// --- 8. duration -----------------------------------------------------------

test('calculateDurationSec() — selisih timestamp awal-akhir dalam detik', () => {
  const M = load();
  const points = [pt({ timestamp: 1000 }), pt({ timestamp: 5000 }), pt({ timestamp: 61000 })];
  assert.equal(M.calculateDurationSec(points), 60);
});

// --- 9. moving time ----------------------------------------------------------

test('calculateMovingTimeSec() — hanya interval dgn speed >= threshold yg dihitung', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: 0 }),        // 0 km/h
    pt({ timestamp: 10000, speed: 10 }),   // 36 km/h -> interval[0-10s] moving
    pt({ timestamp: 20000, speed: 0.2 }),  // 0.72 km/h -> interval[10-20s] TIDAK moving
    pt({ timestamp: 30000, speed: 5 }),    // 18 km/h -> interval[20-30s] moving
  ];
  assert.equal(M.calculateMovingTimeSec(points), 20);
});

test('calculateMovingTimeSec() — custom movingSpeedThresholdKmh via options', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: 0 }),
    pt({ timestamp: 10000, speed: 2 }), // 7.2 km/h
  ];
  assert.equal(M.calculateMovingTimeSec(points), 10); // default threshold 3 km/h -> moving
  assert.equal(M.calculateMovingTimeSec(points, { movingSpeedThresholdKmh: 10 }), 0); // ambang lebih tinggi -> tidak moving
});

// --- 10. stopped time --------------------------------------------------------

test('calculateStoppedTimeSec() — jumlah interval speed valid < threshold (bukan lagi "duration - moving")', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: 0 }),
    pt({ timestamp: 10000, speed: 10 }), // moving 10s
    pt({ timestamp: 20000, speed: 0 }),  // interval ke-2 stopped (speed titik akhir 0, VALID)
  ];
  assert.equal(M.calculateDurationSec(points), 20);
  assert.equal(M.calculateMovingTimeSec(points), 10);
  assert.equal(M.calculateStoppedTimeSec(points), 10);
  // kebetulan moving+stopped == duration di kasus ini krn 0 interval unknown
  // (lihat blok "CORRECTIVE PASS" di bawah utk kasus moving+stopped < duration).
});

// --- 11. zero moving time -----------------------------------------------------

test('calculateStoppedTimeSec() — moving time 0, seluruh speed valid & stopped -> stopped = seluruh duration, tidak negatif', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: 0 }), pt({ timestamp: 15000, speed: 0 })];
  assert.equal(M.calculateMovingTimeSec(points), 0);
  assert.equal(M.calculateStoppedTimeSec(points), 15);
  assert.ok(M.calculateStoppedTimeSec(points) >= 0);
});

// --- CORRECTIVE PASS — speed=0 (STOPPED) vs speed=null/invalid (UNKNOWN) ------
//
// Kontrak final: speed=0 valid -> STOPPED. speed=null/NaN/Infinity/negatif,
// atau accuracy gagal filter -> UNKNOWN, TIDAK dihitung moving MAUPUN
// stopped. Tidak ada API publik baru — unknown cukup "tidak masuk ke
// mana pun", dibuktikan lewat movingTime+stoppedTime <= duration.

test('speed = 0 (valid) => STOPPED, terhitung di calculateStoppedTimeSec', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: 1 }), pt({ timestamp: 10000, speed: 0 })]; // interval speed akhir 0
  assert.equal(M.calculateStoppedTimeSec(points), 10);
  assert.equal(M.calculateMovingTimeSec(points), 0);
});

test('speed = null => UNKNOWN, BUKAN stopped — tidak terhitung moving maupun stopped', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: 1 }), pt({ timestamp: 10000, speed: null })];
  assert.equal(M.calculateMovingTimeSec(points), 0);
  assert.equal(M.calculateStoppedTimeSec(points), 0); // BUKAN 10 — speed null tidak boleh dianggap speed 0
  // duration tetap penuh 10s, tapi moving+stopped < duration krn interval unknown
  assert.equal(M.calculateDurationSec(points), 10);
  assert.ok(M.calculateMovingTimeSec(points) + M.calculateStoppedTimeSec(points) <= M.calculateDurationSec(points));
});

test('speed invalid (NaN/Infinity/negatif) => UNKNOWN — NOT MOVING, NOT STOPPED', () => {
  const M = load();
  for (const badSpeed of [NaN, Infinity, -Infinity, -5]) {
    const points = [pt({ timestamp: 0, speed: 1 }), pt({ timestamp: 10000, speed: badSpeed })];
    assert.equal(M.calculateMovingTimeSec(points), 0, `moving harus 0 utk speed=${badSpeed}`);
    assert.equal(M.calculateStoppedTimeSec(points), 0, `stopped harus 0 utk speed=${badSpeed}`);
  }
});

test('accuracy gagal filter => UNKNOWN, BUKAN stopped (walau speed valid & rendah)', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: 1 }), pt({ timestamp: 10000, speed: 0, accuracy: 999 })];
  // speed=0 (idle) tapi accuracy titik itu jauh di atas maxAccuracyMeters default (50)
  assert.equal(M.calculateStoppedTimeSec(points), 0); // BUKAN 10 — data tidak cukup dipercaya
  assert.equal(M.calculateMovingTimeSec(points), 0);
  // dengan accuracy filter dilonggarkan, interval jadi bisa diklasifikasi stopped
  assert.equal(M.calculateStoppedTimeSec(points, { maxAccuracyMeters: 1000 }), 10);
});

test('movingSpeedThresholdKmh boundary — 2.9 STOPPED, 3.0 MOVING, 3.1 MOVING (default threshold 3)', () => {
  const M = load();
  const mps = (kmh) => kmh / 3.6;
  const below = [pt({ timestamp: 0, speed: 0 }), pt({ timestamp: 10000, speed: mps(2.9) })];
  const atThreshold = [pt({ timestamp: 0, speed: 0 }), pt({ timestamp: 10000, speed: mps(3.0) })];
  const above = [pt({ timestamp: 0, speed: 0 }), pt({ timestamp: 10000, speed: mps(3.1) })];

  assert.equal(M.calculateMovingTimeSec(below), 0);
  assert.equal(M.calculateStoppedTimeSec(below), 10);

  assert.equal(M.calculateMovingTimeSec(atThreshold), 10); // >= threshold -> moving
  assert.equal(M.calculateStoppedTimeSec(atThreshold), 0);

  assert.equal(M.calculateMovingTimeSec(above), 10);
  assert.equal(M.calculateStoppedTimeSec(above), 0);
});

test('movingTime + stoppedTime <= duration ketika ada campuran moving/stopped/unknown', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: 0 }),        // ref awal
    pt({ timestamp: 10000, speed: 10 }),   // interval 0-10s: moving (36 km/h)
    pt({ timestamp: 20000, speed: null }), // interval 10-20s: unknown (speed hilang)
    pt({ timestamp: 30000, speed: 0 }),    // interval 20-30s: stopped (speed valid 0)
  ];
  assert.equal(M.calculateDurationSec(points), 30);
  assert.equal(M.calculateMovingTimeSec(points), 10);
  assert.equal(M.calculateStoppedTimeSec(points), 10);
  // 10 (moving) + 10 (stopped) = 20 < 30 (duration) -- 10s interval unknown
  // TIDAK masuk ke mana pun, sesuai kontrak.
  assert.ok(M.calculateMovingTimeSec(points) + M.calculateStoppedTimeSec(points) < M.calculateDurationSec(points));
});

// --- 12. max speed -------------------------------------------------------------

test('calculateMaxSpeedKmh() — ambil sample tertinggi, bukan rata-rata', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: 2 }), pt({ timestamp: 1000, speed: 20 }), pt({ timestamp: 2000, speed: 5 })];
  assert.equal(M.calculateMaxSpeedKmh(points), 20 * 3.6);
});

// --- 13. average speed ------------------------------------------------------

test('calculateAverageSpeedKmh() — total distance valid / moving time (BUKAN rata-rata arithmetic speed)', () => {
  const M = load();
  // 2 titik ~1000m terpisah, speed konstan tinggi supaya seluruh interval "moving"
  const A = { latitude: -6.0, longitude: 106.0 };
  const B = { latitude: -6.009, longitude: 106.0 }; // ~1000m ke selatan
  const points = [
    pt({ timestamp: 0, ...A, speed: 20 }),
    pt({ timestamp: 60000, ...B, speed: 20 }), // 60 detik moving
  ];
  const distanceKm = M.calculateDistanceMeters(points) / 1000;
  const movingHours = M.calculateMovingTimeSec(points) / 3600;
  const expected = distanceKm / movingHours;
  assert.ok(Math.abs(M.calculateAverageSpeedKmh(points) - expected) < 1e-9);
  // BUKAN rata-rata arithmetic dari sample speed (yg juga kebetulan 20 m/s
  // di kasus ini) -- verifikasi lewat kasus speed tdk seragam di bawah.
});

test('calculateAverageSpeedKmh() — beda dari rata-rata arithmetic ketika speed sample tidak seragam', () => {
  const M = load();
  const A = { latitude: -6.0, longitude: 106.0 };
  const B = { latitude: -6.009, longitude: 106.0 };
  const points = [
    pt({ timestamp: 0, ...A, speed: 5 }),
    pt({ timestamp: 60000, ...B, speed: 30 }), // arithmetic mean speed sample = 17.5 m/s = 63 km/h
  ];
  const arithmeticMeanKmh = ((5 + 30) / 2) * 3.6;
  const actual = M.calculateAverageSpeedKmh(points);
  assert.notEqual(Math.round(actual), Math.round(arithmeticMeanKmh));
});

test('calculateAverageSpeedKmh() — moving time 0 -> return 0 (safe default)', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: 0 }), pt({ timestamp: 5000, speed: 0 })];
  assert.equal(M.calculateAverageSpeedKmh(points), 0);
});

// --- 14. null speed -------------------------------------------------------

test('speed null — dilewati (tidak merusak max/average), bukan dianggap 0', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, speed: null }),
    pt({ timestamp: 1000, speed: 30 }), // 108 km/h
    pt({ timestamp: 2000, speed: null }),
  ];
  assert.equal(M.calculateMaxSpeedKmh(points), 30 * 3.6);
});

test('semua speed null -> calculateMaxSpeedKmh 0, calculateMovingTimeSec 0 (bukan throw/NaN)', () => {
  const M = load();
  const points = [pt({ timestamp: 0, speed: null }), pt({ timestamp: 1000, speed: null })];
  assert.equal(M.calculateMaxSpeedKmh(points), 0);
  assert.equal(M.calculateMovingTimeSec(points), 0);
  assert.ok(!Number.isNaN(M.calculateMaxSpeedKmh(points)));
});

// --- 15. elevation gain -------------------------------------------------------

test('calculateElevationGainM() — hanya akumulasi delta altitude POSITIF', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, altitude: 100 }),
    pt({ timestamp: 1000, altitude: 110 }), // +10
    pt({ timestamp: 2000, altitude: 105 }), // -5 (bukan gain)
    pt({ timestamp: 3000, altitude: 120 }), // +15
  ];
  assert.equal(M.calculateElevationGainM(points), 25);
});

// --- 16. elevation loss ------------------------------------------------------

test('calculateElevationLossM() — akumulasi delta altitude NEGATIF sbg nilai positif', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, altitude: 100 }),
    pt({ timestamp: 1000, altitude: 90 }),  // -10
    pt({ timestamp: 2000, altitude: 95 }),  // +5 (bukan loss)
    pt({ timestamp: 3000, altitude: 80 }),  // -15
  ];
  assert.equal(M.calculateElevationLossM(points), 25);
});

// --- 17. null altitude ---------------------------------------------------------

test('altitude null dilewati — tidak dianggap elevation 0, tidak merusak gain/loss', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, altitude: 100 }),
    pt({ timestamp: 1000, altitude: null }), // dilewati sepenuhnya
    pt({ timestamp: 2000, altitude: 110 }),  // delta dihitung dari 100 (titik valid terakhir), bukan dari 0/null
  ];
  assert.equal(M.calculateElevationGainM(points), 10);
  assert.equal(M.calculateElevationLossM(points), 0);
});

// --- 18. timestamp out-of-order -------------------------------------------------

test('timestamp out-of-order — duration/moving tetap benar & tidak negatif (di-sort internal)', () => {
  const M = load();
  const points = [
    pt({ timestamp: 20000, speed: 10 }), // datang duluan di array, tapi timestamp paling besar
    pt({ timestamp: 0, speed: 0 }),
    pt({ timestamp: 10000, speed: 10 }),
  ];
  assert.equal(M.calculateDurationSec(points), 20);
  assert.ok(M.calculateDurationSec(points) >= 0);
  assert.ok(M.calculateMovingTimeSec(points) >= 0);
  assert.ok(M.calculateStoppedTimeSec(points) >= 0);
  // urutan kronologis sebenarnya: t0(speed0) -> t10s(speed10, moving) -> t20s(speed10, moving)
  assert.equal(M.calculateMovingTimeSec(points), 20);
});

// --- 19. input immutability ------------------------------------------------------

test('tidak ada fungsi yang mutate array/objek points input', () => {
  const M = load();
  const points = [
    pt({ timestamp: 20000, latitude: -6.0, longitude: 106.0, speed: 10, altitude: 5 }),
    pt({ timestamp: 0, latitude: -6.01, longitude: 106.0, speed: 0, altitude: 10 }),
    pt({ timestamp: 10000, latitude: -6.02, longitude: 106.0, speed: 5, altitude: 8 }),
  ];
  const original = structuredClone(points);

  M.calculateDistanceMeters(points);
  M.calculateTotalDistanceKm(points);
  M.calculateDurationSec(points);
  M.calculateMovingTimeSec(points, { movingSpeedThresholdKmh: 5 });
  M.calculateStoppedTimeSec(points, { maxAccuracyMeters: 20 });
  M.calculateAverageSpeedKmh(points);
  M.calculateMaxSpeedKmh(points);
  M.calculateElevationGainM(points);
  M.calculateElevationLossM(points);
  M.calculateBoundingBox(points);

  assert.deepEqual(points, original);
  assert.equal(Array.isArray(points), true);
  assert.equal(points.length, 3);
});

// --- 20. deterministic repeated execution -----------------------------------------

test('deterministic — pemanggilan berulang dgn input sama menghasilkan output identik', () => {
  const M = load();
  const points = [
    pt({ timestamp: 0, ...MONAS, speed: 5, altitude: 10 }),
    pt({ timestamp: 15000, ...HI, speed: 15, altitude: 25 }),
    pt({ timestamp: 30000, latitude: -6.2, longitude: 106.83, speed: 2, altitude: 15 }),
  ];
  const runOnce = () => ({
    distance: M.calculateDistanceMeters(points),
    km: M.calculateTotalDistanceKm(points),
    duration: M.calculateDurationSec(points),
    moving: M.calculateMovingTimeSec(points),
    stopped: M.calculateStoppedTimeSec(points),
    avgSpeed: M.calculateAverageSpeedKmh(points),
    maxSpeed: M.calculateMaxSpeedKmh(points),
    gain: M.calculateElevationGainM(points),
    loss: M.calculateElevationLossM(points),
    bbox: M.calculateBoundingBox(points),
  });
  const first = runOnce();
  const second = runOnce();
  const third = runOnce();
  assert.deepEqual(first, second);
  assert.deepEqual(second, third);
});

// --- extra: DEFAULT_OPTIONS exposed & tidak mutable dari luar --------------------

test('DEFAULT_OPTIONS — sesuai spec (movingSpeedThresholdKmh:3, maxAccuracyMeters:50) & frozen', () => {
  const M = load();
  assert.equal(M.DEFAULT_OPTIONS.movingSpeedThresholdKmh, 3);
  assert.equal(M.DEFAULT_OPTIONS.maxAccuracyMeters, 50);
  assert.throws(() => { 'use strict'; M.DEFAULT_OPTIONS.movingSpeedThresholdKmh = 999; }, /Cannot assign to read only property|not extensible/);
});
