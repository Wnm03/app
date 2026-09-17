'use strict';
const { readCarNotesSource } = require('./helpers/carNotesSource');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const carNotes = readCarNotesSource();
const checklist = fs.readFileSync(path.join(root, 'modules/vehicle/servis-checklist.js'), 'utf8');

test('Sesi 2A: create servis menyimpan snapshot checklist ke entry D.servisLogs yang sama', () => {
  assert.match(carNotes, /const checklistPayload=\(typeof ServisChecklist/);
  assert.match(carNotes, /foto:Servis\._photoDraft\.slice\(\),checklist:checklistPayload/);
});

test('Sesi 2A: edit servis tetap memperbarui checklist pada entry yang sama', () => {
  assert.match(carNotes, /Object\.assign\(s,\{date,item,categoryId:catIdForLog\|\|s\.categoryId[\s\S]*checklist:checklistPayload\}\);/);
});

test('Sesi 2A: snapshot checklist hanya berisi item tercentang + actionType dari satu SoT', () => {
  assert.match(checklist, /toLogPayload\(\) \{/);
  assert.match(checklist, /itemId,[\s\S]*?itemName: found\.item\.name,[\s\S]*?group: found\.group\.group,[\s\S]*?actionType: this\._checked\[itemId\]/);
});

test('Sesi 2A: edit memulihkan checklist lama secara backward-compatible', () => {
  assert.match(checklist, /loadFromLog\(log\) \{/);
  assert.match(checklist, /if \(!log\) return \{ ok: true, count: 0 \};/);
  assert.match(checklist, /checklistNotApplicable/);
});

test('Sesi 2A: modal servis merender checklist inline dan sinkron saat dibuka', () => {
  const modals = fs.readFileSync(path.join(root, 'modules/modals.js'), 'utf8');
  assert.match(modals, /id=\\?"servisChecklistPanel\\?"/);
  assert.match(carNotes, /Servis\.syncServiceChecklist\(\);\s*openModal\('servisModal'\)/);
});
