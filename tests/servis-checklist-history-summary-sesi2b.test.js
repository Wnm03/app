const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const checklist = fs.readFileSync(path.join(root, 'modules/vehicle/servis-checklist.js'), 'utf8');
const carNotes = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');

test('Sesi 2B: SoT menyediakan ringkasan checklist per log untuk Riwayat Servis', () => {
  assert.match(checklist, /summaryFromLog\(log\) \{/);
  assert.match(checklist, /const total = SERVICE_CHECKLIST_GROUPS\.reduce/);
  assert.match(checklist, /const rows = Array\.isArray\(log && log\.checklist\)/);
  assert.match(checklist, /return \{ checked: validIds\.size, total, replaced, inspected \};/);
});

test('Sesi 2B: Riwayat Servis menampilkan x/total + ringkasan tindakan tanpa membuat data baru', () => {
  assert.match(carNotes, /ServisChecklist\.summaryFromLog\(s\)/);
  assert.match(carNotes, /☑️ \$\{checklistSummary\.checked\}\/\$\{checklistSummary\.total\}/);
  assert.match(carNotes, /🔧 \$\{checklistSummary\.replaced\} diganti/);
  assert.match(carNotes, /🔍 \$\{checklistSummary\.inspected\} diperiksa/);
  assert.doesNotMatch(carNotes, /D\.servisLogs\.push\(\{[^}]*checklistInfo/);
});

test('Sesi 2B: edit catatan membuka kategori pertama yang berisi checklist tersimpan', () => {
  assert.match(checklist, /firstCheckedGroup\(\) \{/);
  assert.match(carNotes, /ServisChecklist\.loadFromLog\(s\); Servis\._serviceChecklistGroupIdx=ServisChecklist\.firstCheckedGroup\(\);/);
});
