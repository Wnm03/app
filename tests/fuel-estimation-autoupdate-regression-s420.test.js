'use strict';
// tests/fuel-estimation-autoupdate-regression-s420.test.js — Sesi 420
// (FUEL-AUTOSYNC-09, "Sesi 6" rencana "Fuel Estimation Auto-Update").
//
// TUJUAN (beda dari test per-sesi yang sudah ada di fuel-state-estimator/
// fuel-prediction-engine/fuel-cost-analytics/fuel-card.test.js): sesi-sesi
// s415-s419 masing-masing menguji SATU modul terisolasi (dependency lain
// di-mock). File ini adalah AUDIT ULANG MENYELURUH lintas Sesi 1-5 --
// memuat SEMUA modul asli (bukan mock) dalam satu sandbox & menjalankan
// skenario dunia-nyata end-to-end (full-tank fill -> partial fill -> BBM
// terpakai berdasarkan km -> decay confidence), lalu memverifikasi
// INVARIAN LINTAS MODUL yang tidak pernah dites bersamaan sebelumnya:
//
//   1. Konsistensi: FuelCard/_liveEstimate, FuelPredictionEngine/
//      _currentLiter, FuelInsightEngine/_currentFuelLiter HARUS selalu
//      balikin liter yang SAMA PERSIS utk kendaraan & titik waktu yang
//      sama (kelimanya 100% reuse FuelStateEstimator.estimateCurrentLiter()
//      yang sama) -- kalau salah satu konsumen "ketinggalan" sinkron, test
//      ini yang menangkapnya.
//   2. Konsistensi decayedConfidenceScore lintas FuelCard/_currentConfidence,
//      FuelPredictionEngine/_confidence, FuelCostAnalytics/_confidenceScore.
//   3. Rebasing referenceKm (s416): setelah syncFuelStateFromEstimator()
//      menulis titik acuan baru, panggilan estimateCurrentLiter()
//      BERIKUTNYA tidak boleh menghitung dobel akumulasi partial fill lama
//      (partialFillsCounted harus 0 utk log yang sudah "dibekukan").
//   4. Full-tank fill TETAP ground truth: menimpa drift akumulasi/decay
//      apa pun dari partial fill & km sebelumnya (reset referenceKm,
//      confidence balik ke 90).
//   5. Guard "0 breaking change": kalau FuelStateEstimator TIDAK dimuat
//      sama sekali (mis. bundle lama/parsial), SEMUA 5 konsumen (FuelCard x2
//      method, FuelPredictionEngine x2 method, FuelCostAnalytics,
//      FuelInsightEngine) fallback ke snapshot statis lama SERENTAK --
//      bukan cuma sebagian.
//   6. Backward-compat data lama (fuelState tanpa referenceKm, pra-s415):
//      estimationLimited:true lintas semua konsumen, liter/confidence
//      diteruskan apa adanya, 0 tebakan.
//   7. Guard km non-monoton (odometer reset) tidak memicu decay/konsumsi
//      palsu di manapun.
//
// Semua modul under test dimuat ASLI dari source (bukan copy-paste logic),
// pola sama harness dgn tests lain (lihat helpers/loadSource.js).
// FuelBarCorrection/FuelMaintenanceEngine/FuelStateHistory (di luar cakupan
// rencana Sesi 1-5 ini) di-mock minimal -- cukup utk jalur fallback,
// bukan ikut nge-test ulang modul itu sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const PROFILE = { tankCapacityLiter: 10, fuelBarCount: 8, reserveLiter: 1, tankShape: 'linear' };

// fuelEfficiency() mock deterministik: 40 km/L tetap, cukup data utk
// proyeksi bulanan (dipakai FuelPredictionEngine.predict{Monthly,Yearly}
// FuelUsage() & FuelCostAnalytics.projected*Cost()).
const EFF_OK = () => ({
  ok: true, kmPerLiter: 40, rpPerKm: 250, avgHarga: 10000,
  kmPerDay: 10, estMonthlyKm: 300, estMonthlyLiter: 7.5, estMonthlyCost: 75000,
});

function dateToISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// makeWorld() — satu "dunia" D + km kendaraan yang bisa "berjalan" (state.km
// mutable), dimuat lewat SEMUA modul asli rantai Sesi 1-5: FuelStorage ->
// FuelTankProfile -> FuelGaugeEngine -> FuelStateEstimator (Sesi 1) ->
// tx-bbm.js (recordBbmLog/syncFuelStateFrom* -- Sesi 2) ->
// FuelPredictionEngine (Sesi 4) -> FuelCostAnalytics (Sesi 5 confidence
// decay reuse) -> FuelInsightEngine (Sesi 4) -> FuelCard (Sesi 3 & 5).
function makeWorld({ withEstimator = true } = {}) {
  const D = { vehicles: [{ id: 'v1', fuelTankProfile: PROFILE }], bbmLogs: [] };
  const state = { km: 0 };
  let uidCounter = 0;
  const files = [
    'modules/vehicle/fuel-storage.js',
    'modules/vehicle/fuel-tank-profile.js',
    'modules/vehicle/fuel-gauge-engine.js',
  ];
  if (withEstimator) files.push('modules/vehicle/fuel-state-estimator.js');
  files.push(
    'modules/finance/tx-bbm.js',
    'modules/vehicle/fuel-prediction-engine.js',
    'modules/vehicle/fuel-cost-analytics.js',
    'modules/vehicle/fuel-insight-engine.js',
    'modules/vehicle/fuel-card.js',
  );
  const ctx = loadSource(files, {
    D,
    fuelEfficiency: EFF_OK,
    getVehicleKm: (vehicleId) => (vehicleId === 'v1' ? state.km : null),
    dateToISO,
    uid: () => 'bbm-' + (uidCounter++),
    escapeHtml: (s) => String(s),
    fmt: (n) => 'Rp ' + Math.round(n || 0),
    curVehicleId: 'v1',
    // FuelBarCorrection -- HANYA dipakai jalur fallback FuelCard/_liveEstimate()
    // saat FuelStateEstimator tidak dimuat (skenario 5). Mock minimal, pola
    // _currentEstimate() asli (baca fuelState.currentFuelLiter apa adanya).
    FuelBarCorrection: {
      _currentEstimate(vehicleId) {
        const veh = D.vehicles.find((v) => v.id === vehicleId);
        if (veh && veh.fuelState && typeof veh.fuelState.currentFuelLiter === 'number') {
          return { liter: veh.fuelState.currentFuelLiter, source: 'stored' };
        }
        return null;
      },
    },
  }, [
    'FuelStorage', 'FuelTankProfile', 'FuelGaugeEngine',
    ...(withEstimator ? ['FuelStateEstimator'] : []),
    'FuelPredictionEngine', 'FuelCostAnalytics', 'FuelInsightEngine', 'FuelCard',
    'recordBbmLog',
  ]);
  return { ctx, D, state };
}

function driveTo(state, km) { state.km = km; }

// --- Skenario A: full lifecycle Sesi 1-5, invarian konsistensi lintas modul --

test('REGRESI lintas-sesi -- full-tank fill (Sesi ground truth) menulis baseline konsisten', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });

  const veh = D.vehicles[0];
  assert.equal(veh.fuelState.currentFuelLiter, 10);
  assert.equal(veh.fuelState.confidenceScore, 90);
  assert.equal(veh.fuelState.referenceKm, 1000);
  assert.equal(veh.fuelState.estimatedSource, 'auto-bbm-log-full');
});

test('REGRESI lintas-sesi -- setelah jalan 200km TANPA BBM log baru, SEMUA konsumen (Card/Prediction/Insight) balikin liter & confidence yang SAMA PERSIS', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });

  driveTo(state, 1200); // deltaKm 200, konsumsi 200/40 = 5L -> liter 10-5=5
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.liter, 5);
  // floor(200/15) = 13 -> decayedConfidenceScore = 90 - 13 = 77
  assert.equal(est.decayedConfidenceScore, 77);

  const fuelState = D.vehicles[0].fuelState;
  assert.equal(ctx.FuelCard._liveEstimate('v1').liter, 5);
  assert.equal(ctx.FuelCard._currentConfidence('v1'), 77);
  assert.equal(ctx.FuelPredictionEngine._currentLiter('v1', fuelState), 5);
  assert.equal(ctx.FuelPredictionEngine._confidence('v1', fuelState), 77);
  assert.equal(ctx.FuelCostAnalytics._confidenceScore('v1'), 77);
  assert.equal(ctx.FuelInsightEngine._currentFuelLiter('v1'), 5);

  const pred = ctx.FuelPredictionEngine.predictRemainingDistance('v1');
  assert.equal(pred.ok, true);
  assert.equal(pred.currentFuelLiter, 5);
  assert.equal(pred.confidenceScore, 77);

  const proj = ctx.FuelCostAnalytics.projectedMonthlyCost('v1');
  assert.equal(proj.ok, true);
  assert.equal(proj.confidenceScore, 77);
});

test('REGRESI lintas-sesi -- partial fill (Sesi 2) REBASE referenceKm, panggilan berikutnya TIDAK dobel-hitung log yang sudah dibekukan', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });

  driveTo(state, 1250);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-05', km: 1250, liter: 2, cost: 20000, fullTank: false });

  // syncFuelStateFromEstimator: baseLiter 10, deltaKm 250 (konsumsi 6.25L),
  // partial fill YANG BARUSAN masuk (km 1250 > referenceKm lama 1000) ikut
  // dihitung sbg addedLiter -> liter = 10 + 2 - 6.25 = 5.75.
  const fs1 = D.vehicles[0].fuelState;
  assert.equal(fs1.currentFuelLiter, 5.75);
  assert.equal(fs1.confidenceScore, 70);
  assert.equal(fs1.estimatedSource, 'auto-bbm-log');
  // REBASE -- titik acuan baru HARUS jadi km SAAT sync ini terjadi, bukan
  // tetap 1000 (kalau tetap 1000, log partial di atas akan kehitung LAGI
  // di estimateCurrentLiter() berikutnya -- double counting).
  assert.equal(fs1.referenceKm, 1250);

  // Panggil estimator lagi TANPA jalan/BBM baru sama sekali (km tetap 1250):
  // partialFillsCounted HARUS 0 (log km=1250 sekarang == referenceKm baru,
  // filter strict > menolaknya -- rebase bekerja).
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.partialFillsCounted, 0);
  assert.equal(est.liter, 5.75); // TIDAK dobel-tambah 2L lagi
  assert.equal(est.deltaKm, 0);
});

test('REGRESI lintas-sesi -- decay confidence berlanjut dari baseline BARU (bukan dari full-tank lama) setelah rebase partial fill', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });
  driveTo(state, 1250);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-05', km: 1250, liter: 2, cost: 20000, fullTank: false });

  driveTo(state, 1400); // deltaKm 150 dari referenceKm BARU (1250), bukan dari 1000
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.deltaKm, 150);
  assert.equal(est.partialFillsCounted, 0);
  // consumedLiter = 150/40 = 3.75 -> liter = 5.75 - 3.75 = 2
  assert.equal(est.liter, 2);
  // base confidence SEKARANG 70 (dari sync partial fill, bukan 90 full-tank
  // lama) -- floor(150/15)=10 -> decayed = 70-10 = 60.
  assert.equal(est.decayedConfidenceScore, 60);

  const fuelState = D.vehicles[0].fuelState;
  assert.equal(ctx.FuelCard._currentConfidence('v1'), 60);
  assert.equal(ctx.FuelPredictionEngine._confidence('v1', fuelState), 60);
  assert.equal(ctx.FuelCostAnalytics._confidenceScore('v1'), 60);
  // 60 masih >= LOW_CONFIDENCE_THRESHOLD (50) -> hint BELUM muncul.
  assert.equal(ctx.FuelCard._lowConfidenceHint('v1').ok, false);
});

test('REGRESI lintas-sesi -- decay cukup jauh memicu low-confidence hint (Sesi 5 terhubung ke UI hint TASK-145 yang sudah ada)', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });
  driveTo(state, 1250);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-05', km: 1250, liter: 2, cost: 20000, fullTank: false });

  driveTo(state, 1750); // deltaKm 500 dari referenceKm 1250 -> floor(500/15)=33 -> 70-33=37 (< 50)
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.decayedConfidenceScore, 37);
  assert.equal(ctx.FuelCard._currentConfidence('v1'), 37);
  assert.equal(ctx.FuelCard._lowConfidenceHint('v1').ok, true);

  // Liter juga clamp ke 0 (konsumsi 500/40=12.5L > sisa 5.75L) & gauge tetap
  // render (bukan blank) walau sudah 0.
  assert.equal(est.liter, 0);
  assert.equal(est.clamped, true);
  const gauge = ctx.FuelCard._gaugeHtml('v1');
  assert.ok(gauge.length > 0);
});

test('REGRESI lintas-sesi -- decay dilantai di MIN_CONFIDENCE_SCORE (30) walau deltaKm ekstrem, konsisten di semua konsumen', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });

  driveTo(state, 1000000);
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.decayedConfidenceScore, ctx.FuelStateEstimator.MIN_CONFIDENCE_SCORE);
  const fuelState = D.vehicles[0].fuelState;
  assert.equal(ctx.FuelCard._currentConfidence('v1'), 30);
  assert.equal(ctx.FuelPredictionEngine._confidence('v1', fuelState), 30);
  assert.equal(ctx.FuelCostAnalytics._confidenceScore('v1'), 30);
});

test('REGRESI lintas-sesi -- full-tank fill BERIKUTNYA adalah ground truth: menimpa drift decay/partial fill sebelumnya sepenuhnya', () => {
  const { ctx, D, state } = makeWorld();
  driveTo(state, 1000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 1000, liter: 10, cost: 100000, fullTank: true });
  driveTo(state, 1250);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-05', km: 1250, liter: 2, cost: 20000, fullTank: false });
  driveTo(state, 1750); // confidence sudah decay ke 37 (lihat test di atas)

  // User isi FULL TANK lagi -- reset total.
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-10', km: 1750, liter: 10, cost: 100000, fullTank: true });
  const fs = D.vehicles[0].fuelState;
  assert.equal(fs.currentFuelLiter, 10);
  assert.equal(fs.confidenceScore, 90);
  assert.equal(fs.referenceKm, 1750);
  assert.equal(fs.estimatedSource, 'auto-bbm-log-full');

  // Estimator berikutnya, TANPA jalan, HARUS balik ke baseline baru (bukan
  // melanjutkan decay 37 dari sebelumnya).
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.liter, 10);
  assert.equal(est.decayedConfidenceScore, 90);
});

// --- Skenario B: guard km non-monoton lintas modul --------------------------

test('REGRESI lintas-sesi -- odometer reset (km mundur) TIDAK memicu decay/konsumsi palsu di manapun', () => {
  const { ctx, D, state } = makeWorld();
  // Baseline dulu (full-tank) -- syncFuelStateFromEstimator (partial fill)
  // butuh titik acuan yg SUDAH ada, tidak bisa jadi titik acuan pertama.
  driveTo(state, 4900);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-07-30', km: 4900, liter: 10, cost: 100000, fullTank: true });
  driveTo(state, 5000);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-01', km: 5000, liter: 8, cost: 80000, fullTank: false });
  const fsAfterSync = D.vehicles[0].fuelState;
  assert.equal(fsAfterSync.referenceKm, 5000);

  driveTo(state, 100); // odometer "mundur" (reset/ganti unit/salah input)
  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.kmClamped, true);
  assert.equal(est.deltaKm, 0);
  assert.equal(est.consumedLiter, 0);
  // decayedConfidenceScore TIDAK turun (deltaKm 0, bukan negatif)
  assert.equal(est.decayedConfidenceScore, est.confidenceScore);

  const fuelState = D.vehicles[0].fuelState;
  assert.equal(ctx.FuelPredictionEngine._currentLiter('v1', fuelState), est.liter);
  assert.equal(ctx.FuelCard._liveEstimate('v1').liter, est.liter);
});

// --- Skenario C: backward-compat data lama (pra-s415, tanpa referenceKm) ----

test('REGRESI lintas-sesi -- fuelState LAMA tanpa referenceKm: estimationLimited di semua konsumen, 0 tebakan, liter/confidence apa adanya', () => {
  const { ctx, D } = makeWorld();
  // Simulasi data yang ditulis SEBELUM sesi s415 ada (tidak ada referenceKm).
  D.vehicles[0].fuelState = { currentFuelLiter: 4, estimatedSource: 'manual-bar-correction', confidenceScore: 100 };

  const est = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.estimationLimited, true);
  assert.equal(est.liter, 4);
  assert.equal(est.decayedConfidenceScore, 100);

  const fuelState = D.vehicles[0].fuelState;
  assert.equal(ctx.FuelCard._liveEstimate('v1').liter, 4);
  assert.equal(ctx.FuelCard._liveEstimate('v1').estimationLimited, true);
  assert.equal(ctx.FuelCard._currentConfidence('v1'), 100);
  assert.equal(ctx.FuelPredictionEngine._currentLiter('v1', fuelState), 4);
  assert.equal(ctx.FuelPredictionEngine._confidence('v1', fuelState), 100);
  assert.equal(ctx.FuelCostAnalytics._confidenceScore('v1'), 100);
  assert.equal(ctx.FuelInsightEngine._currentFuelLiter('v1'), 4);
});

// --- Skenario D: guard "0 breaking change" -- FuelStateEstimator TIDAK dimuat --

test('REGRESI lintas-sesi -- FuelStateEstimator TIDAK dimuat: SEMUA 5 konsumen fallback SERENTAK ke snapshot statis lama (pola pra-Sesi 1-5)', () => {
  const { ctx, D } = makeWorld({ withEstimator: false });
  assert.equal(typeof ctx.FuelStateEstimator, 'undefined');
  D.vehicles[0].fuelState = {
    currentFuelLiter: 6, correctedAt: '2026-08-01T00:00:00.000Z',
    estimatedSource: 'manual-bar-correction', confidenceScore: 85, referenceKm: 1000,
  };
  const fuelState = D.vehicles[0].fuelState;

  // FuelCard -- 2 method, keduanya harus fallback.
  assert.equal(ctx.FuelCard._liveEstimate('v1').liter, 6);
  assert.equal(ctx.FuelCard._liveEstimate('v1').source, 'stored'); // dari FuelBarCorrection mock
  assert.equal(ctx.FuelCard._currentConfidence('v1'), 85);

  // FuelPredictionEngine -- 2 method.
  assert.equal(ctx.FuelPredictionEngine._currentLiter('v1', fuelState), 6);
  assert.equal(ctx.FuelPredictionEngine._confidence('v1', fuelState), 85);

  // FuelCostAnalytics.
  assert.equal(ctx.FuelCostAnalytics._confidenceScore('v1'), 85);

  // FuelInsightEngine.
  assert.equal(ctx.FuelInsightEngine._currentFuelLiter('v1'), 6);

  // recordBbmLog() (Sesi 2 SSOT hook) juga TIDAK BOLEH crash/gagal gara-gara
  // FuelStateEstimator absen -- syncFuelStateFromEstimator() harus no-op diam.
  const before = JSON.stringify(D.vehicles[0].fuelState);
  assert.doesNotThrow(() => {
    ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-08-02', km: 1050, liter: 1, cost: 10000, fullTank: false });
  });
  // fuelState TIDAK berubah gara-gara sync opsional yang tidak bisa jalan
  // (estimator absen -> syncFuelStateFromEstimator no-op, pola guard s416).
  assert.equal(JSON.stringify(D.vehicles[0].fuelState), before);
});

test('REGRESI lintas-sesi -- FuelStateEstimator TIDAK dimuat, fuelState belum pernah ditulis sama sekali -> semua konsumen ok:false/null secara konsisten (bukan crash)', () => {
  const { ctx } = makeWorld({ withEstimator: false });
  assert.equal(ctx.FuelCard._liveEstimate('v1'), null);
  assert.equal(ctx.FuelCard._currentConfidence('v1'), null);
  assert.equal(ctx.FuelCard._lowConfidenceHint('v1').ok, false);
  assert.equal(ctx.FuelCostAnalytics._confidenceScore('v1'), null);
  assert.equal(ctx.FuelInsightEngine._currentFuelLiter('v1'), null);
  assert.equal(ctx.FuelPredictionEngine.predictRemainingDistance('v1').ok, false);
});

// --- Skenario E: kendaraan berbeda tidak saling mempengaruhi ----------------

test('REGRESI lintas-sesi -- 2 kendaraan independen: partial fill/decay kendaraan lain TIDAK bocor ke kendaraan ini', () => {
  const D = { vehicles: [
    { id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 8, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } },
    { id: 'v2', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 3, referenceKm: 500, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } },
  ], bbmLogs: [
    { vehicleId: 'v2', date: '2026-08-01', km: 600, liter: 9, cost: 90000, fullTank: false }, // partial fill milik v2
  ] };
  const kmByVehicle = { v1: 1000, v2: 700 };
  const ctx = loadSource([
    'modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/fuel-gauge-engine.js',
    'modules/vehicle/fuel-state-estimator.js', 'modules/vehicle/fuel-card.js',
  ], {
    D, fuelEfficiency: EFF_OK, getVehicleKm: (id) => kmByVehicle[id], escapeHtml: (s) => String(s), fmt: (n) => String(n),
  }, ['FuelStateEstimator', 'FuelCard']);

  const est1 = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  // v1 tidak jalan sama sekali (deltaKm 0) & tidak ada log parsial v1 ->
  // liter tetap 8 apa adanya, tidak terpengaruh log/km v2.
  assert.equal(est1.deltaKm, 0);
  assert.equal(est1.partialFillsCounted, 0);
  assert.equal(est1.liter, 8);
  assert.equal(ctx.FuelCard._liveEstimate('v1').liter, 8);
});
