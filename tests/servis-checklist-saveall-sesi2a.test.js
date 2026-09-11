'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const carNotes = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');
const checklist = fs.readFileSync(path.join(root, 'modules/vehicle/servis-checklist.js'), 'utf8');

test('Sesi 2A: create servis menyimpan snapshot checklist ke entry D.servisLogs yang sama', () => {
  assert.match(carNotes, /const checklistPayload=\(typeof ServisChecklist/);
  assert.match(carNotes, /foto:Servis\._photoDraft\.slice\(\),checklist:checklistPayload/);
});

test('Sesi 2A: edit servis memperbarui checklist pada entry yang sama, bukan membuat log kedua', () => {
  assert.match(carNotes, /Object\.assign\(s,\{date,item,categoryId:catIdForLog\|\|s\.categoryId[\s\S]*checklist:checklistPayload\}\);/);
  assert.equal((carNotes.match(/D\.servisLogs\.push\(\{id:servisId/g) || []).length, 1);
});

test('Sesi 2A: snapshot checklist hanya berisi item tercentang + actionType dari satu SoT', () => {
  assert.match(checklist, /toLogPayload\(\) \{/);
  assert.match(checklist, /itemId,\n\s*itemName: found\.item\.name,\n\s*group: found\.group\.group,\n\s*actionType: this\._checked\[itemId\]/);
});

test('Sesi 2A: edit memulihkan checklist lama secara backward-compatible', () => {
  assert.match(checklist, /loadFromLog\(log\) \{/);
  assert.match(checklist, /if \(!log \|\| !Array\.isArray\(log\.checklist\)\) return \{ ok: true, count: 0 \};/);
});

test('Sesi 2A: modal servis merender checklist inline dan sinkron saat dibuka', () => {
  const modals = fs.readFileSync(path.join(root, 'modules/modals.js'), 'utf8');
  assert.match(modals, /id=\\?"servisChecklistPanel\\?"/);
  assert.match(carNotes, /Servis\.syncServiceChecklist\(\);\s*openModal\('servisModal'\)/);
});
