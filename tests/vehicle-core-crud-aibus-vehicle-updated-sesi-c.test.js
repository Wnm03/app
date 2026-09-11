'use strict';
// tests/vehicle-core-crud-aibus-vehicle-updated-sesi-c.test.js — cakupan
// Sesi C (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7): CRUD kendaraan
// (saveVehicle create/edit, delVehicle, saveKm) di
// modules/vehicle/vehicle-core.js SEBELUMNYA 0% emit AIBus 'vehicle.updated'
// meski event ini sudah ada & dipakai sisi servis (sparepart-servis-b.js
// saveServis(), car-notes.js Servis.markServiced() — lihat
// tests/servis-markserviced-aibus-emit.test.js). Lihat
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md §Prioritas Tinggi #1 untuk
// detail temuan. Fix: 3 titik (create/edit/delete + update KM) sekarang
// ikut emit, pola REPLIKASI persis titik yang sudah ada (0 event baru).
//
// Pola harness sama seperti tests/vehicle-asset-auto-create-opsiA.test.js
// (loadSource + document.getElementById mock minimal).

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

// vehEditIdx dideklarasikan `let` di top-level vehicle-core.js -- vm TIDAK
// menempel binding let/const ke context object secara otomatis (lihat
// catatan di loadSource.js), jadi tidak bisa di-set langsung via
// `ctx.vehEditIdx = 0`. Pola yang sama dipakai loadSource sendiri utk
// expose (`this.NAME = NAME` dieksekusi lewat vm.Script di context yang
// sama) -- di sini dipakai arah sebaliknya (assignment), krn context yang
// dikembalikan loadSource() adalah vm context yang sama & tetap
// menyimpan lexical environment top-level-nya antar-eksekusi Script.
function setVehEditIdx(ctx, val) {
  new vm.Script(`vehEditIdx = ${val === null ? 'null' : val};`).runInContext(ctx);
}

function makeCtx(D, domValues, extra) {
  const values = Object.assign({
    vehName: '', vehEmoji: '', vehOwnership: 'SELF',
    vehCapacityKg: '', vehCapacityM3: '', vehBatteryCapacity: '',
    vehInterval: '', vehOliTransInterval: '', vehAssetId: '',
    vehKmAwal: '', vehNilai: '',
    kmVehicle: '', kmVal: '', kmDate: '2026-09-11', kmNote: '',
  }, domValues || {});
  const els = {};
  const getEl = (id) => {
    if (!els[id]) els[id] = { value: values[id] !== undefined ? values[id] : '' };
    return els[id];
  };
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js'],
    Object.assign({
      D,
      document: { getElementById: getEl },
      escapeHtml: (s) => String(s),
      sameId: (a, b) => String(a) === String(b),
      resolveVehicleAssetLink: () => null,
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      save() {},
      renderVehicleManageList() {},
      renderVehicleSelect() {},
      renderCarImportVehicleSelect() {},
      renderDashboardServisReminder() {},
      renderServisList() {},
      renderCnTab() {},
      closeModal() {},
      toast() {},
      askConfirm: async () => true,
      getVehicleKm: () => 0,
      curVehicleId: 'v1',
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
    }, extra || {}),
    ['saveVehicle', 'delVehicle', 'saveKm']
  );
  ctx.__aibusEvents = aibusEvents;
  ctx.__els = els;
  return ctx;
}

test('saveVehicle() — tambah kendaraan baru emit AIBus vehicle.updated {action:"create"}', () => {
  const D = { vehicles: [], kmLogs: [], assets: [] };
  const ctx = makeCtx(D, { vehName: 'Vario 125' });

  ctx.saveVehicle();

  assert.equal(D.vehicles.length, 1, '0 regresi: kendaraan tetap tersimpan seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'vehicle.updated');
  assert.ok(ev, 'AIBus.emit("vehicle.updated", ...) harus terpanggil saat tambah kendaraan');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.vehicleId, D.vehicles[0].id);
});

test('saveVehicle() — edit kendaraan existing emit AIBus vehicle.updated {action:"edit"}', () => {
  const D = { vehicles: [{ id: 'veh_1', name: 'Lama', jenis: 'motor', serviceIntervalKm: 3000, ownership: 'SELF' }], kmLogs: [], assets: [] };
  const ctx = makeCtx(D, { vehName: 'Baru' });
  setVehEditIdx(ctx, 0);

  ctx.saveVehicle();

  assert.equal(D.vehicles[0].name, 'Baru', '0 regresi: nama tetap ter-update seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'vehicle.updated');
  assert.ok(ev, 'AIBus.emit("vehicle.updated", ...) harus terpanggil saat edit kendaraan');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.vehicleId, 'veh_1');
});

test('delVehicle() — hapus kendaraan emit AIBus vehicle.updated {action:"delete", deletedId}', async () => {
  const D = { vehicles: [{ id: 'veh_1', name: 'A' }, { id: 'veh_2', name: 'B' }], kmLogs: [] };
  const ctx = makeCtx(D);

  await ctx.delVehicle(0);

  assert.equal(D.vehicles.length, 1, '0 regresi: kendaraan tetap terhapus seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'vehicle.updated');
  assert.ok(ev, 'AIBus.emit("vehicle.updated", ...) harus terpanggil saat hapus kendaraan');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'veh_1');
});

test('saveKm() — update KM emit AIBus vehicle.updated {kind:"km"}', async () => {
  const D = { vehicles: [{ id: 'v1', name: 'A' }], kmLogs: [], bbmLogs: [], servisLogs: [] };
  const ctx = makeCtx(D, { kmVehicle: 'v1', kmVal: '12345' });

  await ctx.saveKm();

  assert.equal(D.kmLogs.length, 1, '0 regresi: KM log tetap tercatat seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'vehicle.updated');
  assert.ok(ev, 'AIBus.emit("vehicle.updated", ...) harus terpanggil saat update KM');
  assert.equal(ev.payload.kind, 'km');
  assert.equal(ev.payload.vehicleId, 'v1');
});

test('AIBus tidak ada (typeof AIBus==="undefined") — 3 fungsi tetap tidak throw (guard konsisten pola lama)', async () => {
  const D = { vehicles: [{ id: 'v1', name: 'A' }], kmLogs: [], bbmLogs: [], servisLogs: [], assets: [] };
  // ownership FAMILY (bukan SELF) supaya _autoCreateVehicleAsset() skip
  // (di luar fokus test ini, cukup pastikan 3 titik emit baru tidak throw
  // walau AIBus tidak ada).
  const ctx = makeCtx(D, { vehName: 'X', vehOwnership: 'FAMILY', kmVehicle: 'v1', kmVal: '1' }, { AIBus: undefined });

  assert.doesNotThrow(() => ctx.saveVehicle());
  await assert.doesNotReject(async () => { await ctx.saveKm(); });
});
