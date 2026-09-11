'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const carNotes = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');
const checklist = fs.readFileSync(path.join(root, 'modules/vehicle/servis-checklist.js'), 'utf8');

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


test('Sesi 2A3: kontrak SoT tetap memiliki 9 item linkCat=true', () => {
  const matches = checklist.match(/name:\s*[^,\n]+,\s*linkCat:\s*true/g) || [];
  assert.equal(matches.length, 9);
});
