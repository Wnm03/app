'use strict';
// tests/database-api-vehicle-migration.test.js — cakupan modules/engine/
// database-api.js (Fase 1, Sesi 1: migrasi Vehicle Database 2 model).
//
// Dua kelompok test:
//  1. PARITY — bandingkan data di database-api.js dgn TORSI_DB/VEHICLE_SPEC_DB
//     ASLI (diambil langsung dari modules/vehicle/sparepart-servis-b.js lewat
//     extractArrayLiteral(), bukan disalin manual ke file test ini) untuk
//     entri Vario 125 & BeAT FI. Kalau source aslinya berubah, test ini ikut
//     gagal — sama filosofinya dgn loadSource() (lihat header file itu).
//  2. API — DatabaseAPI.vehicle.getAll()/getById()/findTorsiByName()/
//     findSpecByName() berperilaku sesuai kontrak, termasuk perilaku
//     "asimetris" yg SENGAJA dipertahankan dari data asli: torsi BeAT FI
//     cocok utk 'vario 110' (matchNames-nya menyertakan itu), TAPI spec BeAT
//     FI TIDAK (matchNames spec tidak menyertakan varian vario 110) — lihat
//     komentar sourceNote asli soal ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

/** Ambil literal array `const NAME=[...]` APA ADANYA dari file source asli
 * (brace/bracket-counting, pola sama extractFunction() di loadSource.js,
 * tapi utk array literal bukan function body), lalu eval di vm sandbox
 * kosong supaya dapat nilai JS sungguhan (bukan string) tanpa menyalin
 * ulang datanya manual ke file test ini. */
function extractArrayLiteral(file, constName) {
  const fullPath = path.join(ROOT, file);
  const src = fs.readFileSync(fullPath, 'utf8');
  const marker = `const ${constName}=[`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`extractArrayLiteral: "${marker}" tidak ditemukan di ${file}`);
  const bracketOpen = src.indexOf('[', start);
  let depth = 1;
  let i = bracketOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') depth--;
    i++;
  }
  const snippet = src.slice(bracketOpen, i);
  const context = vm.createContext({});
  new vm.Script(`this.__data = ${snippet};`, { filename: `${file}#${constName}` }).runInContext(context);
  return context.__data;
}

const SRC_FILE = 'modules/vehicle/sparepart-servis-b.js';
const NEW_FILE = 'modules/engine/database-api.js';

/** extractArrayLiteral() (vm context terpisah) & loadSource() (vm context
 * terpisah lagi) masing-masing punya realm Array/Object sendiri — objek
 * dari 2 realm beda TIDAK reference-equal secara prototype meski isinya
 * identik, bikin assert.deepStrictEqual salah lapor beda padahal sama.
 * plain() menormalkan lewat JSON round-trip (buang identitas realm,
 * sisakan isi murni) SEBELUM dibandingkan. Aman dipakai di sini krn semua
 * data yg dibandingkan cuma string/number/null/array/object polos (0
 * function, 0 Date, 0 undefined) — tidak ada yang hilang lewat JSON. */
function plain(x) { return JSON.parse(JSON.stringify(x)); }

test('PARITY: torsi.cats Vario 125 di database-api.js identik dgn TORSI_DB[0] asli', () => {
  const origTorsiDb = extractArrayLiteral(SRC_FILE, 'TORSI_DB');
  const origVario = origTorsiDb.find((s) => s.matchNames.some((m) => m === 'vario 125'));
  assert.ok(origVario, 'TORSI_DB asli harus punya entri vario 125 (kalau ini gagal, source berubah)');

  const ctx = loadSource([NEW_FILE], {}, ['VEHICLE_DB_RECORDS']);
  const rec = ctx.VEHICLE_DB_RECORDS.find((r) => r.id === 'vario-125');
  assert.ok(rec, 'VEHICLE_DB_RECORDS harus punya record vario-125');

  assert.deepStrictEqual(plain(rec.torsi.matchNames), plain(origVario.matchNames));
  assert.strictEqual(rec.torsi.sourceNote, origVario.sourceNote);
  assert.deepStrictEqual(plain(rec.torsi.cats), plain(origVario.cats));
});

test('PARITY: torsi.cats BeAT FI di database-api.js identik dgn TORSI_DB[1] asli', () => {
  const origTorsiDb = extractArrayLiteral(SRC_FILE, 'TORSI_DB');
  const origBeat = origTorsiDb.find((s) => s.matchNames.some((m) => m === 'beat fi'));
  assert.ok(origBeat, 'TORSI_DB asli harus punya entri beat fi');

  const ctx = loadSource([NEW_FILE], {}, ['VEHICLE_DB_RECORDS']);
  const rec = ctx.VEHICLE_DB_RECORDS.find((r) => r.id === 'beat-fi');
  assert.ok(rec);

  assert.deepStrictEqual(plain(rec.torsi.matchNames), plain(origBeat.matchNames));
  assert.strictEqual(rec.torsi.sourceNote, origBeat.sourceNote);
  assert.deepStrictEqual(plain(rec.torsi.cats), plain(origBeat.cats));
});

test('PARITY: spec (umum/ban/kelistrikan/batasServis) Vario 125 identik dgn VEHICLE_SPEC_DB[0] asli', () => {
  const origSpecDb = extractArrayLiteral(SRC_FILE, 'VEHICLE_SPEC_DB');
  const origVario = origSpecDb.find((s) => s.matchNames.some((m) => m === 'vario 125'));
  assert.ok(origVario);

  const ctx = loadSource([NEW_FILE], {}, ['VEHICLE_DB_RECORDS']);
  const rec = ctx.VEHICLE_DB_RECORDS.find((r) => r.id === 'vario-125');

  assert.deepStrictEqual(plain(rec.spec.matchNames), plain(origVario.matchNames));
  assert.strictEqual(rec.spec.sourceNote, origVario.sourceNote);
  assert.deepStrictEqual(plain(rec.spec.umum), plain(origVario.umum));
  assert.deepStrictEqual(plain(rec.spec.ban), plain(origVario.ban));
  assert.deepStrictEqual(plain(rec.spec.kelistrikan), plain(origVario.kelistrikan));
  assert.deepStrictEqual(plain(rec.spec.batasServis), plain(origVario.batasServis));
});

test('PARITY: spec (umum/ban/kelistrikan/batasServis) BeAT FI identik dgn VEHICLE_SPEC_DB[1] asli', () => {
  const origSpecDb = extractArrayLiteral(SRC_FILE, 'VEHICLE_SPEC_DB');
  const origBeat = origSpecDb.find((s) => s.matchNames.some((m) => m === 'beat fi'));
  assert.ok(origBeat);

  const ctx = loadSource([NEW_FILE], {}, ['VEHICLE_DB_RECORDS']);
  const rec = ctx.VEHICLE_DB_RECORDS.find((r) => r.id === 'beat-fi');

  assert.deepStrictEqual(plain(rec.spec.matchNames), plain(origBeat.matchNames));
  assert.strictEqual(rec.spec.sourceNote, origBeat.sourceNote);
  assert.deepStrictEqual(plain(rec.spec.umum), plain(origBeat.umum));
  assert.deepStrictEqual(plain(rec.spec.ban), plain(origBeat.ban));
  assert.deepStrictEqual(plain(rec.spec.kelistrikan), plain(origBeat.kelistrikan));
  assert.deepStrictEqual(plain(rec.spec.batasServis), plain(origBeat.batasServis));
});

test('PARITY: hanya 2 record (tidak ada model lain ikut/hilang tanpa sengaja)', () => {
  const ctx = loadSource([NEW_FILE], {}, ['VEHICLE_DB_RECORDS']);
  assert.strictEqual(ctx.VEHICLE_DB_RECORDS.length, 2);
  assert.deepStrictEqual(plain(ctx.VEHICLE_DB_RECORDS.map((r) => r.id).sort()), ['beat-fi', 'vario-125']);
});

test('API: DatabaseAPI.vehicle.getAll() balikin 2 record, dan hasilnya SALINAN (mutasi tidak bocor ke sumber)', () => {
  const ctx = loadSource([NEW_FILE], {}, ['DatabaseAPI']);
  const all1 = ctx.DatabaseAPI.vehicle.getAll();
  assert.strictEqual(all1.length, 2);
  all1.push({ id: 'suntikan-palsu' });
  const all2 = ctx.DatabaseAPI.vehicle.getAll();
  assert.strictEqual(all2.length, 2, 'push ke hasil getAll() sebelumnya tidak boleh mengubah data sumber');
});

test('API: DatabaseAPI.vehicle.getById() ketemu utk id valid, null utk id tidak ada/kosong', () => {
  const ctx = loadSource([NEW_FILE], {}, ['DatabaseAPI']);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.getById('vario-125').displayName, 'Honda Vario 125 (KZR)');
  assert.strictEqual(ctx.DatabaseAPI.vehicle.getById('beat-fi').displayName, 'Honda BeAT FI Gen 1');
  assert.strictEqual(ctx.DatabaseAPI.vehicle.getById('tidak-ada'), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.getById(''), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.getById(null), null);
});

test('API: findTorsiByName() — substring match case-insensitive, sama pola findTorsiDb() asli', () => {
  const ctx = loadSource([NEW_FILE], {}, ['DatabaseAPI']);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS 2023').cats.length, 8);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName('motor BEAT FI hitam').cats.length, 8);
  // asimetri asli: torsi BeAT FI juga dipakaikan utk Vario 110 (matchNames-nya menyertakan itu)
  assert.ok(ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 110 ESP'));
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName('Honda PCX 160'), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName(''), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName(null), null);
});

test('API: findSpecByName() — substring match case-insensitive, DAN mempertahankan asimetri asli (spec BeAT FI TIDAK dipakaikan ke Vario 110, beda dgn torsi)', () => {
  const ctx = loadSource([NEW_FILE], {}, ['DatabaseAPI']);
  assert.ok(ctx.DatabaseAPI.vehicle.findSpecByName('Honda Vario 125 2023'));
  assert.ok(ctx.DatabaseAPI.vehicle.findSpecByName('motor BEAT-FI hitam'));
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findSpecByName('Honda Vario 110 ESP'), null, 'spec.matchNames BeAT FI tidak menyertakan varian vario 110, beda dgn torsi.matchNames — harus dipertahankan apa adanya dari sumber asli');
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findSpecByName('Honda PCX 160'), null);
});

test('WINDOW: DatabaseAPI diekspos ke window (pola sama AIBus/VehicleCatalog)', () => {
  const windowObj = {};
  loadSource([NEW_FILE], { window: windowObj }, []);
  assert.strictEqual(typeof windowObj.DatabaseAPI, 'object');
  assert.strictEqual(typeof windowObj.DatabaseAPI.vehicle.getAll, 'function');
});
