'use strict';
// tests/torsi-toggle-check-vehicle-api-s2.test.js — cakupan Sesi N+1
// (DESIGN_torsi-vehicle-selector_shop-import-export-2.md, Bagian A.5).
//
// Target: Torsi.toggleCheck()/Torsi.updateBiaya() (car-notes.js) — refactor
// supaya baca/tulis lewat TorsiVehicleAPI.setCheck() atas
// Torsi._selectedVehicleId, BUKAN lagi this.persist() langsung ke
// D.torsiChecklist[curVehicleId]. Kontrak TorsiVehicleAPI & bentuk
// D.torsiChecklist TIDAK berubah (0 perubahan skema) — cuma titik tulisnya
// yang pindah.
//
// RULE yang dites di sini:
//   - toggleCheck()/updateBiaya() menulis ke D.torsiChecklist[vehicleId]
//     lewat TorsiVehicleAPI.setCheck() (bukan this.persist()).
//   - Penulisan mengikuti Torsi._selectedVehicleId, BUKAN curVehicleId global
//     — kalau keduanya beda, data masuk ke slot _selectedVehicleId.
//   - Fallback ke curVehicleId kalau _selectedVehicleId belum diisi (null).
//   - Partial patch: toggleCheck() tidak menimpa biaya yang sudah ada,
//     updateBiaya() tidak menimpa checked yang sudah ada (pola setCheck()).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return Object.assign({
    vehicles: [
      { id: 'veh_1', name: 'Vario 125', emoji: '🏍️', jenis: 'motor' },
      { id: 'veh_2', name: 'Brio', emoji: '🚗', jenis: 'mobil' },
    ],
    torsiChecklist: {},
    partsStock: [],
  }, overrides);
}

// Fake document minimal — bukan permissive-stub generik dari loadSource,
// supaya Torsi.renderList()/updateSummary() (baca .value/.innerHTML/dst)
// mendapat nilai string/objek asli, bukan Proxy stub (yang bikin
// String.prototype.includes() error saat renderList() filter by search
// query kosong).
function makeFakeElement() {
  return { value: '', innerHTML: '', textContent: '', style: {}, classList: { toggle() {}, add() {}, remove() {} } };
}
function makeFakeDocument() {
  const els = {};
  return {
    getElementById(id) {
      if (!els[id]) els[id] = makeFakeElement();
      return els[id];
    },
  };
}

function makeCtx({ D, curVehicleId }) {
  const calls = [];
  return {
    calls,
    ctx: loadSource(
      ['modules/vehicle/shop-katalog-dinamis-api.js', 'modules/vehicle/torsi-vehicle-api.js', 'car-notes.js'],
      {
        D,
        curVehicleId,
        document: makeFakeDocument(),
        save: () => calls.push('save'),
        escapeHtml: (s) => String(s),
        findTorsiDb: () => null,
      },
      ['Torsi', 'TorsiVehicleAPI'],
    ),
  };
}

test('toggleCheck() — menulis lewat TorsiVehicleAPI.setCheck() ke slot _selectedVehicleId (bukan curVehicleId)', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });
  ctx.Torsi._selectedVehicleId = 'veh_2'; // beda dari curVehicleId global
  ctx.Torsi.toggleCheck('busi');

  assert.equal(D.torsiChecklist.veh_1, undefined, 'tidak boleh menulis ke curVehicleId kalau _selectedVehicleId beda');
  assert.equal(D.torsiChecklist.veh_2.checked.busi, true, 'harus menulis ke slot _selectedVehicleId');
});

test('toggleCheck() — fallback ke curVehicleId kalau _selectedVehicleId belum diisi', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });
  // ctx.Torsi._selectedVehicleId sengaja dibiarkan null (default awal).
  ctx.Torsi.toggleCheck('busi');
  assert.equal(D.torsiChecklist.veh_1.checked.busi, true);
});

test('updateBiaya() — menulis lewat TorsiVehicleAPI.setCheck(), partial patch tidak menimpa checked yang sudah ada', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });
  ctx.Torsi._selectedVehicleId = 'veh_1';
  ctx.Torsi.toggleCheck('kampas_rem'); // checked:true dulu
  ctx.Torsi.updateBiaya('kampas_rem', '30000');

  assert.equal(D.torsiChecklist.veh_1.checked.kampas_rem, true, 'checked tidak boleh hilang setelah updateBiaya()');
  assert.equal(D.torsiChecklist.veh_1.biaya.kampas_rem, 30000);
});

test('toggleCheck()/updateBiaya() kendaraan berbeda tidak saling menimpa data', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });

  ctx.Torsi._selectedVehicleId = 'veh_1';
  ctx.Torsi.toggleCheck('busi');
  ctx.Torsi.updateBiaya('busi', '25000');

  ctx.Torsi._selectedVehicleId = 'veh_2';
  ctx.Torsi.toggleCheck('busi');
  ctx.Torsi.updateBiaya('busi', '99000');

  assert.equal(D.torsiChecklist.veh_1.biaya.busi, 25000, 'data veh_1 tidak boleh ikut berubah');
  assert.equal(D.torsiChecklist.veh_2.biaya.busi, 99000);
});
