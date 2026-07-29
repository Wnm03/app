'use strict';
// tests/vehicle-daily-brief.test.js — cakupan modules/vehicle/vehicle-daily-brief.js
// (TASK-151, Fuel AI Daily Briefing Integration). VehicleDailyBrief hanya
// presenter (baca VehicleAIHook apa adanya, susun HTML) — render() butuh
// document.getElementById, jadi dites lewat fake DOM minimal, pola sama
// persis tests/fuel-card.test.js.
//
// KONSOLIDASI (Sesi 156d): coverage section "Fuel Briefing" (dulu di sini,
// dipilih FuelFleetSelector.selectVehicle()) DIPINDAH ke
// tests/fuel-card.test.js — section-nya sendiri sudah pindah ke FuelCard
// (modules/vehicle/fuel-card.js). File ini sekarang HANYA menguji ringkasan
// armada harian (blok yang tersisa di VehicleDailyBrief.render()).

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

function makeCtx({ document, VehicleAIHook, escapeHtml } = {}) {
  return loadSource(
    ['modules/vehicle/vehicle-daily-brief.js'],
    {
      document,
      VehicleAIHook,
      escapeHtml: escapeHtml || ((s) => String(s)),
    },
    ['VehicleDailyBrief'],
  );
}

const BASE_HOOK = {
  ok: true,
  intelligence: { fleet: { totalVehicles: 2, avgHealth: 88, totalOverdue: 0 } },
  reminder: { total: 0, overdueCount: 0 },
};

test('Container belum ada di halaman -> aman diam-diam (tidak throw)', () => {
  const ctx = makeCtx({
    document: { getElementById: () => null },
    VehicleAIHook: { fleetSummary: () => BASE_HOOK },
  });
  assert.doesNotThrow(() => ctx.VehicleDailyBrief.render());
});

test('VehicleAIHook belum dimuat -> body dikosongkan', () => {
  const { doc, els } = makeFakeDoc(['vehBriefBody']);
  const ctx = makeCtx({ document: doc, VehicleAIHook: undefined });
  ctx.VehicleDailyBrief.render();
  assert.equal(els.vehBriefBody.innerHTML, '');
});

test('fleetSummary() {ok:false} -> body dikosongkan', () => {
  const { doc, els } = makeFakeDoc(['vehBriefBody']);
  const ctx = makeCtx({ document: doc, VehicleAIHook: { fleetSummary: () => ({ ok: false }) } });
  ctx.VehicleDailyBrief.render();
  assert.equal(els.vehBriefBody.innerHTML, '');
});

test('0 kendaraan armada -> body dikosongkan', () => {
  const { doc, els } = makeFakeDoc(['vehBriefBody']);
  const ctx = makeCtx({
    document: doc,
    VehicleAIHook: { fleetSummary: () => ({ ok: true, intelligence: { fleet: { totalVehicles: 0 } }, reminder: { total: 0 } }) },
  });
  ctx.VehicleDailyBrief.render();
  assert.equal(els.vehBriefBody.innerHTML, '');
});

test('Ada armada -> ringkasan harian tampil dgn jumlah kendaraan & skor kesehatan', () => {
  const { doc, els } = makeFakeDoc(['vehBriefBody']);
  const ctx = makeCtx({ document: doc, VehicleAIHook: { fleetSummary: () => BASE_HOOK } });
  ctx.VehicleDailyBrief.render();
  assert.match(els.vehBriefBody.innerHTML, /Ringkasan Harian Kendaraan/);
  assert.match(els.vehBriefBody.innerHTML, /2 kendaraan terpantau, skor kesehatan armada 88\/100\./);
  assert.match(els.vehBriefBody.innerHTML, /Tidak ada reminder aktif saat ini\./);
});

test('Ada item servis overdue & reminder aktif -> baris tambahan tampil', () => {
  const { doc, els } = makeFakeDoc(['vehBriefBody']);
  const ctx = makeCtx({
    document: doc,
    VehicleAIHook: {
      fleetSummary: () => ({
        ok: true,
        intelligence: { fleet: { totalVehicles: 3, avgHealth: 70, totalOverdue: 2 } },
        reminder: { total: 4, overdueCount: 1 },
      }),
    },
  });
  ctx.VehicleDailyBrief.render();
  assert.match(els.vehBriefBody.innerHTML, /2 item servis sudah lewat jatuh tempo\./);
  assert.match(els.vehBriefBody.innerHTML, /4 reminder aktif \(1 lewat jatuh tempo\)\./);
});

test('Section "Fuel Briefing" TIDAK lagi dirender di sini (sudah dipindah ke FuelCard)', () => {
  const { doc, els } = makeFakeDoc(['vehBriefBody']);
  const ctx = makeCtx({ document: doc, VehicleAIHook: { fleetSummary: () => BASE_HOOK } });
  ctx.VehicleDailyBrief.render();
  assert.doesNotMatch(els.vehBriefBody.innerHTML, /Fuel Briefing/);
  assert.equal(typeof ctx.VehicleDailyBrief._fuelBriefHtml, 'undefined');
});
