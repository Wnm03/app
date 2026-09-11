'use strict';
// tests/servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js
//
// Sesi D-lanjutan5 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi D --
// keputusan produk item classify `null`). Lanjutan
// servis-mastercategoryfilter-sesi-d-lanjutan4.test.js (Sesi D-lanjutan4,
// v1673) -- file ini KHUSUS menutupi 2 penambahan baru sesi ini di
// Servis.renderList() (Riwayat Servis, car-notes.js):
//   (1) Chip "❔ Belum Terklasifikasi" (UNCATEGORIZED_FILTER_ID, dideklarasikan
//       di modules/vehicle/sparepart-servis.js) -- cocokkan entry yang
//       resolveLogMasterCategoryId(s)-nya null.
//   (2) Persist activeMasterCategoryFilter ke localStorage, key TERPISAH
//       dari Sparepart ('servisMasterCategoryFilterPrefs').
//
// Yang dites:
// (1) Chip "❔ Belum Terklasifikasi" muncul di chip row masterCategory.
// (2) Filter aktif dgn UNCATEGORIZED_FILTER_ID -- hanya entry yang
//     resolveLogMasterCategoryId()-nya null yang tampil.
// (3) Entry yang categoryId-nya classify match (non-null) TIDAK ikut
//     tampil saat filter uncategorized aktif.
// (4) setMasterCategoryFilter(UNCATEGORIZED_FILTER_ID) menyimpan ke
//     localStorage key 'servisMasterCategoryFilterPrefs' (BUKAN key
//     Sparepart).
// (5) _loadMasterCategoryFilterPrefsOnce() memulihkan UNCATEGORIZED_FILTER_ID
//     dari localStorage SEBELUM render pertama (renderList()).
// (6) _loadMasterCategoryFilterPrefsOnce() cuma baca sekali (guard) --
//     panggilan ke-2 TIDAK menimpa balik perubahan live.
// (7) localStorage JSON korup -- 0 throw, filter tetap default null.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SPAREPART_FILE = 'modules/vehicle/sparepart-servis.js';
const CAR_NOTES_FILE = 'car-notes.js';

function makeDocumentStub() {
  const elements = {
    servisList: {
      innerHTML: '',
      insertAdjacentElement(pos, node) {
        if (pos === 'beforebegin') {
          if (!elements.servisActionTypeChipRow) elements.servisActionTypeChipRow = node;
          else elements.servisMasterCatChipRow = node;
        }
        if (pos === 'afterend') elements.servisListLoadMoreWrap = node;
      },
    },
    servisCount: { textContent: '' },
    servisTotalCost: { textContent: '' },
    servisLastKm: { textContent: '' },
    servisListLoadMoreWrap: null,
  };
  const documentStub = {
    elements,
    getElementById: (id) => (elements[id] !== undefined ? elements[id] : null),
    createElement: () => ({ style: {}, innerHTML: '', querySelector: () => ({}) }),
  };
  return documentStub;
}

// makeLocalStorageStub(initial) -- lihat catatan sama persis di
// tests/sparepart-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js
function makeLocalStorageStub(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, val) { store.set(key, String(val)); },
    removeItem(key) { store.delete(key); },
    _store: store,
  };
}

function makeCtx({ D, documentStub, localStorage, files, extra }) {
  return loadSource(files || [DB_API_FILE, SPAREPART_FILE, CAR_NOTES_FILE], {
    D,
    curVehicleId: 'v1',
    uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    escapeHtml: (s) => String(s),
    save() {},
    closeModal() {},
    renderDashboard() {},
    renderKeuangan() {},
    toast() {},
    askConfirm: async () => true,
    showPromptModal: async () => '0',
    getVehicleKm: () => 15000,
    estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: () => false,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    AIBus: { emit() {} },
    document: documentStub,
    getCnRange: () => ({ from: new Date('2000-01-01'), to: new Date('2100-01-01') }),
    TX_PAGE_SIZE: 50,
    fmt: (n) => String(n),
    localStorage: localStorage || makeLocalStorageStub(),
    ...extra,
  }, ['Servis', 'UNCATEGORIZED_FILTER_ID']);
}

// "Cuci motor" -- item non-sparepart yang SENGAJA 0 categoryId & 0 match nama
// ke kategori manapun (D.sparepartCats di bawah cuma isi 'Oli mesin'), jadi
// resolveLogMasterCategoryId() balik null lewat jalur "0 linkedCat sama
// sekali" -- merepresentasikan entry yang classify-nya "tidak diketahui"
// dari sudut pandang chip "❔ Belum Terklasifikasi" (pola sama Sparepart:
// item classify null tetap harus bisa ditinjau).
function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Oli mesin', intervalKm: 2000 },
    ],
    servisLogs: [
      { id: 's1', vehicleId: 'v1', date: '2026-09-01', item: 'Ganti Oli Mesin', categoryId: 'c1', km: 15000, cost: 50000, note: '', actionType: null },
      { id: 's2', vehicleId: 'v1', date: '2026-09-02', item: 'Cuci motor', categoryId: null, km: 15000, cost: 15000, note: '', actionType: 'ganti' },
    ],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: [],
  };
}

test('renderList() -- chip "❔ Belum Terklasifikasi" muncul di chip row masterCategory', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  const chipHtml = documentStub.elements.servisMasterCatChipRow.innerHTML;
  assert.ok(chipHtml.includes('❔ Belum Terklasifikasi'));
  assert.ok(chipHtml.includes(ctx.UNCATEGORIZED_FILTER_ID));
});

test('renderList() dgn filter UNCATEGORIZED_FILTER_ID -- hanya entry yang resolveLogMasterCategoryId()-nya null yang tampil', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.activeMasterCategoryFilter = ctx.UNCATEGORIZED_FILTER_ID;
  ctx.Servis.renderList();
  assert.equal(documentStub.elements.servisCount.textContent, 1);
  const html = documentStub.elements.servisList.innerHTML;
  assert.ok(html.includes('Cuci motor'), 'entry tanpa kategori master harus tampil di filter ini');
  assert.ok(!html.includes('Ganti Oli Mesin'), 'entry classify servis-mesin TIDAK boleh tampil');
});

test('renderList() -- filter UNCATEGORIZED_FILTER_ID dgn 0 entry classify-null -> pesan empty state', () => {
  const D = { sparepartCats: [{ id: 'c1', name: 'Oli mesin', intervalKm: 2000 }], servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2026-09-01', item: 'Ganti Oli Mesin', categoryId: 'c1', km: 15000, cost: 50000, note: '', actionType: null }], transactions: [], accounts: [], vehicles: [{ id: 'v1', name: 'Vario 125' }], partsStock: [] };
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.activeMasterCategoryFilter = ctx.UNCATEGORIZED_FILTER_ID;
  ctx.Servis.renderList();
  const html = documentStub.elements.servisList.innerHTML;
  assert.ok(html.includes('Tidak ada catatan servis utk kategori master ini'));
});

test('setMasterCategoryFilter(UNCATEGORIZED_FILTER_ID) -- tersimpan ke localStorage key servisMasterCategoryFilterPrefs (BUKAN key Sparepart)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub();
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.setMasterCategoryFilter(ctx.UNCATEGORIZED_FILTER_ID);
  const raw = localStorage.getItem('servisMasterCategoryFilterPrefs');
  assert.ok(raw, 'harus ada data tersimpan di key Servis');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.activeMasterCategoryFilter, ctx.UNCATEGORIZED_FILTER_ID);
  assert.equal(localStorage.getItem('sparepartMasterCategoryFilterPrefs'), null, 'key Sparepart tidak boleh ikut ditulis');
});

test('_loadMasterCategoryFilterPrefsOnce() -- memulihkan UNCATEGORIZED_FILTER_ID dari localStorage SEBELUM render pertama', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    servisMasterCategoryFilterPrefs: JSON.stringify({ activeMasterCategoryFilter: '__uncategorized__' }),
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  assert.equal(ctx.Servis.activeMasterCategoryFilter, null, 'sebelum render pertama, state in-memory masih default');
  ctx.Servis.renderList();
  assert.equal(ctx.Servis.activeMasterCategoryFilter, ctx.UNCATEGORIZED_FILTER_ID, 'renderList() harus load prefs sekali di awal');
  assert.equal(documentStub.elements.servisCount.textContent, 1);
});

test('_loadMasterCategoryFilterPrefsOnce() -- guard baca-sekali, panggilan ke-2 TIDAK menimpa balik perubahan live', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    servisMasterCategoryFilterPrefs: JSON.stringify({ activeMasterCategoryFilter: '__uncategorized__' }),
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  assert.equal(ctx.Servis.activeMasterCategoryFilter, ctx.UNCATEGORIZED_FILTER_ID);
  ctx.Servis.setMasterCategoryFilter(null);
  assert.equal(ctx.Servis.activeMasterCategoryFilter, null, 'render ke-2 tidak boleh baca ulang storage & menimpa balik');
});

test('localStorage JSON korup (key Servis) -- 0 throw, filter tetap default null ("Semua")', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const localStorage = makeLocalStorageStub({
    servisMasterCategoryFilterPrefs: '{ini bukan json valid',
  });
  const ctx = makeCtx({ D, documentStub, localStorage });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  assert.doesNotThrow(() => ctx.Servis.renderList());
  assert.equal(ctx.Servis.activeMasterCategoryFilter, null);
  assert.equal(documentStub.elements.servisCount.textContent, 2, 'daftar tetap tampil normal (0 filter) walau storage korup');
});
