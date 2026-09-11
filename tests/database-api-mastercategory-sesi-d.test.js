'use strict';
// tests/database-api-mastercategory-sesi-d.test.js — cakupan Sesi D
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 "Sesi D — service_categories
// master (13 kategori terkunci)"). Sumber 13 kategori: breakdown servis
// Honda Vario 125 KZR 2012 (PGM-FI gen. pertama) diberikan W sbg keputusan
// produk sesi ini (lihat komentar namespace masterCategory di
// modules/engine/database-api.js).
//
// Yang dites: (1) DatabaseAPI.masterCategory.getAll() balikin PERSIS 13
// kategori terkunci (id/name/icon, TANPA field keywords internal); (2)
// getById() untuk id valid & tidak valid; (3) classifyItemName() -- sampel
// nama item nyata dari TORSI_DB (sparepart-servis-b.js) utk tiap kategori,
// termasuk kasus 0 match (null, TIDAK menebak); (4) salinan dangkal (mutasi
// hasil getAll() tidak bocor ke sumber); (5) resolveCatGroup()
// (sparepart-servis.js) -- field BARU masterCategoryId/-Name/-Icon
// ADDITIVE, field group/icon LAMA di semua cabang (cat.group tersimpan,
// match TORSI_DB, GENERIC_GROUP_BY_NAME fallback, 'Lainnya') 0 berubah
// (0 regresi thd kontrak lama); (6) guard 0 DatabaseAPI sama sekali (file
// sparepart-servis.js dimuat sendirian) -- masterCategoryId dkk jadi null,
// group/icon lama tetap jalan seperti sebelum Sesi D ada.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_A_FILE = 'modules/vehicle/sparepart-servis.js';

const EXPECTED_IDS = [
  'servis-mesin', 'servis-cvt', 'sistem-injeksi-pgmfi', 'sistem-bahan-bakar',
  'sistem-pendingin', 'sistem-pengereman', 'suspensi', 'sistem-kemudi',
  'kelistrikan', 'roda', 'filter-udara', 'final-gear', 'body-kontrol',
];

// ---------------------------------------------------------------------
// DatabaseAPI.masterCategory -- isi & bentuk data
// ---------------------------------------------------------------------

test('DatabaseAPI.masterCategory.getAll() -- persis 13 kategori terkunci, urutan & id sesuai desain', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const all = ctx.DatabaseAPI.masterCategory.getAll();
  assert.equal(all.length, 13);
  // Array.from() -- hasil all.map() masih array dari realm vm sandbox
  // (constructor beda dari realm Node test ini), jadi deepEqual butuh
  // dikonversi dulu (pola sama persis
  // database-api-master-generic-wiring-followup.test.js).
  assert.deepEqual(Array.from(all.map((c) => c.id)), EXPECTED_IDS);
  all.forEach((c) => {
    assert.equal(typeof c.name, 'string');
    assert.ok(c.name.length > 0);
    assert.equal(typeof c.icon, 'string');
    assert.equal(c.keywords, undefined, 'field keywords internal tidak boleh bocor ke getAll()');
  });
});

test('DatabaseAPI.masterCategory.getAll() -- salinan dangkal, mutasi hasil tidak bocor ke sumber', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const first = ctx.DatabaseAPI.masterCategory.getAll();
  first[0].name = 'RUSAK';
  first.push({ id: 'palsu', name: 'Palsu', icon: '❌' });
  const second = ctx.DatabaseAPI.masterCategory.getAll();
  assert.equal(second.length, 13);
  assert.notEqual(second[0].name, 'RUSAK');
});

test('DatabaseAPI.masterCategory.getById() -- id valid balikin kategori, id tidak dikenal/kosong balikin null', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  assert.equal(ctx.DatabaseAPI.masterCategory.getById('servis-cvt').name, 'Servis CVT');
  assert.equal(ctx.DatabaseAPI.masterCategory.getById('tidak-ada'), null);
  assert.equal(ctx.DatabaseAPI.masterCategory.getById(''), null);
  assert.equal(ctx.DatabaseAPI.masterCategory.getById(null), null);
});

// ---------------------------------------------------------------------
// classifyItemName() -- sampel nama item nyata dari TORSI_DB per kategori
// ---------------------------------------------------------------------

test('classifyItemName() -- sampel nama item nyata TORSI_DB per kategori, classify benar', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const cls = ctx.DatabaseAPI.masterCategory.classifyItemName;
  const cases = [
    ['Mur cylinder head', 'servis-mesin'],
    ['Baut stopper camshaft', 'servis-mesin'],
    ['Mur drive pulley face', 'servis-cvt'],
    ['Mur kopling/driven pulley', 'servis-cvt'],
    ['Sensor ECT', 'sistem-injeksi-pgmfi'],
    ['Baut pemasangan joint injector', 'sistem-injeksi-pgmfi'],
    ['Mur plat pemasangan pompa bahan bakar', 'sistem-bahan-bakar'],
    ['Baut pembuangan radiator', 'sistem-pendingin'],
    ['Baut pemasangan kipas pendingin', 'sistem-pendingin'],
    ['Pin brake pad (kampas rem)', 'sistem-pengereman'],
    ['Baut oli selang rem', 'sistem-pengereman'],
    ['Baut socket fork', 'suspensi'],
    ['Baut pemasangan atas shock absorber', 'suspensi'],
    ['Mur pengunci poros kemudi', 'sistem-kemudi'],
    ['Mur batang stang kemudi', 'sistem-kemudi'],
    ['Baut socket pemasangan stator', 'kelistrikan'],
    ['Mur flywheel', 'kelistrikan'],
    ['Mur as roda depan', 'roda'],
    ['Mur as roda belakang', 'roda'],
    ['Saringan udara', 'filter-udara'],
    ['Baut pemeriksaan oli final reduction', 'final-gear'],
    ['Baut pembuangan oli final reduction (transmisi)', 'final-gear'],
    ['Mur pengunci kabel gas', 'body-kontrol'],
    ['Sekrup pemasangan kunci kontak', 'body-kontrol'],
  ];
  cases.forEach(([name, expectedId]) => {
    const got = cls(name);
    assert.ok(got, `expected match utk "${name}", dapat null`);
    assert.equal(got.id, expectedId, `"${name}" -> dapat "${got && got.id}", expect "${expectedId}"`);
  });
});

test('classifyItemName() -- case-insensitive & tersubstring dalam kalimat lebih panjang', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const cls = ctx.DatabaseAPI.masterCategory.classifyItemName;
  assert.equal(cls('BUSI IRIDIUM NGK').id, 'servis-mesin');
  assert.equal(cls('ganti oli gardan rutin').id, 'final-gear');
});

test('classifyItemName() -- 0 keyword cocok balikin null (tidak menebak), termasuk input kosong/null', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const cls = ctx.DatabaseAPI.masterCategory.classifyItemName;
  assert.equal(cls('Mur pengunci kabel penghubung equalizer (tipe CBS)'), null);
  assert.equal(cls(''), null);
  assert.equal(cls(null), null);
  assert.equal(cls(undefined), null);
});

// ---------------------------------------------------------------------
// resolveCatGroup() (sparepart-servis.js) -- wiring additive, 0 regresi
// ---------------------------------------------------------------------

test('resolveCatGroup(): cat.group tersimpan -- group/icon LAMA 0 berubah, masterCategoryId BARU terisi additive', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['resolveCatGroup', 'DatabaseAPI']);
  const cat = { name: 'Kampas Rem Depan', group: 'Grup Manual Custom', groupIcon: '🔴' };
  const r = ctx.resolveCatGroup(cat, null);
  assert.equal(r.group, 'Grup Manual Custom');
  assert.equal(r.icon, '🔴');
  assert.equal(r.masterCategoryId, 'sistem-pengereman');
  assert.equal(r.masterCategoryName, 'Sistem Pengereman');
});

test('resolveCatGroup(): cat tanpa group, 0 match apa pun -- fallback "Lainnya" LAMA 0 berubah, masterCategoryId null', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['resolveCatGroup', 'DatabaseAPI']);
  const cat = { name: 'Nama Aneh Tidak Dikenal Xyz' };
  const r = ctx.resolveCatGroup(cat, null);
  assert.equal(r.group, 'Lainnya');
  assert.equal(r.icon, '📦');
  assert.equal(r.masterCategoryId, null);
});

test('resolveCatGroup(): cat null -- kontrak lama 0 berubah (group Lainnya), masterCategoryId null, tidak throw', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['resolveCatGroup', 'DatabaseAPI']);
  const r = ctx.resolveCatGroup(null, null);
  assert.equal(r.group, 'Lainnya');
  assert.equal(r.masterCategoryId, null);
});

test('resolveCatGroup(): fallback GENERIC_GROUP_BY_NAME (mis. "aki") -- group/icon LAMA 0 berubah, masterCategoryId additive, DAN sumber GENERIC_GROUP_BY_NAME_RECORDS tidak ke-mutasi (regresi tersembunyi kalau return referensi langsung)', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['resolveCatGroup', 'DatabaseAPI']);
  const r1 = ctx.resolveCatGroup({ name: 'Aki' }, null);
  assert.equal(r1.group, 'Kelistrikan & Panel');
  assert.equal(r1.icon, '🔌');
  assert.equal(r1.masterCategoryId, 'kelistrikan');
  // panggil lagi -- kalau r1 kemarin memutasi objek sumber (bukan salinan),
  // pemanggilan ke-2 ini akan ikut "tercemar" field masterCategory* dari r1
  // meskipun logicnya identik (harusnya deterministik, bukan stateful).
  const r2 = ctx.resolveCatGroup({ name: 'Aki' }, null);
  assert.equal(r2.group, 'Kelistrikan & Panel');
  assert.equal(r2.masterCategoryId, 'kelistrikan');
});

test('resolveCatGroup(): DatabaseAPI TIDAK termuat sama sekali (file dimuat sendirian) -- group/icon LAMA tetap jalan spt sebelum Sesi D, masterCategoryId null (guard aman, 0 throw)', () => {
  const ctx = loadSource([SERVIS_A_FILE], {}, ['resolveCatGroup']);
  const r = ctx.resolveCatGroup({ name: 'Aki' }, null);
  assert.equal(r.group, 'Kelistrikan & Panel');
  assert.equal(r.icon, '🔌');
  assert.equal(r.masterCategoryId, null);
  assert.equal(r.masterCategoryName, null);
  assert.equal(r.masterCategoryIcon, null);
});
