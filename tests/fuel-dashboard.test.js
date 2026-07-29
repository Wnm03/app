'use strict';
// tests/fuel-dashboard.test.js — cakupan modules/vehicle/fuel-dashboard.js
// (TASK-150, Fuel Dashboard Integration). FuelDashboard hanya presenter
// (baca FuelInsightEngine.getSummary() apa adanya, susun 1 kartu dashboard +
// switcher kendaraan + CTA FuelModal/FuelBarCorrection) -- render() butuh
// document.getElementById, jadi dites lewat fake DOM minimal (bukan jsdom),
// pola sama persis tests/fuel-card.test.js.

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

function makeCtx({ document, FuelInsightEngine, curVehicleId, escapeHtml, D } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-dashboard.js'],
    {
      document,
      FuelInsightEngine,
      curVehicleId,
      escapeHtml: escapeHtml || ((s) => String(s)),
      D,
    },
    ['FuelDashboard'],
  );
}

const SUMMARY_BASE = {
  ok: true,
  healthScore: 82,
  efficiencyScore: 90,
  monthlyCost: 150000,
  remainingDistance: 40,
  maintenanceRisk: 'rendah',
  confidenceScore: 100,
  fuel: { currentBar: 5, maxBar: 8, remainingLiter: 3.2, fuelPercent: 62, reserve: false, reserveLiter: 1 },
  highestInsight: { id: 'next-refuel', priority: 'MEDIUM', title: 'Perkiraan waktu isi BBM berikutnya', description: 'Estimasi 5 hari lagi.' },
};

// --- Dashboard renders / smoke ---------------------------------------------

test('render() — smoke: kendaraan valid, wrap tampil & body terisi', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.equal(els.fuelDashWrap.style.display, '');
  assert.match(els.fuelDashBody.innerHTML, /Fuel Dashboard/);
  assert.match(els.fuelDashBody.innerHTML, /Vario/);
});

// --- No vehicle -------------------------------------------------------------

test('render() — 0 kendaraan sama sekali -> wrap disembunyikan', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false }) },
    curVehicleId: null,
    D,
  });
  ctx.FuelDashboard.render();
  assert.equal(els.fuelDashWrap.style.display, 'none');
});

test('render() — FuelInsightEngine belum dimuat -> wrap disembunyikan', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, FuelInsightEngine: undefined, curVehicleId: 'v1', D });
  ctx.FuelDashboard.render();
  assert.equal(els.fuelDashWrap.style.display, 'none');
});

test('render() — getSummary() {ok:false} utk kendaraan yang ada -> wrap disembunyikan (tidak throw)', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelDashboard.render());
  assert.equal(els.fuelDashWrap.style.display, 'none');
});

// --- Single vehicle ----------------------------------------------------------

test('render() — 1 kendaraan -> switcher chip TIDAK ditampilkan', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.doesNotMatch(els.fuelDashBody.innerHTML, /data-action="FuelDashboard\.switchVehicle"/);
});

// --- Multiple vehicles -------------------------------------------------------

test('render() — >1 kendaraan -> switcher chip ditampilkan utk tiap kendaraan, aktif ditandai', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }, { id: 'v2', name: 'Beat', emoji: '🏍️' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  const html = els.fuelDashBody.innerHTML;
  assert.match(html, /data-action="FuelDashboard\.switchVehicle" data-args="\[.*v1.*\]"/);
  assert.match(html, /data-action="FuelDashboard\.switchVehicle" data-args="\[.*v2.*\]"/);
  assert.match(html, /chip-btn active/);
});

// --- Invalid vehicle ---------------------------------------------------------

test('render(vehicleId) — vehicleId tidak ada di D.vehicles -> fallback ke kendaraan pertama (tidak disembunyikan)', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: (vid) => (vid === 'v1' ? { ...SUMMARY_BASE } : { ok: false }) },
    curVehicleId: 'v-ghost',
    D,
  });
  ctx.FuelDashboard.render('v-ghost-yang-sudah-dihapus');
  assert.equal(els.fuelDashWrap.style.display, '');
  assert.match(els.fuelDashBody.innerHTML, /Vario/);
});

// --- Remaining fuel -----------------------------------------------------------

test('render() — summary.fuel tersedia -> tampilkan bar/liter/persen', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, fuel: { currentBar: 5, maxBar: 8, remainingLiter: 3.2, fuelPercent: 62, reserve: false, reserveLiter: 1 } }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  const html = els.fuelDashBody.innerHTML;
  assert.match(html, /5 \/ 8 Bar/);
  assert.match(html, /3\.2 Liter/);
  assert.match(html, /62%/);
});

test('render() — summary.fuel.reserve true -> tampil peringatan cadangan', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, fuel: { currentBar: 1, maxBar: 8, remainingLiter: 0.5, fuelPercent: 6, reserve: true, reserveLiter: 1 } }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.match(els.fuelDashBody.innerHTML, /Sudah masuk cadangan/);
});

test('render() — summary.fuel null (belum pernah dikoreksi) -> ajakan koreksi, tidak error', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, fuel: null }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.match(els.fuelDashBody.innerHTML, /Belum ada estimasi BBM tersimpan/);
});

// --- Health score -------------------------------------------------------------

test('render() — healthScore tinggi (>=80) -> warna hijau', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, healthScore: 90 }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.match(els.fuelDashBody.innerHTML, /u-fw800 green">90\/100/);
});

test('render() — healthScore null -> baris skor dilewati (tidak error)', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, healthScore: null }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.doesNotMatch(els.fuelDashBody.innerHTML, /Skor Kesehatan BBM/);
});

// --- Highest insight ------------------------------------------------------------

test('render() — highestInsight CRITICAL -> tampil dgn warna merah', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: () => ({
        ...SUMMARY_BASE,
        highestInsight: { id: 'reserve-fuel', priority: 'CRITICAL', title: 'BBM sudah masuk cadangan (reserve)', description: 'Segera isi BBM.' },
      }),
    },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  const html = els.fuelDashBody.innerHTML;
  assert.match(html, /class="u-fs12 red"/);
  assert.match(html, /BBM sudah masuk cadangan \(reserve\)/);
});

test('render() — highestInsight null -> baris insight dilewati (tidak error)', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, highestInsight: null }) },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelDashboard.render());
});

// --- CTA reuse (FuelModal/FuelBarCorrection) -------------------------------------

test('render() — tombol CTA reuse FuelModal.open()/FuelBarCorrection.open() (0 mekanisme baru)', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  const html = els.fuelDashBody.innerHTML;
  assert.match(html, /data-action="FuelModal\.open" data-args="\[.*v1.*\]"/);
  assert.match(html, /data-action="FuelBarCorrection\.open" data-args="\[.*v1.*\]"/);
  // TASK-155A: tombol Export ditambahkan di baris CTA yang sama -> 3 tombol
  // btn-ghost btn-sm (Lihat Detail / Koreksi / Export), bukan 2 lagi.
  assert.match(html, /data-action="FuelDashboard\.exportVehicleHTML" data-args="\[.*v1.*\]"/);
  assert.equal((html.match(/class="btn btn-ghost btn-sm"/g) || []).length, 3);
});

// --- Refresh after refill (data berubah, render() ulang mencerminkan) -----------

test('refresh after refill — panggil render() ulang setelah data BBM berubah mencerminkan nilai baru', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  let liter = 1.2;
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, fuel: { currentBar: 1, maxBar: 8, remainingLiter: liter, fuelPercent: 15, reserve: true, reserveLiter: 1 } }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.match(els.fuelDashBody.innerHTML, /1\.2 Liter/);

  // simulasikan isi BBM (refill) mengubah remainingLiter -> render() ulang
  liter = 10;
  ctx.FuelDashboard.render();
  assert.match(els.fuelDashBody.innerHTML, /10 Liter/);
});

// --- Refresh after correction (dipanggil dari FuelBarCorrection.save()) ---------

test('refresh after correction — FuelBarCorrection.save() memanggil FuelDashboard.render(vid)', () => {
  const { doc, els } = makeFakeDoc([
    'fuelDashWrap', 'fuelDashBody', 'fbcVehName', 'fbcBarPicker', 'fbcPreviewBox', 'fbcSaveBtn', 'fuelIntelWrap', 'fuelIntelBody',
  ]);
  els.fbcSaveBtn.disabled = false;
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const FuelGaugeEngine = { calculateFuelLiter: () => ({ ok: true, liter: 4 }) };

  let dashboardRenderCalledWith = null;
  const FuelDashboardStub = { render: (vid) => { dashboardRenderCalledWith = vid; } };

  const ctx = loadSource(
    ['modules/vehicle/fuel-intelligence-ui.js'],
    {
      document: doc,
      D,
      FuelGaugeEngine,
      FuelTankProfile: { get: () => ({ tankCapacityLiter: 10, fuelBarCount: 8 }) },
      FuelStorage: { latest: () => null },
      toast: () => {},
      save: () => {},
      openModal: () => {},
      closeModal: () => {},
      FuelDashboard: FuelDashboardStub,
    },
    ['FuelBarCorrection'],
  );

  ctx.FuelBarCorrection.curVehicleId = 'v1';
  ctx.FuelBarCorrection.selectedBar = 4;
  ctx.FuelBarCorrection.save();

  assert.equal(dashboardRenderCalledWith, 'v1');
});

// --- Vehicle switch --------------------------------------------------------------

test('switchVehicle(vehicleId) — memindahkan dashboard ke kendaraan lain & memperbarui body', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario', emoji: '🏍️' },
      { id: 'v2', name: 'Beat', emoji: '🏍️' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: (vid) => ({
        ...SUMMARY_BASE,
        highestInsight: { id: 'x', priority: 'INFO', title: vid === 'v1' ? 'Insight Vario' : 'Insight Beat', description: '-' },
      }),
    },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  assert.match(els.fuelDashBody.innerHTML, /Vario/);
  assert.equal(ctx.FuelDashboard.curVehicleId, 'v1');

  ctx.FuelDashboard.switchVehicle('v2');
  assert.match(els.fuelDashBody.innerHTML, /Beat/);
  assert.equal(ctx.FuelDashboard.curVehicleId, 'v2');
});
