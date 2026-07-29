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

function makeCtx({ document, FuelIntelligenceEngine, FuelInsightEngine, curVehicleId, escapeHtml, fmt, D } = {}) {
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
