'use strict';
// tests/sparepart-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js
//
// Sesi D-lanjutan5 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi D --
// keputusan produk item classify `null`). Lanjutan
// sparepart-mastercategoryfilter-sesi-d-lanjutan3.test.js (Sesi D-lanjutan3,
// v1670) yang sudah menutupi chip filter dasar -- file ini KHUSUS menutupi
// 2 penambahan baru sesi ini:
//   (1) Chip "❔ Belum Terklasifikasi" (UNCATEGORIZED_FILTER_ID) di
//       Sparepart.renderMasterCategoryChips()/renderCatList() -- SENGAJA
//       bukan kategori ke-14 di DatabaseAPI.masterCategory (kontrak "13
//       kategori terkunci" tidak disentuh), murni sentinel level UI.
//   (2) Persist activeMasterCategoryFilter ke localStorage
//       (_loadMasterCategoryFilterPrefsOnce()/_saveMasterCategoryFilterPrefs()).
//
// Yang dites:
// (1) Chip "❔ Belum Terklasifikasi" muncul di chip row, data-args-nya
//     UNCATEGORIZED_FILTER_ID (bukan salah satu dari 13 id terkunci).
// (2) Filter aktif dgn UNCATEGORIZED_FILTER_ID -- hanya kategori yang
//     classifyItemName()-nya balik null yang tampil.
// (3) Kategori yang classify-nya match (non-null) TIDAK ikut tampil saat
//     filter uncategorized aktif.
// (4) setMasterCategoryFilter(UNCATEGORIZED_FILTER_ID) menyimpan ke
//     localStorage lewat _saveMasterCategoryFilterPrefs().
// (5) setMasterCategoryFilter(id valid) menyimpan id itu ke localStorage.
// (6) _loadMasterCategoryFilterPrefsOnce() memulihkan UNCATEGORIZED_FILTER_ID
//     dari localStorage SEBELUM render pertama (renderCatList()).
// (7) _loadMasterCategoryFilterPrefsOnce() memulihkan id valid (salah satu
//     dari 13 kategori) dari localStorage.
// (8) _loadMasterCategoryFilterPrefsOnce() cuma baca sekali (guard) --
//     panggilan ke-2 TIDAK menimpa balik perubahan live di state UI.
// (9) localStorage berisi id ASING (tidak dikenal, mis. app versi lain) --
//     diabaikan, filter tetap default null ("Semua"), 0 crash.
// (10) localStorage JSON korup / localStorage undefined -- 0 throw, filter
//      tetap default null.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_A_FILE = 'modules/vehicle/sparepart-servis.js';

function makeDocumentStub() {
  const elements = {
    sparepartCatList: {
      innerHTML: '',
      insertAdjacentElement(pos, node) {
        if (pos === 'beforebegin') elements.sparepartMasterCatChipRow = node;
      },
    },
  };
  const documentStub = {
    elements,
    getElementById: (id) => (elements[id] !== undefined ? elements[id] : null),
    createElement: () => ({ style: {}, innerHTML: '', querySelector: () => ({}) }),
  };
  return documentStub;
}

// makeLocalStorageStub(initial) -- Map-backed, in-memory pengganti
// localStorage nyata di sandbox vm (loadSource() sendiri cuma kasih
// permissive no-op stub yang getItem-nya balik "stub object", bukan nilai
// asli) -- supaya bisa dites baca/tulisnya beneran.
function makeLocalStorageStub(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, val) { store.set(key, String(val)); },
    removeItem(key) { store.delete(key); },
    _store: store,
  };
}

function makeCtx({ D, documentStub, localStorage, files }) {
  return loadSource(files || [DB_API_FILE, SERVIS_A_FILE], {
    D,
    curVehicleId: 'v1',
    escapeHtml: (s) => String(s),
    document: documentStub,
    localStorage: localStorage || makeLocalStorageStub(),
  }, ['Sparepart', 'UNCATEGORIZED_FILTER_ID']);
}

function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Oli mesin', intervalKm: 2000 },
      { id: 'c2', name: 'Minyak rem', intervalKm: 8000 },
      // "Stiker body custom" SENGAJA 0 keyword cocok ke 13 kategori master
      // (dicek: bukan bagian keyword mana pun di MASTER_SERVICE_CATEGORIES_RECORDS,
      // modules/engine/database-api.js) -- classifyItemName() balik null.
      { id: 'c3', name: 'Stiker body custom', intervalKm: 0 },
    ],
    partsStock: [],
  };
}

test('renderMasterCategoryChips() -- chip "❔ Belum Terklasifikasi" muncul, data-args pakai UNCATEGORIZED_FILTER_ID (bukan salah satu dari 13 id terkunci)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  const chipHtml = documentStub.elements.sparepartMasterCatChipRow.innerHTML;
  assert.ok(chipHtml.includes('❔ Belum Terklasifikasi'));
  assert.ok(chipHtml.includes(JSON.stringify([ctx.UNCATEGORIZED_FILTER_ID]).replace(/"/g, '&quot;')) || chipHtml.includes(ctx.UNCATEGORIZED_FILTER_ID));
});

test('renderCatList() dgn filter UNCATEGORIZED_FILTER_ID -- hanya kategori yang classify-nya null yang tampil', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.activeMasterCategoryFilter = ctx.UNCATEGORIZED_FILTER_ID;
  ctx.Sparepart.renderCatList();
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Stiker body custom'), 'item classify null harus tampil di filter ini');
  assert.ok(!html.includes('Oli mesin'), 'item classify servis-mesin TIDAK boleh tampil');
  assert.ok(!html.includes('Minyak rem'), 'item classify sistem-pengereman TIDAK boleh tampil');
});

test('renderCatList() -- filter UNCATEGORIZED_FILTER_ID dgn 0 kategori classify-null -> pesan empty state', () => {
  const D = { sparepartCats: [{ id: 'c1', name: 'Oli mesin', intervalKm: 2000 }], partsStock: [] };
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.activeMasterCategoryFilter = ctx.UNCATEGORIZED_FILTER_ID;
  ctx.Sparepart.renderCatList();
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Tidak ada kategori sparepart utk kategori master ini'));
});

test('setMasterCategoryFilter(UNCATEGORIZED_FILTER_ID) -- disimpan ke localStorage lewat _saveMasterCategoryFilterPrefs()', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub();
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.setMasterCategoryFilter(ctx.UNCATEGORIZED_FILTER_ID);
  const raw = localStorage.getItem('sparepartMasterCategoryFilterPrefs');
  assert.ok(raw, 'harus ada data tersimpan');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.activeMasterCategoryFilter, ctx.UNCATEGORIZED_FILTER_ID);
});

test('setMasterCategoryFilter(id valid) -- id kategori master (bukan uncategorized) juga tersimpan ke localStorage', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub();
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.setMasterCategoryFilter('servis-mesin');
  const parsed = JSON.parse(localStorage.getItem('sparepartMasterCategoryFilterPrefs'));
  assert.equal(parsed.activeMasterCategoryFilter, 'servis-mesin');
});

test('_loadMasterCategoryFilterPrefsOnce() -- memulihkan UNCATEGORIZED_FILTER_ID dari localStorage SEBELUM render pertama', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    sparepartMasterCategoryFilterPrefs: JSON.stringify({ activeMasterCategoryFilter: '__uncategorized__' }),
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, null, 'sebelum render pertama, state in-memory masih default');
  ctx.Sparepart.renderCatList();
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, ctx.UNCATEGORIZED_FILTER_ID, 'renderCatList() harus load prefs sekali di awal');
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Stiker body custom'));
  assert.ok(!html.includes('Oli mesin'));
});

test('_loadMasterCategoryFilterPrefsOnce() -- memulihkan id kategori master valid dari localStorage', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    sparepartMasterCategoryFilterPrefs: JSON.stringify({ activeMasterCategoryFilter: 'sistem-pengereman' }),
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, 'sistem-pengereman');
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Minyak rem'));
  assert.ok(!html.includes('Oli mesin'));
});

test('_loadMasterCategoryFilterPrefsOnce() -- guard baca-sekali, panggilan ke-2 TIDAK menimpa balik perubahan live', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    sparepartMasterCategoryFilterPrefs: JSON.stringify({ activeMasterCategoryFilter: 'servis-mesin' }),
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, 'servis-mesin');
  // user ganti filter secara live (lewat setMasterCategoryFilter, yang juga
  // memanggil renderCatList() lagi di dalamnya) -- prefs di storage TIDAK
  // diubah manual, cuma state in-memory yang berubah lewat method publik.
  ctx.Sparepart.setMasterCategoryFilter(null);
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, null, 'render ke-2 tidak boleh baca ulang storage & menimpa balik ke servis-mesin');
});

test('localStorage berisi id ASING (tidak dikenal) -- diabaikan, filter tetap default null, 0 crash', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    sparepartMasterCategoryFilterPrefs: JSON.stringify({ activeMasterCategoryFilter: 'kategori-versi-lama-yang-sudah-dihapus' }),
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  assert.doesNotThrow(() => ctx.Sparepart.renderCatList());
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, null);
});

test('localStorage JSON korup -- 0 throw, filter tetap default null ("Semua")', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    sparepartMasterCategoryFilterPrefs: '{ini bukan json valid',
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  assert.doesNotThrow(() => ctx.Sparepart.renderCatList());
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, null);
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Oli mesin'), 'daftar tetap tampil normal (0 filter) walau storage korup');
});
