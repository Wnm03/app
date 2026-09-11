'use strict';
// tests/database-api-master-generic-wiring-followup.test.js — cakupan sesi
// lanjutan setelah Sesi B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7
// baris 91 / §5.2): wiring 3 konsumen literal TERSISA ke DatabaseAPI --
// GENERIC_GROUP_BY_NAME, GENERIC_RECOMMEND_NAMES (sparepart-servis.js),
// FALLBACK_KEYWORDS (sparepart-servis-b.js) -- lewat namespace baru
// DatabaseAPI.master. Beda dari 4 konsumen yang sudah wired sebelumnya
// (findTorsiDb dkk, ke DatabaseAPI.vehicle): 3 data di sini generik
// lintas-model (bukan per-modelId), jadi cukup pola guard sync -- 0
// storage/IndexedDB ditambah sesi ini (beda dari DatabaseAPI.vehicle yang
// sudah py ensureLoaded() sejak Sesi B).
//
// Yang dites: (1) DatabaseAPI.master mengembalikan salinan data yang PERSIS
// sama isinya dgn literal asli di sparepart-servis.js/-b.js, (2) salinan
// dangkal (mutasi hasil tidak bocor ke sumber), (3) konsumen
// (_genericGroupByName/_genericRecommendNames/_fallbackKeywords, DAN
// resolveCatGroup/collectKnownGroups/suggestServiceIntervalKm yang
// memanggilnya) benar2 MEMBACA lewat DatabaseAPI.master saat tersedia
// (dibuktikan dgn override data lalu cek hasil ikut berubah -- bukan cuma
// fallback yg kebetulan sama), (4) 0 regresi -- tanpa DatabaseAPI sama
// sekali (file di-load sendirian), semua tetap jalan via literal fallback.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_A_FILE = 'modules/vehicle/sparepart-servis.js';
const SERVIS_B_FILE = 'modules/vehicle/sparepart-servis-b.js';

// ---------------------------------------------------------------------
// DatabaseAPI.master -- isi & salinan
// ---------------------------------------------------------------------

test('DatabaseAPI.master.getGenericGroupByName() -- isi sama persis literal GENERIC_GROUP_BY_NAME asli', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const fromApi = ctx.DatabaseAPI.master.getGenericGroupByName();
  assert.equal(fromApi['aki'].group, 'Kelistrikan & Panel');
  assert.equal(fromApi['kampas rem'].group, 'Sistem Rem');
  assert.equal(fromApi['oli mesin'].group, 'Perawatan Berkala');
  assert.equal(Object.keys(fromApi).length, 15);
});

test('DatabaseAPI.master.getGenericRecommendNames() -- isi sama persis literal GENERIC_RECOMMEND_NAMES asli', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const fromApi = ctx.DatabaseAPI.master.getGenericRecommendNames();
  // Array.from(...) -- fromApi.motor dibuat di realm vm sandbox (Array
  // constructor beda dari realm Node test ini), jadi assert.deepEqual
  // langsung sempat menganggapnya "tidak reference-equal" walau isinya
  // sama persis. Array.from() menormalkan ke Array realm test ini dulu
  // supaya perbandingan murni berdasar isi, bukan identitas constructor.
  assert.deepEqual(Array.from(fromApi.motor), ['Oli Mesin', 'Filter Oli', 'Oli Gardan', 'Busi', 'Filter Udara', 'Kampas Rem', 'V-Belt CVT', 'Roller CVT', 'Minyak Rem', 'Aki', 'Ban Depan']);
  assert.ok(fromApi.mobil.includes('Timing Belt'));
  assert.ok(fromApi.listrik.includes('Aki'));
});

test('DatabaseAPI.master.getFallbackKeywords() -- isi sama persis literal FALLBACK_KEYWORDS asli', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const fromApi = ctx.DatabaseAPI.master.getFallbackKeywords();
  assert.equal(fromApi.length, 12);
  const busi = fromApi.find((f) => f.keys.includes('busi'));
  assert.equal(busi.km, 8000);
  const aki = fromApi.find((f) => f.keys.includes('aki'));
  assert.equal(aki.km, 15000);
});

test('DatabaseAPI.master getters balikin salinan dangkal -- mutasi hasil tidak bocor ke panggilan berikutnya', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const g1 = ctx.DatabaseAPI.master.getGenericGroupByName();
  g1['aki'] = { group: 'DIRUSAK', icon: 'x' };
  g1['entri-baru'] = { group: 'baru', icon: 'x' };
  const g2 = ctx.DatabaseAPI.master.getGenericGroupByName();
  assert.equal(g2['aki'].group, 'Kelistrikan & Panel');
  assert.equal(g2['entri-baru'], undefined);

  const r1 = ctx.DatabaseAPI.master.getGenericRecommendNames();
  r1.motor.push('INJEKSI');
  const r2 = ctx.DatabaseAPI.master.getGenericRecommendNames();
  assert.equal(r2.motor.includes('INJEKSI'), false);

  const f1 = ctx.DatabaseAPI.master.getFallbackKeywords();
  f1.push({ keys: ['x'], km: 1, label: 'x' });
  const f2 = ctx.DatabaseAPI.master.getFallbackKeywords();
  assert.equal(f2.length, 12);
});

// ---------------------------------------------------------------------
// sparepart-servis.js -- _genericGroupByName()/_genericRecommendNames()
// dan konsumennya (resolveCatGroup/collectKnownGroups)
// ---------------------------------------------------------------------

test('_genericGroupByName()/_genericRecommendNames(): TANPA DatabaseAPI sama sekali -> fallback ke literal lokal (0 regresi)', () => {
  const ctx = loadSource([SERVIS_A_FILE]);
  assert.equal(typeof ctx.DatabaseAPI, 'undefined');
  const gmap = ctx._genericGroupByName();
  assert.equal(gmap['aki'].group, 'Kelistrikan & Panel');
  const rnames = ctx._genericRecommendNames();
  assert.ok(rnames.motor.includes('Busi'));
});

test('resolveCatGroup(): TANPA DatabaseAPI -> tetap kegrup via GENERIC_GROUP_BY_NAME literal (0 regresi)', () => {
  const ctx = loadSource([SERVIS_A_FILE]);
  const g = ctx.resolveCatGroup({ name: 'Aki' }, null);
  assert.equal(g.group, 'Kelistrikan & Panel');
  const lainnya = ctx.resolveCatGroup({ name: 'Part Tidak Dikenal XYZ' }, null);
  assert.equal(lainnya.group, 'Lainnya');
});

test('resolveCatGroup(): DENGAN DatabaseAPI.master ter-override -> MEMBACA lewat DatabaseAPI (bukan literal lokal)', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['DatabaseAPI']);
  // Override getGenericGroupByName supaya balikin data BEDA dari literal
  // asli -- kalau resolveCatGroup() ikut balikin nilai override ini,
  // terbukti dia benar2 baca lewat DatabaseAPI.master, bukan kebetulan
  // fallback yg nilainya sama.
  ctx.DatabaseAPI.master.getGenericGroupByName = () => ({ 'aki': { group: 'GRUP OVERRIDE TEST', icon: '🧪' } });
  const g = ctx.resolveCatGroup({ name: 'Aki' }, null);
  assert.equal(g.group, 'GRUP OVERRIDE TEST');
});

test('collectKnownGroups(): DENGAN DatabaseAPI.master ter-override -> grup override ikut muncul', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['DatabaseAPI']);
  ctx.DatabaseAPI.master.getGenericGroupByName = () => ({ 'x': { group: 'GRUP KNOWN OVERRIDE', icon: '🧪' } });
  const groups = ctx.collectKnownGroups();
  assert.ok(groups.some((g) => g.group === 'GRUP KNOWN OVERRIDE'));
});

test('_genericRecommendNames(): DENGAN DatabaseAPI.master ter-override -> MEMBACA lewat DatabaseAPI', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {}, ['DatabaseAPI']);
  ctx.DatabaseAPI.master.getGenericRecommendNames = () => ({ motor: ['PART OVERRIDE TEST'] });
  const rnames = ctx._genericRecommendNames();
  assert.deepEqual(rnames.motor, ['PART OVERRIDE TEST']);
});

// ---------------------------------------------------------------------
// sparepart-servis-b.js -- _fallbackKeywords() dan suggestServiceIntervalKm()
// ---------------------------------------------------------------------

// MY_WRENCH -- dideklarasikan di car-notes.js (bukan file yang dites di
// sini), tapi dibaca top-level oleh MY_WRENCH_SCALE di sparepart-servis-b.js.
// Di-inject minimal stub-nya saja (pola sama tests/suggest-service-interval-
// database-api-wiring-v1645.test.js) supaya file bisa di-load terisolasi
// tanpa ikut load seluruh car-notes.js -- tidak relevan dengan
// _fallbackKeywords()/suggestServiceIntervalKm() yang dites di sini.
const MY_WRENCH_STUB = { minLbft: 10, maxLbft: 80 };

test('_fallbackKeywords(): TANPA DatabaseAPI -> fallback ke literal FALLBACK_KEYWORDS_LITERAL (0 regresi)', () => {
  const ctx = loadSource([SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB });
  assert.equal(typeof ctx.DatabaseAPI, 'undefined');
  const fb = ctx._fallbackKeywords();
  assert.equal(fb.length, 12);
  assert.ok(fb.some((f) => f.keys.includes('busi')));
});

test('suggestServiceIntervalKm(): TANPA DatabaseAPI -> tetap dapat estimasi via FALLBACK_KEYWORDS literal (0 regresi)', () => {
  const ctx = loadSource([SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB });
  // 'battery' (bukan 'busi'/'aki') sengaja dipakai -- kata ini TIDAK muncul
  // di nama item TORSI_DB manapun (item TORSI_DB pakai istilah Indonesia),
  // jadi hasil dipastikan datang dari FALLBACK_KEYWORDS, bukan kebetulan
  // ketemu duluan di TORSI_DB literal (yg selalu tersedia di file ini
  // terlepas dari DatabaseAPI, krn TORSI_DB dideklarasikan di file yg sama).
  const reko = ctx.suggestServiceIntervalKm('battery', null);
  assert.ok(reko);
  assert.equal(reko.km, 15000);
  assert.match(reko.source, /bukan dari buku manual/);
});

test('suggestServiceIntervalKm(): DENGAN DatabaseAPI.master ter-override -> MEMBACA lewat DatabaseAPI (bukan literal lokal)', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB }, ['DatabaseAPI']);
  // Kosongkan DatabaseAPI.vehicle.getAll() supaya _allTorsiEntries() balikin
  // [] -- query 'Busi' TIDAK match TORSI_DB manapun (item 'Busi' asli di
  // TORSI_DB kebetulan juga bernilai 8.000 km, jadi tanpa langkah ini test
  // bisa "lolos" semu lewat jalur TORSI_DB, bukan lewat FALLBACK_KEYWORDS
  // yang mau dibuktikan di sini) -- pastikan benar2 jatuh ke fallback.
  ctx.DatabaseAPI.vehicle.getAll = () => [];
  ctx.DatabaseAPI.master.getFallbackKeywords = () => ([{ keys: ['busi'], km: 99999, label: 'OVERRIDE TEST LABEL' }]);
  const reko = ctx.suggestServiceIntervalKm('Busi', null);
  assert.ok(reko);
  assert.equal(reko.km, 99999);
  assert.match(reko.source, /OVERRIDE TEST LABEL/);
});
