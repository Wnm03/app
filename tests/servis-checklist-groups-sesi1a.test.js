'use strict';
// tests/servis-checklist-groups-sesi1a.test.js — cakupan Sesi 1A
// (BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md).
//
// Target: SERVICE_CHECKLIST_GROUPS (modules/vehicle/servis-checklist.js)
// — MURNI DATA, 0 state/logic/UI (itu Sesi 1B/1C). Test ini memvalidasi
// bentuk data sesuai kontrak yang dikunci di
// VERIFIKASI-DAN-FINALISASI-CHECKLIST-SERVIS.md §3 (30 item/13 grup, 9
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

test('SERVICE_CHECKLIST_GROUPS: total 30 item persis VERIFIKASI §3 (bukan 30-40 rentang RENCANA lama)', () => {
  const items = flatten(GROUPS);
  assert.equal(items.length, 30);
});

test('SERVICE_CHECKLIST_GROUPS: persis 9 item linkCat:true (kunci RENCANA §3 / VERIFIKASI §3)', () => {
  const items = flatten(GROUPS);
  const linked = items.filter((it) => it.linkCat === true);
  assert.equal(linked.length, 9);
  const expectedNames = [
    'Oli Mesin', 'Busi', 'V-Belt CVT', 'Roller CVT',
    'Kampas Rem Depan', 'Minyak Rem', 'Aki', 'Filter Udara', 'Oli Gardan/Final Drive',
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

test('SERVICE_CHECKLIST_GROUPS: item bertanda needsReview (keputusan W belum final) persis 4 -- V-Belt CVT, Coolant, Kampas Rem Belakang, Ban Depan', () => {
  const items = flatten(GROUPS);
  const flagged = items.filter((it) => it.needsReview === true).map((it) => it.name).sort();
  assert.deepEqual(flagged, ['Ban Depan', 'Coolant', 'Kampas Rem Belakang', 'V-Belt CVT'].sort());
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
