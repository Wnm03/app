'use strict';
// S2731.3 — master Gasket Tutup Head, konsolidasi Kabel Rem Belakang (alias kompatibel), pemetaan log Seal Head.
const test = require('node:test');
const synth = require('./_synthetic-data-fix');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const master = require(path.join(ROOT, 'modules/vehicle/service-master-data.generated.js'));
globalThis.__SERVICE_CHECKLIST_GROUPS__ = master.SERVICE_CHECKLIST_GROUPS;
globalThis.__SERVICE_COMPONENT_ID_ALIASES__ = master.SERVICE_COMPONENT_ID_ALIASES;
const tax = require(path.join(ROOT, 'modules/vehicle/service-taxonomy-sot.js'));
const FIXED = synth.s2731Fixed(); // data asli bila ada, selain itu sintetis (tanpa data pribadi)
const all = () => master.SERVICE_CHECKLIST_GROUPS.flatMap(g => g.items.map(i => Object.assign({ cat: g.masterCategoryId }, i)));

test('master Gasket Tutup Head: satu entri, Servis Mesin, tanpa interval', () => {
  const hits = all().filter(i => i.id === 'gasket-tutup-head');
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].cat, 'servis-mesin');
  ['intervalKm', 'intervalTimeMonths', 'resetType', 'gantiResetsInterval'].forEach(k => assert.strictEqual(hits[0][k], null, k));
  assert.strictEqual(hits[0].actionMode, 'periksa');
  // tidak mengambil identitas komponen yang sudah ada
  assert.notStrictEqual(hits[0].name, all().find(i => i.id === 'cylinder-gasket').name);
});

test('jumlah komponen tetap 102 dan tidak ada ID ganda', () => {
  const ids = all().map(i => i.id);
  assert.strictEqual(ids.length, 102);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('kabel-rem-belakang-body = alias: tidak aktif, resolve ke kanonik, satu representasi aktif', () => {
  assert.strictEqual(all().filter(i => i.id === 'kabel-rem-belakang-body').length, 0);
  assert.strictEqual(all().filter(i => /^kabel rem belakang$/i.test(i.name)).length, 1);
  assert.strictEqual(master.SERVICE_COMPONENT_ID_ALIASES['kabel-rem-belakang-body'], 'kabel-rem-belakang');
  assert.strictEqual(tax.componentById('kabel-rem-belakang-body').id, 'kabel-rem-belakang');
  assert.strictEqual(tax.resolve({ serviceComponentId: 'kabel-rem-belakang-body' }).serviceComponentId, 'kabel-rem-belakang');
  assert.strictEqual(tax.components().filter(c => /kabel-rem-belakang/.test(c.id)).length, 1);
});

test('kabel-gas-standar-kunci tidak berubah (komponen gabungan, interval 8000 km)', () => {
  const k = all().find(i => i.id === 'kabel-gas-standar-kunci');
  assert.ok(k);
  assert.strictEqual(k.intervalKm, 8000);
  assert.strictEqual(k.resetType, 'km');
  assert.strictEqual(k.cat, 'body-kontrol');
});

test('data: Seal Head terpetakan, teks/tanggal/km asli utuh, tanpa baseline/jadwal baru', () => {
  const d = JSON.parse(fs.readFileSync(FIXED, 'utf8'));
  const l = d.servisLogs.find(x => x.id === 1783591790532);
  assert.strictEqual(l.item, 'Seal Head');
  assert.strictEqual(l.date, '2025-07-23');
  assert.strictEqual(l.serviceComponentId, 'gasket-tutup-head');
  assert.strictEqual(l.masterCategoryId, 'servis-mesin');
  assert.ok(l.nextDueKm == null && l.nextDueDate == null, 'tidak boleh ada jatuh tempo baru');
  const sched = JSON.stringify(d.vehicles.map(v => v.sot && v.sot.serviceSchedules));
  assert.ok(!/gasket-tutup-head/.test(sched), 'tidak ada jadwal pengingat otomatis');
});

test('data: 7 log tanpa padanan tidak berubah (Seal Magnet tetap tanpa komponen)', () => {
  const d = JSON.parse(fs.readFileSync(FIXED, 'utf8'));
  const expect = { 1782820344534: 'Gasket Stator Base', 1782820344535: 'Gasket Stator Base', 1782820344536: 'Seal Magnet', 1782820344540: 'Jasa Pasang Stang Laher', 1782820344612: 'Ban Dalam', 1783591790515: 'Jasa Overhoul', 1783591790610: 'Pembersihan Rem' };
  Object.keys(expect).forEach(id => {
    const l = d.servisLogs.find(x => String(x.id) === id);
    assert.strictEqual(l.item, expect[id]);
    assert.ok(!l.serviceComponentId, id + ' harus tetap tanpa komponen');
  });
  assert.strictEqual(d.servisLogs.filter(l => !l.serviceComponentId).length, 7);
});

test('data: tidak ada referensi ke ID alias aktif; skrip idempoten (0 perubahan)', () => {
  assert.ok(!/"serviceComponentId":"kabel-rem-belakang-body"/.test(fs.readFileSync(FIXED, 'utf8')));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's2731-3-'));
  const out = path.join(tmp, 'out.json'), rep = path.join(tmp, 'rep.json');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/fix-backup-service-sot-s2731.js'), FIXED, out, '--report', rep], { stdio: 'ignore' });
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(rep, 'utf8')).changes, {});
});
