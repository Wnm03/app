'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const {readServisSource}=require('./helpers/carNotesSource');
const carNotes = readServisSource();
const checklist = fs.readFileSync(path.join(root, 'modules/vehicle/servis-checklist.js'), 'utf8');
const F = require('./helpers/serviceMasterFixture');

test('Sesi 2A3: UI memberi warning kategori hanya untuk item linkCat=true yang belum ter-resolve', () => {
  assert.match(carNotes, /const linkedCat=it\.linkCat===true/);
  assert.match(carNotes, /resolveServisCatForVehicle\(it\.name,ServisChecklist\._vehicleId\|\|curVehicleId\)/);
  assert.match(carNotes, /sc-cat-warning/);
  assert.match(carNotes, /kategori belum ada/);
});

test('Sesi 2A3: item linkCat=false tidak ikut diberi warning kategori', () => {
  assert.match(carNotes, /const missingCatBadge=linkedCat&&!resolvedCat/);
});

test('Sesi 2A3: warning bersifat read-only dan tidak mengubah snapshot checklist', () => {
  assert.match(checklist, /toLogPayload\(\) \{/);
  assert.match(checklist, /Object\.keys\(this\._checked\)/);
  assert.doesNotMatch(carNotes, /saveChecklistNoteEntries/);
});


test('Sesi 2A3: kontrak SoT mempertahankan 44 item legacy linkCat=true (+2 dari master kumulatif = 46)', () => {
  // Checklist kini proyeksi dari Service Master generated (bukan literal di source).
  const items = F.masterItems();
  const legacy = items.filter(x => F.LEGACY_CHECKLIST_IDS.includes(x.id));
  assert.equal(legacy.length, 50);
  assert.equal(legacy.filter(x => x.linkCat === true).length, F.LEGACY_LINKCAT_COUNT);
  assert.equal(items.filter(x => x.linkCat === true).length, F.MASTER_LINKCAT_COUNT);
});
