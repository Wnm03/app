'use strict';
// tests/torsi-vehicle-selector-render-s4.test.js — cakupan Sesi N+3
// (DESIGN_torsi-vehicle-selector_shop-import-export-2.md, Bagian A.4/A.4.1).
//
// Target: Torsi.renderVehicleSelect() (isi <select id="trsVehicleSelect">
// dari TorsiVehicleAPI.daftarKendaraan()) dan Torsi.onVehicleChange()
// (ganti Torsi._selectedVehicleId secara in-memory, baca ulang checklist
// kendaraan terpilih lewat TorsiVehicleAPI.checklistUntuk(), render ulang
// daftar part + trsVehChip) — TANPA menyentuh curVehicleId global atau D
// (0 side-effect saat baca).
//
// RULE yang dites di sini:
//   - renderVehicleSelect() mengisi <option> dari daftarKendaraan(), default
//     _selectedVehicleId ke kendaraan pertama kalau belum valid.
//   - onVehicleChange() mengganti _selectedVehicleId TANPA mengubah
//     curVehicleId global.
//   - onVehicleChange() memuat checked/biaya/pageMode kendaraan yang baru
//     dipilih (read-only lewat checklistUntuk(), TIDAK menulis apa pun ke
//     D.torsiChecklist).
//   - Data kendaraan lain (mis. hasil toggleCheck() sebelumnya) tidak
//     tercampur/hilang saat pindah kendaraan di selector.

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
  const doc = makeFakeDocument();
  return {
    calls,
    doc,
    ctx: loadSource(
      ['modules/vehicle/shop-katalog-dinamis-api.js', 'modules/vehicle/torsi-vehicle-api.js', 'car-notes.js'],
      {
        D,
        curVehicleId,
        document: doc,
        save: () => calls.push('save'),
        escapeHtml: (s) => String(s),
        findTorsiDb: () => null,
        getVehicleKm: () => 0,
        toast: () => {},
      },
      ['Torsi', 'TorsiVehicleAPI'],
    ),
  };
}

test('renderVehicleSelect() — isi <option> dari daftarKendaraan(), default ke kendaraan pertama', () => {
  const D = makeD();
  const { ctx, doc } = makeCtx({ D, curVehicleId: 'veh_1' });
  ctx.Torsi._selectedVehicleId = null;
  ctx.Torsi.renderVehicleSelect();

  assert.equal(ctx.Torsi._selectedVehicleId, 'veh_1');
  const html = doc.getElementById('trsVehicleSelect').innerHTML;
  assert.match(html, /Vario 125/);
  assert.match(html, /Brio/);
});

test('onVehicleChange() — ganti _selectedVehicleId TANPA mengubah curVehicleId global', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });
  ctx.Torsi._selectedVehicleId = 'veh_1';
  ctx.Torsi.onVehicleChange({ value: 'veh_2' });

  assert.equal(ctx.Torsi._selectedVehicleId, 'veh_2');
  assert.equal(ctx.curVehicleId, 'veh_1', 'curVehicleId global tidak boleh ikut berubah');
});

test('onVehicleChange() — memuat checklist kendaraan terpilih tanpa menulis apa pun ke D', () => {
  const D = makeD();
  const { ctx, calls } = makeCtx({ D, curVehicleId: 'veh_1' });

  ctx.Torsi._selectedVehicleId = 'veh_1';
  ctx.Torsi.toggleCheck('busi');
  ctx.Torsi.updateBiaya('busi', '25000');
  calls.length = 0; // reset log save() dari setup di atas

  ctx.Torsi.onVehicleChange({ value: 'veh_2' });

  assert.equal(Object.keys(ctx.Torsi.checked).length, 0, 'veh_2 belum pernah dicek, harus kosong');
  assert.equal(Object.keys(ctx.Torsi.biaya).length, 0);
  assert.equal(calls.length, 0, 'onVehicleChange() tidak boleh menulis/save apa pun (read-only)');
  assert.equal(D.torsiChecklist.veh_2, undefined, 'checklistUntuk() tidak boleh membuat record baru saat baca');
});

test('onVehicleChange() — data checklist antar kendaraan tidak tercampur saat pindah-pindah', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });

  ctx.Torsi._selectedVehicleId = 'veh_1';
  ctx.Torsi.toggleCheck('busi');
  ctx.Torsi.updateBiaya('busi', '25000');

  ctx.Torsi.onVehicleChange({ value: 'veh_2' });
  assert.equal(Object.keys(ctx.Torsi.checked).length, 0);
  ctx.Torsi.toggleCheck('kampas_rem');
  ctx.Torsi.updateBiaya('kampas_rem', '40000');

  ctx.Torsi.onVehicleChange({ value: 'veh_1' });
  assert.equal(ctx.Torsi.checked.busi, true, 'balik ke veh_1 harus muat lagi data veh_1');
  assert.equal(ctx.Torsi.biaya.busi, 25000);
  assert.equal(ctx.Torsi.checked.kampas_rem, undefined, 'data veh_2 tidak boleh bocor ke veh_1');

  assert.equal(D.torsiChecklist.veh_1.checked.busi, true);
  assert.equal(D.torsiChecklist.veh_2.checked.kampas_rem, true);
});

test('onVehicleChange() — abaikan kalau value kosong (guard)', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D, curVehicleId: 'veh_1' });
  ctx.Torsi._selectedVehicleId = 'veh_1';
  ctx.Torsi.onVehicleChange({ value: '' });
  assert.equal(ctx.Torsi._selectedVehicleId, 'veh_1', 'value kosong tidak boleh mengganti _selectedVehicleId');
});
