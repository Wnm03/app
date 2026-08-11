'use strict';
// tests/fuel-card.test.js — cakupan modules/vehicle/fuel-card.js (TASK-141,
// Fuel Intelligence Card). FuelCard hanya presenter (baca FuelIntelligenceEngine
// apa adanya, susun 1 kartu ringkas) -- render() butuh document.getElementById,
// jadi dites lewat fake DOM minimal (bukan jsdom, cukup stub getElementById
// yg balikin elemen dgn innerHTML/style/textContent settable), pola sama
// prinsipnya dgn catatan "DOM-heavy -> fakeDom" di helpers/loadSource.js.
//
// KONSOLIDASI (Sesi 156d): coverage section "Fuel Briefing" (dulu di
// tests/vehicle-daily-brief.test.js, dipilih FuelFleetSelector.
// selectVehicle()) DIPINDAH ke sini — section-nya sendiri sudah pindah ke
// FuelCard._briefingHtml(), reuse FuelInsightEngine.getSummary(vehicleId)
// (lihat blok test "--- Sesi 156d" di bawah).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => { els[id] = { innerHTML: '', style: {}, textContent: '' }; });
  return {
    doc: { getElementById: (id) => els[id] || null },
    els,
  };
}

function makeCtx({
  document, FuelIntelligenceEngine, FuelInsightEngine, curVehicleId, escapeHtml, fmt, D,
  FuelTankProfile, FuelGaugeEngine, FuelBarCorrection, FuelStateEstimator, showAlertModal,
} = {}) {
  return loadSource(
    ['modules/vehicle/fuel-card.js'],
    {
      document,
      FuelIntelligenceEngine,
      FuelInsightEngine,
      curVehicleId,
      escapeHtml: escapeHtml || ((s) => String(s)),
      fmt: fmt || ((n) => 'Rp ' + Math.round(n || 0)),
      D,
      FuelTankProfile,
      FuelGaugeEngine,
      FuelBarCorrection,
      FuelStateEstimator,
      showAlertModal,
    },
    ['FuelCard'],
  );
}

test('render() — wrap disembunyikan kalau tidak ada curVehicleId', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({ document: doc, FuelIntelligenceEngine: {}, curVehicleId: null });
  ctx.FuelCard.render();
  assert.equal(els.fuelIntelWrap.style.display, 'none');
});

test('render() — wrap disembunyikan kalau vehicleInsight() {ok:false}', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => ({ ok: false }) },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  assert.equal(els.fuelIntelWrap.style.display, 'none');
});

test('render() — kendaraan valid, overdue reminder -> status merah, wrap tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true,
    vehicleId: 'v1',
    name: 'Vario',
    emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 },
    reminders: [{ severity: 'overdue', message: 'Sudah lewat estimasi jangkauan BBM' }],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  assert.equal(els.fuelIntelWrap.style.display, '');
  assert.match(els.fuelIntelBody.innerHTML, /Vario/);
  assert.match(els.fuelIntelBody.innerHTML, /class="u-fs12 red"/);
  assert.match(els.fuelIntelBody.innerHTML, /Sudah lewat estimasi jangkauan BBM/);
});

test('render() — tanpa reminder aktif & efisiensi tersedia -> status normal, tanpa class warna', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true,
    vehicleId: 'v1',
    name: 'Vario',
    emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 },
    reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /Efisiensi BBM terpantau normal/);
  assert.match(els.fuelIntelBody.innerHTML, /class="u-fs12"/);
});

test('render() — data efisiensi belum cukup -> pesan ajakan catat BBM', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = { ok: true, vehicleId: 'v1', name: 'Vario', current: null, reminders: [] };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /Catat isi BBM/);
});

// --- TASK-145 (Fuel Intelligence Integration) -----------------------------

test('render() — tombol "⚙️ Koreksi" tampil & memanggil FuelBarCorrection.open(vehicleId)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /⚙️ Koreksi/);
  assert.match(els.fuelIntelBody.innerHTML, /data-action="FuelBarCorrection\.open"/);
  assert.match(els.fuelIntelBody.innerHTML, /data-args="\[.*v1.*\]"/);
  assert.match(els.fuelIntelBody.innerHTML, /aria-label="Koreksi estimasi BBM dengan speedometer"/);
});

test('render() — tombol "Lihat Detail", "Koreksi" & "Atur Tangki" tetap reuse class button yang sudah ada (0 class baru)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  // 3 tombol: Lihat Detail, Koreksi, & Atur Tangki (FuelTankProfileUI.open,
  // ditambahkan setelah sesi156d) — semua reuse class yang sama, 0 class baru.
  assert.equal((html.match(/class="btn btn-ghost btn-sm"/g) || []).length, 3);
  assert.match(html, /class="btn-row3"/);
});

test('render() — confidenceScore rendah (< 50) -> tampil rekomendasi pasif sinkronisasi, bukan dialog', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 30 } }] },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /Estimasi mulai kurang akurat/);
  assert.match(els.fuelIntelBody.innerHTML, /Disarankan sinkronkan dengan speedometer/);
});

test('render() — confidenceScore tinggi (>= 50) -> tidak tampil rekomendasi', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /Estimasi mulai kurang akurat/);
});

test('render() — belum ada fuelState sama sekali -> tidak tampil rekomendasi (tidak ada skor utk dibandingkan)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1' }] },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /Estimasi mulai kurang akurat/);
});

// --- SESI 5 (FUEL-AUTOSYNC-08): _lowConfidenceHint() reuse decayedConfidenceScore

test('render() — FuelStateEstimator ok:true, decayedConfidenceScore < 50 -> tampil rekomendasi walau confidenceScore mentah masih tinggi', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 3, decayedConfidenceScore: 40 }) },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /Estimasi mulai kurang akurat/);
});

test('render() — FuelStateEstimator ok:false -> _lowConfidenceHint() fallback ke confidenceScore mentah (pola lama)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const insight = {
    ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
    current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
  };
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => insight },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 30 } }] },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'belum ada titik acuan' }) },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /Estimasi mulai kurang akurat/);
});

// --- Sesi FUEL-AUTOSYNC (badge sumber estimasi) ---------------------------

test('render() — estimatedSource manual -> badge "🔧 Manual" + umur estimasi', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: {
          estimatedSource: 'manual-bar-correction',
          correctedAt: new Date().toISOString(),
        },
      }],
    },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /🔧 Manual/);
  assert.match(els.fuelIntelBody.innerHTML, /hari ini/);
});

test('render() — estimatedSource auto-bbm-log-full -> badge "⛽ Auto dari BBM log"', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: { estimatedSource: 'auto-bbm-log-full', correctedAt: threeDaysAgo },
      }],
    },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /⛽ Auto dari BBM log/);
  assert.match(els.fuelIntelBody.innerHTML, /3 hari lalu/);
});

test('render() — estimatedSource tidak dikenali -> fallback badge generik "📉 Estimasi"', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: { estimatedSource: 'sumber-masa-depan', correctedAt: new Date().toISOString() },
      }],
    },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /📉 Estimasi/);
});

test('render() — belum ada fuelState sama sekali -> tidak ada badge sumber', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1' }] },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /🔧 Manual|⛽ Auto dari BBM log|📉 Estimasi/);
});

test('render() — fuelState ada tapi tanpa estimatedSource -> tidak ada badge sumber', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 80 } }] },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /🔧 Manual|⛽ Auto dari BBM log|📉 Estimasi/);
});

test('render() — correctedAt tidak valid -> tidak ada badge sumber (bukan "NaN hari lalu")', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: { estimatedSource: 'manual-bar-correction', correctedAt: 'bukan-tanggal' },
      }],
    },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /NaN/);
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /🔧 Manual/);
});

test('_daysSince() — correctedAt di masa depan (clock skew) -> clamp ke 0, bukan minus', () => {
  const ctx = makeCtx({ D: {} });
  const futureIso = new Date(Date.now() + 999999).toISOString();
  assert.equal(ctx.FuelCard._daysSince(futureIso), 0);
});

// --- Sesi 156d (konsolidasi "Fuel Briefing" -> Fuel Intelligence Card) ----
// Dulu ada di tests/vehicle-daily-brief.test.js sbg card terpisah
// (VehicleDailyBrief + FuelFleetSelector). Sekarang FuelCard._briefingHtml()
// reuse FuelInsightEngine.getSummary(insight.vehicleId) LANGSUNG (bukan
// FuelFleetSelector, krn kendaraannya sudah scoped ke curVehicleId).

const BASE_INSIGHT = {
  ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️',
  current: { ok: true, kmPerLiter: 42, rpPerKm: 238 }, reminders: [],
};

function makeFuelSummary(overrides) {
  return Object.assign({
    ok: true,
    healthScore: 80,
    fuel: { remainingLiter: 5.5, fuelPercent: 40 },
    remainingDistance: 120,
    monthlyCost: 150000,
    maintenanceRisk: 'sedang',
    highestInsight: {
      title: 'BBM mendekati cadangan',
      description: 'Sisa BBM di bawah ambang reserve.',
      recommendation: 'Segera isi BBM di SPBU terdekat.',
    },
  }, overrides);
}

test('render() — Fuel Briefing tampil di dalam card yang sama (bukan card terpisah)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    FuelInsightEngine: { getSummary: () => makeFuelSummary() },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /Fuel Intelligence/);
  assert.match(html, /📋 Fuel Briefing/);
  assert.match(html, /Fuel Health 80\/100/);
  assert.match(html, /Sisa BBM 5\.5 L \(40%\)/);
  assert.match(html, /Estimasi jarak tersisa 120 km/);
  assert.match(html, /Risiko perawatan sedang/);
});

test('render() — insight title/description & recommendation Fuel Briefing tampil apa adanya', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    FuelInsightEngine: { getSummary: () => makeFuelSummary() },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /BBM mendekati cadangan: Sisa BBM di bawah ambang reserve/);
  assert.match(html, /Segera isi BBM di SPBU terdekat\./);
});

test('render() — field kosong (fuel/remainingDistance/monthlyCost null) -> placeholder "—", tidak error', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    FuelInsightEngine: {
      getSummary: () => makeFuelSummary({ healthScore: null, fuel: null, remainingDistance: null, monthlyCost: null, maintenanceRisk: null }),
    },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /Fuel Health —/);
  assert.match(html, /Sisa BBM —/);
});

test('render() — FuelInsightEngine belum dimuat -> Fuel Briefing dilewati, card lain tetap tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    FuelInsightEngine: undefined,
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /Fuel Intelligence/);
  assert.doesNotMatch(html, /Fuel Briefing/);
});

test('render() — FuelInsightEngine.getSummary() {ok:false}/throw -> Fuel Briefing dilewati, tidak menggagalkan render', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    FuelInsightEngine: { getSummary: () => { throw new Error('boom'); } },
    curVehicleId: 'v1',
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /Fuel Intelligence/);
  assert.doesNotMatch(html, /Fuel Briefing/);
});

// --- SESI 416-lanjutan (FUEL-AUTOSYNC-06, "Sesi 3": auto-refresh gauge
// berbasis km tanpa nunggu BBM log baru) --------------------------------
// _liveEstimate() & _gaugeHtml() sekarang REUSE FuelStateEstimator.
// estimateCurrentLiter() (s415) sbg sumber utama, fallback ke snapshot
// beku lama (FuelBarCorrection._currentEstimate()) kalau estimator belum
// dimuat/belum ada titik acuan.

function makeTankProfile() {
  return { tankCapacityLiter: 10, fuelBarCount: 10, reserveLiter: 2 };
}

test('_liveEstimate() — FuelStateEstimator ok:true -> pakai liter estimator (bukan snapshot beku)', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4.2, estimationLimited: false }),
    },
    FuelBarCorrection: { _currentEstimate: () => ({ liter: 9.9, source: 'stored' }) },
  });
  const est = ctx.FuelCard._liveEstimate('v1');
  assert.equal(est.liter, 4.2);
  assert.equal(est.source, 'estimator');
  assert.equal(est.estimationLimited, false);
});

test('_liveEstimate() — FuelStateEstimator ok:false (belum ada titik acuan) -> fallback ke FuelBarCorrection', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: false, reason: 'Data BBM saat ini belum ada' }),
    },
    FuelBarCorrection: { _currentEstimate: () => ({ liter: 6.5, source: 'stored' }) },
  });
  const est = ctx.FuelCard._liveEstimate('v1');
  assert.deepEqual(est, { liter: 6.5, source: 'stored' });
});

test('_liveEstimate() — FuelStateEstimator belum dimuat -> fallback ke FuelBarCorrection (pola lama)', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: undefined,
    FuelBarCorrection: { _currentEstimate: () => ({ liter: 3.3, source: 'bbm-log-full' }) },
  });
  const est = ctx.FuelCard._liveEstimate('v1');
  assert.deepEqual(est, { liter: 3.3, source: 'bbm-log-full' });
});

test('_liveEstimate() — 0 sumber estimasi tersedia sama sekali -> null (bukan error)', () => {
  const ctx = makeCtx({ D: {}, FuelStateEstimator: undefined, FuelBarCorrection: undefined });
  assert.equal(ctx.FuelCard._liveEstimate('v1'), null);
});

test('_gaugeHtml() — auto-refresh: gauge pakai liter dari FuelStateEstimator (bukan snapshot fuelState beku)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const literCalls = [];
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {},
    FuelTankProfile: { get: () => makeTankProfile() },
    FuelGaugeEngine: {
      calculateFuelBar: (vid, liter) => {
        literCalls.push(liter);
        return { ok: true, bar: liter }; // 1 liter = 1 bar (tank 10L/10bar)
      },
    },
    // Snapshot lama BEDA angka drpd estimator -- kalau gauge masih pakai
    // ini, test akan gagal (bukti gauge sekarang "hidup"/auto-refresh).
    FuelBarCorrection: { _currentEstimate: () => ({ liter: 9, source: 'stored' }) },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, estimationLimited: false }),
    },
  });
  ctx.FuelCard.render();
  // Panggilan PERTAMA calculateFuelBar() adalah utk posisi liter saat ini
  // (est.liter dari estimator) -- panggilan kedua utk reserveLiter profil,
  // beda hal, tidak dites di sini.
  assert.equal(literCalls[0], 4);
  assert.match(els.fuelIntelBody.innerHTML, /fuelcard-gauge/);
});

test('_gaugeHtml() — FuelStateEstimator belum ada titik acuan -> gauge tetap render pakai fallback snapshot', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {},
    FuelTankProfile: { get: () => makeTankProfile() },
    FuelGaugeEngine: { calculateFuelBar: (vid, liter) => ({ ok: true, bar: liter }) },
    FuelBarCorrection: { _currentEstimate: () => ({ liter: 6, source: 'stored' }) },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'belum ada titik acuan' }) },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /fuelcard-gauge/);
});

test('_gaugeHtml() — 0 sumber estimasi (FuelStateEstimator & FuelBarCorrection tidak ada) -> gauge tidak render', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {},
    FuelTankProfile: { get: () => makeTankProfile() },
    FuelGaugeEngine: { calculateFuelBar: (vid, liter) => ({ ok: true, bar: liter }) },
    FuelBarCorrection: undefined,
    FuelStateEstimator: undefined,
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /fuelcard-gauge/);
});

// --- SESI 421 (2 sisa "saran tambahan" dari s420) --------------------------
// 1. _kmClampedHint()/nudge UI proaktif utk guard km non-monoton (kmClamped)
// 2. _sourceBadgeHtml() tambah "Skor N/100" eksplisit (decayedConfidenceScore)

test('_kmClampedHint() — FuelStateEstimator ok:true & kmClamped:true -> {ok:true}', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: true }) },
  });
  assert.equal(ctx.FuelCard._kmClampedHint('v1').ok, true);
});

test('_kmClampedHint() — kmClamped:false -> {ok:false}', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: false }) },
  });
  assert.equal(ctx.FuelCard._kmClampedHint('v1').ok, false);
});

test('_kmClampedHint() — estimator ok:false -> {ok:false} (bukan error)', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'belum ada titik acuan' }) },
  });
  assert.equal(ctx.FuelCard._kmClampedHint('v1').ok, false);
});

test('_kmClampedHint() — FuelStateEstimator belum dimuat -> {ok:false} (bukan error)', () => {
  const ctx = makeCtx({ D: {}, FuelStateEstimator: undefined });
  assert.equal(ctx.FuelCard._kmClampedHint('v1').ok, false);
});

test('render() — kmClamped:true -> nudge "cek odometer" tampil, terpisah dari pesan low-confidence', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: true, decayedConfidenceScore: 100 }),
    },
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /Estimasi mulai kurang akurat, cek odometer/);
  assert.doesNotMatch(html, /Disarankan sinkronkan dengan speedometer/);
});

test('render() — kmClamped:false & confidence tinggi -> tidak ada nudge apa pun', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: false, decayedConfidenceScore: 100 }),
    },
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.doesNotMatch(html, /cek odometer/);
  assert.doesNotMatch(html, /Disarankan sinkronkan dengan speedometer/);
});

test('render() — kmClamped:true DAN low-confidence sekaligus -> kedua nudge tampil bersamaan', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: true, decayedConfidenceScore: 20 }),
    },
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /cek odometer/);
  assert.match(html, /Disarankan sinkronkan dengan speedometer/);
});

test('_sourceBadgeHtml() via render() — decayedConfidenceScore tersedia -> badge tambah "Skor N/100"', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: { estimatedSource: 'manual-bar-correction', correctedAt: new Date().toISOString(), confidenceScore: 90 },
      }],
    },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, decayedConfidenceScore: 62 }) },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /🔧 Manual/);
  assert.match(els.fuelIntelBody.innerHTML, /Skor 62\/100/);
});

test('_sourceBadgeHtml() via render() — FuelStateEstimator belum dimuat -> fallback ke confidenceScore mentah utk skor badge', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: { estimatedSource: 'auto-bbm-log-full', correctedAt: new Date().toISOString(), confidenceScore: 77 },
      }],
    },
    FuelStateEstimator: undefined,
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /Skor 77\/100/);
});

test('_sourceBadgeHtml() via render() — tidak ada skor sama sekali -> badge tetap tampil tanpa bagian "Skor" (diam-diam dihilangkan)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: {
      vehicles: [{
        id: 'v1',
        fuelState: { estimatedSource: 'manual-bar-correction', correctedAt: new Date().toISOString() },
      }],
    },
    FuelStateEstimator: undefined,
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /🔧 Manual/);
  assert.doesNotMatch(html, /Skor/);
});

// --- SESI 422 (item terakhir "saran tambahan" s420) ------------------------
// Guard akumulasi error fill-parsial berturut-turut: _partialFillDriftHint()

test('_partialFillDriftHint() — partialFillDriftRisk:true -> {ok:true}', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, partialFillDriftRisk: true }) },
  });
  assert.equal(ctx.FuelCard._partialFillDriftHint('v1').ok, true);
});

test('_partialFillDriftHint() — partialFillDriftRisk:false -> {ok:false}', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, partialFillDriftRisk: false }) },
  });
  assert.equal(ctx.FuelCard._partialFillDriftHint('v1').ok, false);
});

test('_partialFillDriftHint() — estimator ok:false -> {ok:false} (bukan error)', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'belum ada titik acuan' }) },
  });
  assert.equal(ctx.FuelCard._partialFillDriftHint('v1').ok, false);
});

test('_partialFillDriftHint() — FuelStateEstimator belum dimuat -> {ok:false} (bukan error)', () => {
  const ctx = makeCtx({ D: {}, FuelStateEstimator: undefined });
  assert.equal(ctx.FuelCard._partialFillDriftHint('v1').ok, false);
});

test('render() — partialFillDriftRisk:true -> nudge "Full Tank atau koreksi manual" tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: false, partialFillDriftRisk: true, decayedConfidenceScore: 100 }),
    },
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /Sudah beberapa kali isi BBM parsial berturut-turut/);
  assert.match(html, /Full Tank atau koreksi manual/);
});

test('render() — partialFillDriftRisk:false -> nudge drift tidak tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: false, partialFillDriftRisk: false, decayedConfidenceScore: 100 }),
    },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /isi BBM parsial berturut-turut/);
});

test('render() — kmClamped:true DAN partialFillDriftRisk:true sekaligus -> kedua nudge tampil bersamaan', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({ ok: true, liter: 4, kmClamped: true, partialFillDriftRisk: true, decayedConfidenceScore: 100 }),
    },
  });
  ctx.FuelCard.render();
  const html = els.fuelIntelBody.innerHTML;
  assert.match(html, /cek odometer/);
  assert.match(html, /isi BBM parsial berturut-turut/);
});

// --- Audit S444+ (temuan user: "fuel bar statis walau KM di-update") -------
// _estimationLimitedHint(): sisi UI dari FuelStateEstimator.estimationLimited
// -- sebelumnya kalau true, liter cuma "macet" tanpa penjelasan apa pun.

test('_estimationLimitedHint() — estimationLimited:true & kmPerLiter:null -> {ok:true, reason:"kmPerLiter"}', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, estimationLimited: true, kmPerLiter: null }) },
  });
  const res = ctx.FuelCard._estimationLimitedHint('v1');
  assert.equal(res.ok, true);
  assert.equal(res.reason, 'kmPerLiter');
});

test('_estimationLimitedHint() — estimationLimited:false -> {ok:false}', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, liter: 4, estimationLimited: false, kmPerLiter: 20 }) },
  });
  assert.equal(ctx.FuelCard._estimationLimitedHint('v1').ok, false);
});

test('_estimationLimitedHint() — estimator ok:false -> {ok:false} (bukan error)', () => {
  const ctx = makeCtx({
    D: {},
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'belum ada titik acuan' }) },
  });
  assert.equal(ctx.FuelCard._estimationLimitedHint('v1').ok, false);
});

test('_estimationLimitedHint() — FuelStateEstimator belum dimuat -> {ok:false} (bukan error)', () => {
  const ctx = makeCtx({ D: {}, FuelStateEstimator: undefined });
  assert.equal(ctx.FuelCard._estimationLimitedHint('v1').ok, false);
});

test('render() — estimationLimited krn kmPerLiter null -> nudge "belum mengurangi konsumsi km" tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({
        ok: true, liter: 4, estimationLimited: true, kmPerLiter: null,
        kmClamped: false, partialFillDriftRisk: false, decayedConfidenceScore: 100,
      }),
    },
  });
  ctx.FuelCard.render();
  assert.match(els.fuelIntelBody.innerHTML, /belum mengurangi konsumsi km/);
});

test('render() — estimationLimited krn referenceKm null (kmPerLiter tersedia) -> nudge TIDAK tampil (bukan kasus yang ditargetkan hint ini, self-heal yang menangani)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({
        ok: true, liter: 4, estimationLimited: true, kmPerLiter: 20, referenceKm: null,
        kmClamped: false, partialFillDriftRisk: false, decayedConfidenceScore: 100,
      }),
    },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /belum mengurangi konsumsi km/);
});

test('render() — estimationLimited:false -> tidak ada nudge apa pun terkait ini', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelWrap', 'fuelIntelBody']);
  const ctx = makeCtx({
    document: doc,
    FuelIntelligenceEngine: { vehicleInsight: () => BASE_INSIGHT },
    curVehicleId: 'v1',
    D: { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 100 } }] },
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({
        ok: true, liter: 4, estimationLimited: false, kmPerLiter: 20,
        kmClamped: false, partialFillDriftRisk: false, decayedConfidenceScore: 100,
      }),
    },
  });
  ctx.FuelCard.render();
  assert.doesNotMatch(els.fuelIntelBody.innerHTML, /belum mengurangi konsumsi km/);
});

// --- showDiagnostic() (rekomendasi #1 audit S444/S445, "diagnostic view
// long-press gauge") ---------------------------------------------------

test('showDiagnostic() — estimasi ok -> tampilkan field mentah lewat showAlertModal (referenceKm/deltaKm/estimationLimited dst)', () => {
  let shown = null;
  const ctx = makeCtx({
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({
        ok: true, referenceKm: 1000, currentKm: 1250, deltaKm: 250, kmClamped: false,
        kmPerLiter: 25, baseLiter: 4, addedLiter: 0.5, partialFillsCounted: 1,
        consumedLiter: 10, liter: 3.5, estimationLimited: false, partialFillDriftRisk: false,
        confidenceScore: 90, decayedConfidenceScore: 73,
      }),
    },
    showAlertModal: (msg, opts) => { shown = { msg, opts }; },
  });
  ctx.FuelCard.showDiagnostic('v1');
  assert.ok(shown, 'showAlertModal harus terpanggil');
  assert.match(shown.msg, /referenceKm: 1000/);
  assert.match(shown.msg, /deltaKm: 250/);
  assert.match(shown.msg, /kmPerLiter: 25/);
  assert.match(shown.msg, /estimationLimited: tidak/);
  assert.match(shown.msg, /confidenceScore: 90.*decayed: 73/);
});

test('showDiagnostic() — referenceKm/deltaKm null (estimationLimited) -> tampil "belum ada"/"estimationLimited", bukan error', () => {
  let shown = null;
  const ctx = makeCtx({
    FuelStateEstimator: {
      estimateCurrentLiter: () => ({
        ok: true, referenceKm: null, currentKm: 500, deltaKm: null, kmClamped: false,
        kmPerLiter: null, baseLiter: 4, addedLiter: 0, partialFillsCounted: 0,
        consumedLiter: 0, liter: 4, estimationLimited: true, partialFillDriftRisk: false,
        confidenceScore: 70, decayedConfidenceScore: 70,
      }),
    },
    showAlertModal: (msg, opts) => { shown = { msg, opts }; },
  });
  ctx.FuelCard.showDiagnostic('v1');
  assert.match(shown.msg, /referenceKm: – \(belum ada\)/);
  assert.match(shown.msg, /deltaKm: – \(estimationLimited\)/);
  assert.match(shown.msg, /estimationLimited: YA/);
});

test('showDiagnostic() — estimateCurrentLiter() {ok:false} -> tampilkan reason apa adanya, bukan crash', () => {
  let shown = null;
  const ctx = makeCtx({
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'Data BBM saat ini belum ada (lakukan Koreksi BBM dulu)' }) },
    showAlertModal: (msg, opts) => { shown = { msg, opts }; },
  });
  ctx.FuelCard.showDiagnostic('v1');
  assert.equal(shown.msg, 'Data BBM saat ini belum ada (lakukan Koreksi BBM dulu)');
});

test('_gaugePointerUp() — tap singkat (belum long-press) -> panggil FuelBarCorrection.open(vehicleId), BUKAN showDiagnostic', () => {
  let opened = null;
  let diagShown = false;
  const ctx = makeCtx({
    FuelBarCorrection: { open: (id) => { opened = id; } },
    showAlertModal: () => { diagShown = true; },
  });
  ctx.FuelCard._gaugePointerDown({}, 'v1');
  ctx.FuelCard._gaugePointerUp({}, 'v1');
  assert.equal(opened, 'v1');
  assert.equal(diagShown, false);
});

test('_gaugePointerUp() — setelah long-press terpicu, pointerup TIDAK ikut membuka FuelBarCorrection (1 gesture = 1 aksi)', () => {
  let opened = null;
  const ctx = makeCtx({
    FuelBarCorrection: { open: (id) => { opened = id; } },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false, reason: 'x' }) },
    showAlertModal: () => {},
  });
  ctx.FuelCard._gaugeLongPressed = true; // simulasi timer sudah fire (setTimeout di-stub jadi no-op di harness ini)
  ctx.FuelCard._gaugePointerUp({}, 'v1');
  assert.equal(opened, null);
  assert.equal(ctx.FuelCard._gaugeLongPressed, false, 'flag harus direset setelah dikonsumsi');
});

test('_gaugePointerCancel() — reset flag & timer, tidak memicu aksi apa pun', () => {
  let opened = null;
  const ctx = makeCtx({ FuelBarCorrection: { open: (id) => { opened = id; } } });
  ctx.FuelCard._gaugeLongPressed = true;
  ctx.FuelCard._gaugePointerCancel();
  assert.equal(ctx.FuelCard._gaugeLongPressed, false);
  assert.equal(opened, null);
});
