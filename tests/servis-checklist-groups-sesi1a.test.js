'use strict';
// tests/servis-checklist-groups-sesi1a.test.js — cakupan Sesi 1A
// (BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md).
//
// Target: SERVICE_CHECKLIST_GROUPS (modules/vehicle/servis-checklist.js)
// — MURNI DATA, 0 state/logic/UI (itu Sesi 1B/1C). Test ini memvalidasi
// bentuk data sesuai kontrak yang dikunci di
// VERIFIKASI-DAN-FINALISASI-CHECKLIST-SERVIS.md §3 (50 item/13 grup, 40
// `linkCat:true`) + PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2b
// (enum actionMode/resetType).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ctx = loadSource(['modules/vehicle/servis-checklist.js'], {}, ['SERVICE_CHECKLIST_GROUPS']);
const GROUPS = ctx.SERVICE_CHECKLIST_GROUPS;

const VALID_ACTION_MODES = new Set(['ganti', 'bersih', 'periksa', 'periksa-conditional', 'alternate', 'none']);
const VALID_RESET_TYPES = new Set(['km', 'time', 'both', null]);

function flatten(groups) {
  const out = [];
  for (const g of groups) for (const it of g.items) out.push({ ...it, group: g.group });
  return out;
}

test('SERVICE_CHECKLIST_GROUPS: 13 grup, sesuai jumlah sistem di AUDIT-SERVICE-CHECKLIST-COVERAGE.md', () => {
  assert.equal(GROUPS.length, 13);
});

test('SERVICE_CHECKLIST_GROUPS: 50 item setelah pelengkap KZR 2012 (13 grup; 30 item baseline + 16 item pelengkap + 4 item rem)', () => {
  const items = flatten(GROUPS);
  assert.equal(items.length, 50);
});

test('SERVICE_CHECKLIST_GROUPS: 44 item stockable linkCat:true (kontrak taxonomy SA27)', () => {
  const items = flatten(GROUPS);
  const linked = items.filter((it) => it.linkCat === true);
  assert.equal(linked.length, 44);
  const expectedNames = [
    'Oli Mesin', 'Filter Oli', 'Busi', 'Rantai Keteng & Tensioner',
    'Filter Kawat Oli Mesin (Oil Strainer Screen)', 'Paking (Gasket) Knalpot',
    'V-Belt CVT', 'Slide Piece CVT', 'Boss Pulley & Drive Face', 'Roller CVT',
    'Kampas Kopling Ganda', 'Mangkok Kopling Ganda', 'Seal Driven Face (O-Ring & Karet)',
    'Per Sentri', 'Per CVT (weight/kick starter spring)', 'Bearing Bak CVT',
    'Busa Filter CVT', 'Throttle Body (bersihkan)', 'Idle Speed Control (ISC)',
    'Injector (bersihkan)', 'Cakram Rem Depan', 'Kaliper Rem Depan', 'Filter Fuel Pump (Saringan Bensin)', 'Cek Selang & Tutup Tangki',
    'Coolant', 'Radiator & Water Pump (cek/flush)', 'Thermostat', 'Kampas Rem Depan',
    'Minyak Rem', 'Kampas Rem Belakang', 'Master Rem & Reservoir', 'Tromol Rem Belakang', 'Selang Rem', 'Oli Shockbreaker Depan',
    'Engine Mounting & Bushing Arm', 'Aki', 'Saklar & Sistem Penerangan',
    'Relay & Sekring (Fuse)', 'Ban Depan', 'Ban Belakang', 'Bearing Roda', 'Filter Udara',
    'Oli Gardan/Final Drive', 'Cek Kabel Gas/Rem Belakang/Standar/Kunci Kontak',
  ];
  assert.deepEqual(linked.map((it) => it.name).sort(), expectedNames.sort());
});

test('SERVICE_CHECKLIST_GROUPS: semua id unik (dipakai sbg key checked{} di Sesi 1B)', () => {
  const items = flatten(GROUPS);
  const ids = items.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('SERVICE_CHECKLIST_GROUPS: semua nama item unik dalam grupnya sendiri (tidak ada duplikat per grup)', () => {
  for (const g of GROUPS) {
    const names = g.items.map((it) => it.name);
    assert.equal(new Set(names).size, names.length, `duplikat nama di grup "${g.group}"`);
  }
});

test('SERVICE_CHECKLIST_GROUPS: tiap item punya actionMode valid (6 nilai, superset D.sparepartCats.actionMode)', () => {
  const items = flatten(GROUPS);
  for (const it of items) {
    assert.ok(VALID_ACTION_MODES.has(it.actionMode), `actionMode tidak valid utk "${it.name}": ${it.actionMode}`);
  }
});

test('SERVICE_CHECKLIST_GROUPS: tiap item punya resetType valid ("km"|"time"|"both"|null)', () => {
  const items = flatten(GROUPS);
  for (const it of items) {
    assert.ok(VALID_RESET_TYPES.has(it.resetType), `resetType tidak valid utk "${it.name}": ${it.resetType}`);
  }
});

test('SERVICE_CHECKLIST_GROUPS: item dengan resetType "km"/"both" punya intervalKm ATAU intervalLabel berisi rentang (angka null diperbolehkan kalau rentang)', () => {
  const items = flatten(GROUPS);
  for (const it of items) {
    if (it.resetType === 'km' || it.resetType === 'both') {
      const ok = typeof it.intervalKm === 'number' || /km/.test(it.intervalLabel);
      assert.ok(ok, `item "${it.name}" resetType=${it.resetType} tapi intervalKm/intervalLabel tidak konsisten`);
    }
  }
});

test('SERVICE_CHECKLIST_GROUPS: item dengan resetType "time"/"both" punya intervalTimeMonths ATAU intervalLabel menyebut durasi waktu', () => {
  const items = flatten(GROUPS);
  for (const it of items) {
    if (it.resetType === 'time' || it.resetType === 'both') {
      const ok = typeof it.intervalTimeMonths === 'number' || /tahun|bulan/.test(it.intervalLabel);
      assert.ok(ok, `item "${it.name}" resetType=${it.resetType} tapi intervalTimeMonths/intervalLabel tidak konsisten`);
    }
  }
});

test('SERVICE_CHECKLIST_GROUPS: gantiResetsInterval hanya diisi (bukan null) kalau actionMode==="periksa-conditional"', () => {
  const items = flatten(GROUPS);
  for (const it of items) {
    if (it.actionMode !== 'periksa-conditional') {
      assert.equal(it.gantiResetsInterval, null, `item "${it.name}" bukan periksa-conditional tapi gantiResetsInterval terisi`);
    } else {
      assert.equal(typeof it.gantiResetsInterval, 'boolean', `item "${it.name}" periksa-conditional tapi gantiResetsInterval bukan boolean`);
    }
  }
});

test('SERVICE_CHECKLIST_GROUPS: tiap item punya intervalLabel & sumber non-kosong (transparansi provenance)', () => {
  const items = flatten(GROUPS);
  for (const it of items) {
    assert.ok(typeof it.intervalLabel === 'string' && it.intervalLabel.length > 0, `intervalLabel kosong utk "${it.name}"`);
    assert.ok(typeof it.sumber === 'string' && it.sumber.length > 0, `sumber kosong utk "${it.name}"`);
  }
});

test('SERVICE_CHECKLIST_GROUPS: item bertanda needsReview (keputusan W belum final) persis 3 -- V-Belt CVT, Coolant, Ban Depan', () => {
  const items = flatten(GROUPS);
  const flagged = items.filter((it) => it.needsReview === true).map((it) => it.name).sort();
  assert.deepEqual(flagged, ['Ban Depan', 'Coolant', 'V-Belt CVT'].sort());
});

test('SERVICE_CHECKLIST_GROUPS: urutan grup persis 13 sistem AUDIT-SERVICE-CHECKLIST-COVERAGE.md', () => {
  const expectedOrder = [
    'Servis Mesin', 'Servis CVT', 'Sistem Injeksi PGM-FI', 'Sistem Bahan Bakar',
    'Sistem Pendingin', 'Sistem Pengereman', 'Suspensi', 'Sistem Kemudi',
    'Kelistrikan', 'Roda', 'Filter Udara', 'Final Gear', 'Body & Kontrol',
  ];
  assert.deepEqual(Array.from(GROUPS, (g) => g.group), expectedOrder);
});

test('SERVICE_CHECKLIST_GROUPS: setiap grup punya minimal 1 item (tidak ada grup kosong)', () => {
  for (const g of GROUPS) {
    assert.ok(g.items.length > 0, `grup "${g.group}" kosong`);
  }
});
