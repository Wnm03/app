'use strict';
// tests/fuel-compare.test.js — cakupan modules/vehicle/fuel-compare.js
// (TASK-154, Multi Vehicle Fuel Comparison). FuelCompare hanya presenter
// (baca FuelInsightEngine.getSummary() per kendaraan + FuelFleetSelector.
// selectVehicle() apa adanya, susun 1 tabel perbandingan + sort + CTA
// FuelModal.open()) -- render() butuh document.getElementById, jadi dites
// lewat fake DOM minimal (bukan jsdom), pola sama persis
// tests/fuel-dashboard.test.js.

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

function makeCtx({ document, FuelInsightEngine, FuelFleetSelector, FuelModal, escapeHtml, D } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-compare.js'],
    {
      document,
      FuelInsightEngine,
      FuelFleetSelector,
      FuelModal,
      escapeHtml: escapeHtml || ((s) => String(s)),
      D,
    },
    ['FuelCompare'],
  );
}

function summaryFor({ healthScore = 82, monthlyCost = 150000, remainingLiter = 3.2, remainingDistance = 40, efficiencyScore = 90, maintenanceRisk = 'rendah', highestInsight = null } = {}) {
  return {
    ok: true,
    healthScore,
    efficiencyScore,
    monthlyCost,
    remainingDistance,
    maintenanceRisk,
    confidenceScore: 100,
    fuel: { currentBar: 5, maxBar: 8, remainingLiter, fuelPercent: 62, reserve: false, reserveLiter: 1 },
    highestInsight,
  };
}

// --- No vehicles -------------------------------------------------------------

test('render() — 0 kendaraan sama sekali -> wrap disembunyikan', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [] };
  const ctx = makeCtx({ document: doc, FuelInsightEngine: { getSummary: () => ({ ok: false }) }, D });
  ctx.FuelCompare.render();
  assert.equal(els.fuelCompareWrap.style.display, 'none');
});

test('render() — FuelInsightEngine belum dimuat -> wrap disembunyikan (tidak throw)', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, FuelInsightEngine: undefined, D });
  assert.doesNotThrow(() => ctx.FuelCompare.render());
  assert.equal(els.fuelCompareWrap.style.display, 'none');
});

// --- Single vehicle ----------------------------------------------------------

test('render() — 1 kendaraan -> baris tunggal tampil dgn nama & skor', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor({ healthScore: 82 }) },
    D,
  });
  ctx.FuelCompare.render();
  assert.equal(els.fuelCompareWrap.style.display, '');
  assert.match(els.fuelCompareBody.innerHTML, /Vario/);
  assert.match(els.fuelCompareBody.innerHTML, />82\/100</);
});

// --- Multiple vehicles / Invalid vehicle --------------------------------------

test('render() — >1 kendaraan, salah satu invalid (getSummary ok:false) -> hanya kendaraan valid tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario', emoji: '🏍️' },
      { id: 'v2', name: 'Beat', emoji: '🏍️' },
      { id: 'v3', name: 'GhostVehicle' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: (vid) => {
        if (vid === 'v3') return { ok: false, reason: 'Kendaraan tidak ditemukan' };
        return summaryFor({ healthScore: vid === 'v1' ? 40 : 90 });
      },
    },
    D,
  });
  assert.doesNotThrow(() => ctx.FuelCompare.render());
  const html = els.fuelCompareBody.innerHTML;
  assert.match(html, /Vario/);
  assert.match(html, /Beat/);
  assert.doesNotMatch(html, /GhostVehicle/);
});

test('render() — SEMUA kendaraan invalid -> wrap disembunyikan (tidak throw)', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) },
    D,
  });
  assert.doesNotThrow(() => ctx.FuelCompare.render());
  assert.equal(els.fuelCompareWrap.style.display, 'none');
});

// --- Sorting -------------------------------------------------------------------

test('render() — default sort: Highest Health Risk -> Lowest (healthScore ASC)', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario' },
      { id: 'v2', name: 'Beat' },
      { id: 'v3', name: 'Nmax' },
    ],
  };
  const scores = { v1: 90, v2: 30, v3: 60 };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: (vid) => summaryFor({ healthScore: scores[vid] }) },
    D,
  });
  ctx.FuelCompare.render();
  const html = els.fuelCompareBody.innerHTML;
  const iBeat = html.indexOf('Beat'); // healthScore 30, risiko tertinggi
  const iNmax = html.indexOf('Nmax'); // healthScore 60
  const iVario = html.indexOf('Vario'); // healthScore 90, risiko terendah
  assert.ok(iBeat < iNmax && iNmax < iVario, 'urutan seharusnya Beat, Nmax, Vario (risiko tertinggi dulu)');
});

test('setSort("name") — urut nama A-Z', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Zeta' },
      { id: 'v2', name: 'Alpha' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
  });
  ctx.FuelCompare.setSort('name');
  const html = els.fuelCompareBody.innerHTML;
  assert.ok(html.indexOf('Alpha') < html.indexOf('Zeta'));
});

test('setSort("monthlyCost") — urut biaya bulanan (null di akhir)', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Mahal' },
      { id: 'v2', name: 'Murah' },
      { id: 'v3', name: 'TanpaData' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: (vid) => {
        if (vid === 'v1') return summaryFor({ monthlyCost: 500000 });
        if (vid === 'v2') return summaryFor({ monthlyCost: 50000 });
        return summaryFor({ monthlyCost: null });
      },
    },
    D,
  });
  ctx.FuelCompare.setSort('monthlyCost');
  const html = els.fuelCompareBody.innerHTML;
  assert.ok(html.indexOf('Murah') < html.indexOf('Mahal'));
  assert.ok(html.indexOf('Mahal') < html.indexOf('TanpaData'));
});

test('setSort("remainingFuel") — urut sisa BBM (liter)', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Penuh' },
      { id: 'v2', name: 'Kosong' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: (vid) => summaryFor({ remainingLiter: vid === 'v1' ? 9.5 : 0.5 }),
    },
    D,
  });
  ctx.FuelCompare.setSort('remainingFuel');
  const html = els.fuelCompareBody.innerHTML;
  assert.ok(html.indexOf('Kosong') < html.indexOf('Penuh'));
});

test('setSort() dipanggil 2x dgn key yang sama -> membalik arah (asc<->desc)', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'A' },
      { id: 'v2', name: 'B' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
  });
  ctx.FuelCompare.setSort('name');
  assert.equal(ctx.FuelCompare.sortDir, 'asc');
  ctx.FuelCompare.setSort('name');
  assert.equal(ctx.FuelCompare.sortDir, 'desc');
  const html = els.fuelCompareBody.innerHTML;
  assert.ok(html.indexOf('B') < html.indexOf('A'));
});

// --- Highest Priority Insight --------------------------------------------------

test('render() — highestInsight tiap kendaraan tampil apa adanya', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: () => summaryFor({ highestInsight: { id: 'reserve-fuel', priority: 'CRITICAL', title: 'BBM sudah masuk cadangan (reserve)', description: 'Segera isi BBM.' } }),
    },
    D,
  });
  ctx.FuelCompare.render();
  assert.match(els.fuelCompareBody.innerHTML, /BBM sudah masuk cadangan \(reserve\)/);
});

// --- FuelFleetSelector reuse (badge prioritas fleet-wide) -----------------------

test('render() — FuelFleetSelector.selectVehicle() dipakai utk badge prioritas tertinggi', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario' },
      { id: 'v2', name: 'Beat' },
    ],
  };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    FuelFleetSelector: { selectVehicle: () => ({ ok: true, vehicleId: 'v2', summary: {}, insight: {} }) },
    D,
  });
  ctx.FuelCompare.render();
  const html = els.fuelCompareBody.innerHTML;
  const beatIdx = html.indexOf('Beat');
  const badgeIdx = html.indexOf('Prioritas Tertinggi');
  assert.ok(badgeIdx > -1 && badgeIdx > beatIdx);
});

test('render() — FuelFleetSelector belum dimuat -> tidak error, tanpa badge', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    FuelFleetSelector: undefined,
    D,
  });
  assert.doesNotThrow(() => ctx.FuelCompare.render());
  assert.doesNotMatch(els.fuelCompareBody.innerHTML, /Prioritas Tertinggi/);
});

// --- Vehicle switch / Selecting opens existing Fuel Intelligence Modal ----------

test('openVehicle(vehicleId) — memanggil FuelModal.open(vehicleId) (0 modal baru)', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  let openedWith = null;
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    FuelModal: { open: (vid) => { openedWith = vid; } },
    D: { vehicles: [{ id: 'v1', name: 'Vario' }] },
  });
  ctx.FuelCompare.openVehicle('v1');
  assert.equal(openedWith, 'v1');
  assert.equal(ctx.FuelCompare.curVehicleId, 'v1');
});

test('openVehicle(vehicleId) — kendaraan invalid: delegasi ke FuelModal.open() apa adanya (tidak throw)', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  let openedWith = 'not-called';
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) },
    FuelModal: { open: (vid) => { openedWith = vid; } },
    D: { vehicles: [] },
  });
  assert.doesNotThrow(() => ctx.FuelCompare.openVehicle('v-ghost'));
  assert.equal(openedWith, 'v-ghost');
});

test('openVehicle(vehicleId) — FuelModal belum dimuat -> tidak error', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    FuelModal: undefined,
    D: { vehicles: [{ id: 'v1', name: 'Vario' }] },
  });
  assert.doesNotThrow(() => ctx.FuelCompare.openVehicle('v1'));
});

test('data-action pada baris kendaraan memanggil FuelCompare.openVehicle dgn vehicleId benar', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }, { id: 'v2', name: 'Beat' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
  });
  ctx.FuelCompare.render();
  const html = els.fuelCompareBody.innerHTML;
  assert.match(html, /data-action="FuelCompare\.openVehicle" data-args="\[.*v1.*\]"/);
  assert.match(html, /data-action="FuelCompare\.openVehicle" data-args="\[.*v2.*\]"/);
});

// --- Refresh after fuel transaction ---------------------------------------------

test('refresh after fuel transaction — panggil render() ulang setelah remainingLiter berubah mencerminkan nilai baru', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  let liter = 1.2;
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor({ remainingLiter: liter }) },
    D,
  });
  ctx.FuelCompare.render();
  assert.match(els.fuelCompareBody.innerHTML, /1\.2 L/);

  liter = 10; // simulasikan transaksi isi BBM baru
  ctx.FuelCompare.render();
  assert.match(els.fuelCompareBody.innerHTML, /10 L/);
});

// --- Refresh after maintenance ---------------------------------------------------

test('refresh after maintenance — panggil render() ulang setelah maintenanceRisk berubah mencerminkan nilai baru', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  let risk = 'tinggi';
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor({ maintenanceRisk: risk }) },
    D,
  });
  ctx.FuelCompare.render();
  assert.match(els.fuelCompareBody.innerHTML, />tinggi</);

  risk = 'rendah'; // simulasikan servis baru saja dicatat, risiko turun
  ctx.FuelCompare.render();
  assert.match(els.fuelCompareBody.innerHTML, />rendah</);
  assert.doesNotMatch(els.fuelCompareBody.innerHTML, />tinggi</);
});
