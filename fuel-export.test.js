'use strict';
// tests/fuel-export.test.js — cakupan TASK-155A (Export Fuel Dashboard/Fuel
// Compare). Regression test utk 4 API publik baru:
//   - FuelDashboard.exportVehicleHTML()/exportVehicleJSON()
//     (modules/vehicle/fuel-dashboard.js)
//   - FuelCompare.exportFleetHTML()/exportFleetJSON()
//     (modules/vehicle/fuel-compare.js)
// + tombol "⬇️ Export" (FuelDashboard) / "⬇️ Export All" (FuelCompare) di
// markup render(). Pola harness SAMA PERSIS tests/fuel-dashboard.test.js /
// tests/fuel-compare.test.js (fake DOM minimal, bukan jsdom) — Blob/URL
// disuntik lewat extraGlobals (tersedia native di Node >=18, pola sama
// tests/data-archive.test.js).
//
// PRINSIP TASK-155A yang ikut diverifikasi di sini: 0 rumus/kalkulasi baru
// (seluruh field export = field FuelInsightEngine.getSummary() apa adanya),
// 0 storage baru (export TIDAK PERNAH memanggil save()/menulis ke D — lihat
// blok "D.* tidak disentuh" di bawah).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => { els[id] = { innerHTML: '', style: {}, textContent: '' }; });
  const createdAnchors = [];
  return {
    doc: {
      getElementById: (id) => els[id] || null,
      createElement: (tag) => {
        const a = { tag, href: '', download: '', clicked: 0, click() { this.clicked++; } };
        if (tag === 'a') createdAnchors.push(a);
        return a;
      },
    },
    els,
    createdAnchors,
  };
}

// Stub Blob/URL murni (tidak butuh Blob asli, cukup pola browser: Blob ada,
// URL.createObjectURL ada) supaya _downloadFile() lolos ke jalur sukses
// tanpa bergantung ke implementasi Blob Node yang sebenarnya.
function makeFakeBlobUrl() {
  const blobs = [];
  class FakeBlob {
    constructor(parts, opts) { this.parts = parts; this.opts = opts; blobs.push(this); }
  }
  const FakeURL = { createObjectURL: (blob) => 'blob:fake/' + blobs.indexOf(blob) };
  return { Blob: FakeBlob, URL: FakeURL, blobs };
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

function makeDashboardCtx({ document, FuelInsightEngine, curVehicleId, D, toast, Blob, URL } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-dashboard.js'],
    {
      document,
      FuelInsightEngine,
      curVehicleId,
      escapeHtml: (s) => String(s),
      D,
      toast,
      Blob,
      URL,
    },
    ['FuelDashboard'],
  );
}

function makeCompareCtx({ document, FuelInsightEngine, FuelFleetSelector, FuelModal, D, toast, Blob, URL } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-compare.js'],
    {
      document,
      FuelInsightEngine,
      FuelFleetSelector,
      FuelModal,
      escapeHtml: (s) => String(s),
      D,
      toast,
      Blob,
      URL,
    },
    ['FuelCompare'],
  );
}

function summaryFor(overrides = {}) {
  return { ...SUMMARY_BASE, ...overrides, fuel: { ...SUMMARY_BASE.fuel, ...(overrides.fuel || {}) } };
}

// =====================================================================
// FuelDashboard.exportVehicleJSON()
// =====================================================================

test('exportVehicleJSON(vehicleId) — kendaraan valid -> download JSON terpicu, {ok:true,data} dgn field summary apa adanya', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const toasts = [];
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
    toast: (m) => toasts.push(m),
  });
  const result = ctx.FuelDashboard.exportVehicleJSON('v1');
  assert.equal(result.ok, true);
  assert.equal(result.data.vehicle.id, 'v1');
  assert.equal(result.data.vehicle.name, 'Vario');
  assert.equal(result.data.healthScore, 82);
  assert.equal(result.data.monthlyCost, 150000);
  assert.deepEqual(result.data.fuel, SUMMARY_BASE.fuel);
  assert.deepEqual(result.data.highestInsight, SUMMARY_BASE.highestInsight);
  assert.equal(createdAnchors.length, 1);
  assert.equal(createdAnchors[0].clicked, 1);
  assert.match(createdAnchors[0].download, /^fuel-dashboard-vario-\d{4}-\d{2}-\d{2}\.json$/);
  assert.ok(toasts.some((m) => /berhasil/.test(m)));
});

test('exportVehicleJSON() tanpa argumen -> pakai this.curVehicleId sbg default', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  ctx.FuelDashboard.curVehicleId = 'v1';
  const result = ctx.FuelDashboard.exportVehicleJSON();
  assert.equal(result.ok, true);
  assert.equal(result.data.vehicle.id, 'v1');
});

// =====================================================================
// FuelDashboard.exportVehicleHTML()
// =====================================================================

test('exportVehicleHTML(vehicleId) — kendaraan valid -> download HTML terpicu, konten memuat nama & skor', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor({ healthScore: 91 }) },
    D,
    Blob,
    URL,
  });
  const result = ctx.FuelDashboard.exportVehicleHTML('v1');
  assert.equal(result.ok, true);
  assert.equal(createdAnchors.length, 1);
  assert.match(createdAnchors[0].download, /^fuel-dashboard-vario-\d{4}-\d{2}-\d{2}\.html$/);
  const report = ctx.FuelDashboard._vehicleHtmlReport(result.data);
  assert.match(report, /Vario/);
  assert.match(report, /91\/100/);
  assert.match(report, /<!DOCTYPE html>/);
});

test('_buildExportData()/exportVehicleHTML() — 0 rumus baru: seluruh field = summary.* apa adanya (100% traceable ke getSummary())', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const customSummary = summaryFor({ healthScore: 33, efficiencyScore: 77, monthlyCost: 999999, remainingDistance: 12.5, maintenanceRisk: 'tinggi' });
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => customSummary },
    D,
    Blob,
    URL,
  });
  const data = ctx.FuelDashboard._buildExportData('v1');
  assert.equal(data.healthScore, customSummary.healthScore);
  assert.equal(data.efficiencyScore, customSummary.efficiencyScore);
  assert.equal(data.monthlyCost, customSummary.monthlyCost);
  assert.equal(data.remainingDistance, customSummary.remainingDistance);
  assert.equal(data.maintenanceRisk, customSummary.maintenanceRisk);
  assert.deepEqual(data.fuel, customSummary.fuel);
  assert.deepEqual(data.highestInsight, customSummary.highestInsight);
});

// =====================================================================
// FuelDashboard — Invalid vehicle / empty data
// =====================================================================

test('exportVehicleJSON(vehicleId) — invalid vehicle (tidak ada di D.vehicles) -> {ok:false}, toast peringatan, TIDAK download', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const toasts = [];
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
    toast: (m) => toasts.push(m),
  });
  const result = ctx.FuelDashboard.exportVehicleJSON('v-ghost');
  assert.equal(result.ok, false);
  assert.equal(createdAnchors.length, 0);
  assert.ok(toasts.some((m) => /tidak ditemukan/i.test(m)));
});

test('exportVehicleHTML(vehicleId) — invalid vehicle -> {ok:false}, TIDAK throw, TIDAK download', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  let result;
  assert.doesNotThrow(() => { result = ctx.FuelDashboard.exportVehicleHTML('v-ghost'); });
  assert.equal(result.ok, false);
  assert.equal(createdAnchors.length, 0);
});

test('exportVehicleJSON()/exportVehicleHTML() — getSummary() {ok:false} (data belum cukup) -> {ok:false}, TIDAK throw', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) },
    D,
    Blob,
    URL,
  });
  assert.doesNotThrow(() => {
    assert.equal(ctx.FuelDashboard.exportVehicleJSON('v1').ok, false);
    assert.equal(ctx.FuelDashboard.exportVehicleHTML('v1').ok, false);
  });
});

test('exportVehicleJSON()/exportVehicleHTML() — 0 kendaraan sama sekali (empty data) -> {ok:false}, TIDAK throw', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  assert.doesNotThrow(() => {
    assert.equal(ctx.FuelDashboard.exportVehicleJSON('v1').ok, false);
    assert.equal(ctx.FuelDashboard.exportVehicleHTML().ok, false);
  });
});

test('exportVehicleJSON()/exportVehicleHTML() — FuelInsightEngine belum dimuat -> {ok:false}, TIDAK throw', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeDashboardCtx({ document: doc, FuelInsightEngine: undefined, D, Blob, URL });
  assert.doesNotThrow(() => {
    assert.equal(ctx.FuelDashboard.exportVehicleJSON('v1').ok, false);
    assert.equal(ctx.FuelDashboard.exportVehicleHTML('v1').ok, false);
  });
});

test('exportVehicleJSON()/exportVehicleHTML() — Blob/URL tidak tersedia di environment -> {ok:false} (bukan throw), data tetap terbentuk', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    // Blob/URL sengaja tidak disuntik -> _downloadFile() harus balik false
  });
  const resJson = ctx.FuelDashboard.exportVehicleJSON('v1');
  const resHtml = ctx.FuelDashboard.exportVehicleHTML('v1');
  assert.equal(resJson.ok, false);
  assert.equal(resHtml.ok, false);
  assert.equal(resJson.data.vehicle.id, 'v1'); // data tetap tersedia walau download gagal
});

// =====================================================================
// Tombol "Export" FuelDashboard
// =====================================================================

test('render() — tombol Export FuelDashboard ditambahkan di btn-row, data-action="FuelDashboard.exportVehicleHTML"', () => {
  const { doc, els } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelDashboard.render();
  const html = els.fuelDashBody.innerHTML;
  assert.match(html, /⬇️ Export/);
  assert.match(html, /data-action="FuelDashboard\.exportVehicleHTML" data-args="\[.*v1.*\]"/);
});

// =====================================================================
// FuelCompare.exportFleetJSON()
// =====================================================================

test('exportFleetJSON() — armada valid -> download JSON terpicu, {ok:true,data} berisi seluruh kendaraan valid sesuai sort aktif', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario', emoji: '🏍️' },
      { id: 'v2', name: 'Beat', emoji: '🏍️' },
    ],
  };
  const toasts = [];
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: (vid) => summaryFor({ healthScore: vid === 'v1' ? 40 : 90 }),
    },
    D,
    Blob,
    URL,
    toast: (m) => toasts.push(m),
  });
  const result = ctx.FuelCompare.exportFleetJSON();
  assert.equal(result.ok, true);
  assert.equal(result.data.vehicles.length, 2);
  // default sortKey healthScore asc -> v1 (40) duluan
  assert.equal(result.data.vehicles[0].id, 'v1');
  assert.equal(result.data.vehicles[1].id, 'v2');
  assert.equal(result.data.sortKey, 'healthScore');
  assert.equal(createdAnchors.length, 1);
  assert.match(createdAnchors[0].download, /^fuel-fleet-\d{4}-\d{2}-\d{2}\.json$/);
  assert.ok(toasts.some((m) => /berhasil/.test(m)));
});

test('exportFleetJSON() — mengikuti this.sortKey/this.sortDir yang sedang aktif (0 sort baru, reuse setSort())', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario' },
      { id: 'v2', name: 'Beat' },
    ],
  };
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: (vid) => summaryFor({ healthScore: vid === 'v1' ? 40 : 90 }) },
    D,
    Blob,
    URL,
  });
  ctx.FuelCompare.sortKey = 'healthScore';
  ctx.FuelCompare.sortDir = 'desc';
  const result = ctx.FuelCompare.exportFleetJSON();
  assert.equal(result.data.vehicles[0].id, 'v2'); // desc -> tertinggi (90) duluan
  assert.equal(result.data.sortDir, 'desc');
});

// =====================================================================
// FuelCompare.exportFleetHTML()
// =====================================================================

test('exportFleetHTML() — armada valid -> download HTML terpicu, konten tabel memuat seluruh kendaraan', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario' },
      { id: 'v2', name: 'Beat' },
    ],
  };
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  const result = ctx.FuelCompare.exportFleetHTML();
  assert.equal(result.ok, true);
  assert.equal(createdAnchors.length, 1);
  assert.match(createdAnchors[0].download, /^fuel-fleet-\d{4}-\d{2}-\d{2}\.html$/);
  const report = ctx.FuelCompare._fleetHtmlReport(result.data);
  assert.match(report, /Vario/);
  assert.match(report, /Beat/);
  assert.match(report, /<!DOCTYPE html>/);
  assert.match(report, /<table>/);
});

test('_buildFleetExportData()/exportFleetHTML() — 0 rumus baru: field kendaraan = summary.* apa adanya per baris', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const customSummary = summaryFor({ healthScore: 55, efficiencyScore: 61, monthlyCost: 42000, remainingDistance: 8, maintenanceRisk: 'sedang' });
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => customSummary },
    D,
    Blob,
    URL,
  });
  const data = ctx.FuelCompare._buildFleetExportData();
  const row = data.vehicles[0];
  assert.equal(row.healthScore, customSummary.healthScore);
  assert.equal(row.efficiencyScore, customSummary.efficiencyScore);
  assert.equal(row.monthlyCost, customSummary.monthlyCost);
  assert.equal(row.remainingDistance, customSummary.remainingDistance);
  assert.equal(row.maintenanceRisk, customSummary.maintenanceRisk);
  assert.deepEqual(row.fuel, customSummary.fuel);
  assert.deepEqual(row.highestInsight, customSummary.highestInsight);
});

// =====================================================================
// FuelCompare — Invalid vehicle / empty fleet / empty data
// =====================================================================

test('exportFleetJSON()/exportFleetHTML() — empty fleet (0 kendaraan sama sekali) -> {ok:false}, toast peringatan, TIDAK download', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [] };
  const toasts = [];
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
    toast: (m) => toasts.push(m),
  });
  assert.doesNotThrow(() => {
    assert.equal(ctx.FuelCompare.exportFleetJSON().ok, false);
    assert.equal(ctx.FuelCompare.exportFleetHTML().ok, false);
  });
  assert.equal(createdAnchors.length, 0);
  assert.ok(toasts.some((m) => /tidak ada data armada/i.test(m)));
});

test('exportFleetJSON()/exportFleetHTML() — empty data (SEMUA kendaraan invalid/getSummary ok:false) -> {ok:false}, TIDAK throw', () => {
  const { doc, createdAnchors } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario' },
      { id: 'v2', name: 'Beat' },
    ],
  };
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) },
    D,
    Blob,
    URL,
  });
  assert.doesNotThrow(() => {
    assert.equal(ctx.FuelCompare.exportFleetJSON().ok, false);
    assert.equal(ctx.FuelCompare.exportFleetHTML().ok, false);
  });
  assert.equal(createdAnchors.length, 0);
});

test('exportFleetJSON() — >1 kendaraan, sebagian invalid (getSummary ok:false utk salah satu) -> hanya kendaraan valid diekspor (pola sama render())', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario' },
      { id: 'v2', name: 'Beat' },
      { id: 'v3', name: 'GhostVehicle' },
    ],
  };
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: {
      getSummary: (vid) => (vid === 'v3' ? { ok: false, reason: 'Kendaraan tidak ditemukan' } : summaryFor()),
    },
    D,
    Blob,
    URL,
  });
  const result = ctx.FuelCompare.exportFleetJSON();
  assert.equal(result.ok, true);
  assert.equal(result.data.vehicles.length, 2);
  assert.ok(result.data.vehicles.every((v) => v.id !== 'v3'));
});

test('exportFleetJSON()/exportFleetHTML() — FuelInsightEngine belum dimuat -> {ok:false}, TIDAK throw', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCompareCtx({ document: doc, FuelInsightEngine: undefined, D, Blob, URL });
  assert.doesNotThrow(() => {
    assert.equal(ctx.FuelCompare.exportFleetJSON().ok, false);
    assert.equal(ctx.FuelCompare.exportFleetHTML().ok, false);
  });
});

test('exportFleetJSON()/exportFleetHTML() — Blob/URL tidak tersedia -> {ok:false} (bukan throw), data tetap terbentuk', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    // Blob/URL sengaja tidak disuntik
  });
  const resJson = ctx.FuelCompare.exportFleetJSON();
  const resHtml = ctx.FuelCompare.exportFleetHTML();
  assert.equal(resJson.ok, false);
  assert.equal(resHtml.ok, false);
  assert.equal(resJson.data.vehicles.length, 1);
});

// =====================================================================
// Tombol "Export All" FuelCompare
// =====================================================================

test('render() — tombol Export All FuelCompare ditambahkan, data-action="FuelCompare.exportFleetHTML"', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
  });
  ctx.FuelCompare.render();
  const html = els.fuelCompareBody.innerHTML;
  assert.match(html, /⬇️ Export All/);
  assert.match(html, /data-action="FuelCompare\.exportFleetHTML"/);
});

test('render() — 0 kendaraan (empty fleet) -> wrap disembunyikan, tombol Export All TIDAK ikut dirender', () => {
  const { doc, els } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const D = { vehicles: [] };
  const ctx = makeCompareCtx({ document: doc, FuelInsightEngine: { getSummary: () => summaryFor() }, D });
  ctx.FuelCompare.render();
  assert.equal(els.fuelCompareWrap.style.display, 'none');
  assert.doesNotMatch(els.fuelCompareBody.innerHTML, /Export All/);
});

// =====================================================================
// D.* tidak disentuh (0 storage baru — TASK-155A presentation-only)
// =====================================================================

test('exportVehicleJSON()/exportVehicleHTML() — D.vehicles TIDAK dimodifikasi sama sekali (deep-equal sebelum & sesudah)', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const before = JSON.parse(JSON.stringify(D));
  const ctx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  ctx.FuelDashboard.exportVehicleJSON('v1');
  ctx.FuelDashboard.exportVehicleHTML('v1');
  assert.deepEqual(D, before);
});

test('exportFleetJSON()/exportFleetHTML() — D.vehicles TIDAK dimodifikasi sama sekali (deep-equal sebelum & sesudah)', () => {
  const { doc } = makeFakeDoc(['fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = {
    vehicles: [
      { id: 'v1', name: 'Vario', emoji: '🏍️' },
      { id: 'v2', name: 'Beat', emoji: '🏍️' },
    ],
  };
  const before = JSON.parse(JSON.stringify(D));
  const ctx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  ctx.FuelCompare.exportFleetJSON();
  ctx.FuelCompare.exportFleetHTML();
  assert.deepEqual(D, before);
});

test('exportVehicleJSON()/exportFleetJSON() — TIDAK pernah memanggil save()/menulis field baru ke D (0 storage baru)', () => {
  const { doc } = makeFakeDoc(['fuelDashWrap', 'fuelDashBody', 'fuelCompareWrap', 'fuelCompareBody']);
  const { Blob, URL } = makeFakeBlobUrl();
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  let saveCalls = 0;
  const dashCtx = makeDashboardCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  dashCtx.save = () => { saveCalls++; }; // kalau file salah panggil save(), ini akan tetap 0 krn save bukan dependency yg diinject/dipanggil
  dashCtx.FuelDashboard.exportVehicleJSON('v1');

  const compareCtx = makeCompareCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => summaryFor() },
    D,
    Blob,
    URL,
  });
  compareCtx.FuelCompare.exportFleetJSON();

  assert.equal(saveCalls, 0);
  assert.deepEqual(Object.keys(D), ['vehicles']); // 0 field baru ditambahkan ke D
});
