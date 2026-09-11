'use strict';
// tests/servis-mastercategoryfilter-sesi-d-lanjutan4.test.js
//
// Sesi D-lanjutan4 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi D --
// item "filter/chip masterCategory di Servis.renderList() (Riwayat
// Servis)" yang SENGAJA ditunda di Sesi D-lanjutan3 (v1670, lihat
// SESSION-NOTE-sesi-d-lanjutan3-mastercategoryfilter-v1670.md "Sengaja
// TIDAK dikerjakan sesi ini"). Target: Servis.renderList() (Riwayat
// Servis) -- daftar LOG, beda dari Sparepart.renderCatList() (daftar
// KATEGORI) yang sudah dikerjakan D-lanjutan3.
//
// Pola SAMA PERSIS Servis.renderActionTypeChips()/setActionTypeFilter()
// (Sesi E6) & Sparepart.renderMasterCategoryChips()/setMasterCategoryFilter()
// (Sesi D-lanjutan3) -- chip row disisipkan lewat JS sebelum #servisList
// (bukan markup statis), 1x dibuat, tidak dobel-insert di render
// berikutnya. 0 fungsi classify baru -- reuse resolveCatGroup() apa
// adanya (SoT tunggal) lewat resolveLogMasterCategoryId(s), fungsi join
// baru yang menautkan 1 entry servisLogs balik ke kategori masternya.
//
// Yang dites:
// (1) renderList() default (activeMasterCategoryFilter=null) -- 0 filter
//     tambahan, perilaku identik sebelum sesi ini (0 regresi).
// (2) renderList() dgn filter aktif -- hanya entry yg categoryId-nya
//     classify ke masterCategoryId yg match yang tampil.
// (3) Filter dgn 0 match -- pesan empty khusus.
// (4) Chip row disisipkan 1x (tidak dobel-insert di render ke-2), TIDAK
//     mengganggu chip row actionType (E6) yang sudah ada.
// (5) Chip "Semua" bertanda active saat filter null.
// (6) Chip row memuat 14 chip (1 "Semua" + 13 kategori master terkunci).
// (7) setMasterCategoryFilter(id) mengubah state + reset listPage + render
//     ulang.
// (8) setMasterCategoryFilter(null) -- kembali ke "Semua".
// (9) resolveLogMasterCategoryId(s) -- fallback by-nama (resolveServisCat-
//     ForVehicle) utk entry lama tanpa categoryId.
// (10) 0 DatabaseAPI.masterCategory sama sekali -- chip row TIDAK dibuat,
//      0 error, daftar tetap tampil apa adanya (fail-safe, tidak menebak).

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
          // Sesi E6 (actionType) insert dulu, Sesi D-lanjutan4 (masterCategory)
          // insert kedua -- keduanya 'beforebegin' relatif ke #servisList,
          // jadi panggilan kedua menempatkan row-nya SETELAH row pertama
          // (urutan tampil: actionType di atas, masterCategory di bawahnya).
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
  let createElementCalls = 0;
  const documentStub = {
    elements,
    getElementById: (id) => (elements[id] !== undefined ? elements[id] : null),
    createElement: () => {
      createElementCalls++;
      return { style: {}, innerHTML: '', querySelector: () => ({}) };
    },
    getCreateElementCalls: () => createElementCalls,
  };
  return documentStub;
}

function makeCtx({ D, documentStub, files, extra }) {
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
    ...extra,
  }, ['Servis']);
}

// Oli mesin -> classify 'servis-mesin'; Minyak rem/Kampas rem -> classify
// 'sistem-pengereman' (mapping sama persis yg dipakai test D-lanjutan3).
function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Oli mesin', intervalKm: 2000 },
      { id: 'c2', name: 'Minyak rem', intervalKm: 8000 },
      { id: 'c3', name: 'Kampas rem', intervalKm: 15000 },
    ],
    servisLogs: [
      { id: 's1', vehicleId: 'v1', date: '2026-09-01', item: 'Ganti Oli Mesin', categoryId: 'c1', km: 15000, cost: 50000, note: '', actionType: null },
      { id: 's2', vehicleId: 'v1', date: '2026-09-02', item: 'Cek Minyak Rem', categoryId: 'c2', km: 15000, cost: 0, note: '', actionType: 'periksa' },
      { id: 's3', vehicleId: 'v1', date: '2026-09-03', item: 'Ganti Kampas Rem', categoryId: 'c3', km: 15000, cost: 120000, note: '', actionType: 'ganti' },
    ],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: [],
  };
}

test('renderList() default (activeMasterCategoryFilter=null) -- 0 filter tambahan, semua 3 entry tampil (0 regresi)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  assert.equal(documentStub.elements.servisCount.textContent, 3);
});

test("renderList() dgn activeMasterCategoryFilter='sistem-pengereman' -- hanya entry yg categoryId-nya classify ke Sistem Pengereman yang tampil", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.activeMasterCategoryFilter = 'sistem-pengereman';
  ctx.Servis.renderList();
  assert.equal(documentStub.elements.servisCount.textContent, 2);
  const html = documentStub.elements.servisList.innerHTML;
  assert.ok(html.includes('Cek Minyak Rem'));
  assert.ok(html.includes('Ganti Kampas Rem'));
  assert.ok(!html.includes('Ganti Oli Mesin'));
});

test('renderList() -- filter dgn 0 match -> pesan empty khusus (bukan pesan "belum ada catatan servis" default)', () => {
  const D = { sparepartCats: [{ id: 'c1', name: 'Oli mesin', intervalKm: 2000 }], servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2026-09-01', item: 'Ganti Oli Mesin', categoryId: 'c1', km: 15000, cost: 50000, note: '', actionType: null }], transactions: [], accounts: [], vehicles: [{ id: 'v1', name: 'Vario 125' }], partsStock: [] };
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.activeMasterCategoryFilter = 'sistem-pengereman';
  ctx.Servis.renderList();
  const html = documentStub.elements.servisList.innerHTML;
  assert.ok(html.includes('Tidak ada catatan servis utk kategori master ini'));
});

test('renderList() -- chip row masterCategory disisipkan sebelum #servisList (beforebegin), 1x dibuat, tidak dobel-insert di render ke-2, tidak mengganggu chip row actionType (E6)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  assert.ok(documentStub.elements.servisActionTypeChipRow, 'chip row actionType (E6) harus tetap ada');
  assert.ok(documentStub.elements.servisMasterCatChipRow, 'chip row masterCategory harus ada setelah render pertama');
  const callsAfterFirst = documentStub.getCreateElementCalls();
  ctx.Servis.renderList();
  assert.equal(documentStub.getCreateElementCalls(), callsAfterFirst, 'render ke-2: 0 createElement tambahan');
});

test('renderList() -- chip "Semua" (masterCategory) bertanda active saat filter null, chip lain tidak', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  const chipHtml = documentStub.elements.servisMasterCatChipRow.innerHTML;
  const semuaBlock = chipHtml.split('data-args')[0];
  assert.ok(semuaBlock.includes('active'));
});

test('renderList() -- chip row masterCategory memuat 13 kategori master + "Semua" + "❔ Belum Terklasifikasi" (15 total, Sesi D-lanjutan5)', () => {
  // Diupdate Sesi D-lanjutan5 (PATCH-AKUMULASI v1675): chip count naik dari
  // 14 -> 15 krn chip baru "❔ Belum Terklasifikasi" (UNCATEGORIZED_FILTER_ID)
  // ditambah di UJUNG opsi -- lihat
  // tests/servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js
  // utk cakupan detail chip barunya. 0 perubahan ke 13 kategori master
  // terkunci itu sendiri.
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  const chipHtml = documentStub.elements.servisMasterCatChipRow.innerHTML;
  const chipCount = (chipHtml.match(/data-action="Servis.setMasterCategoryFilter"/g) || []).length;
  assert.equal(chipCount, 15, '1 "Semua" + 13 kategori master terkunci + 1 "❔ Belum Terklasifikasi"');
});

test("setMasterCategoryFilter('sistem-pengereman') -- mengubah activeMasterCategoryFilter, reset listPage, render ulang dgn filter aktif", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 3;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.setMasterCategoryFilter('sistem-pengereman');
  assert.equal(ctx.Servis.activeMasterCategoryFilter, 'sistem-pengereman');
  assert.equal(ctx.Servis.listPage, 1);
  assert.equal(documentStub.elements.servisCount.textContent, 2);
});

test('setMasterCategoryFilter(null) -- kembali ke "Semua", semua entry tampil lagi', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.setMasterCategoryFilter('sistem-pengereman');
  assert.equal(documentStub.elements.servisCount.textContent, 2);
  ctx.Servis.setMasterCategoryFilter(null);
  assert.equal(documentStub.elements.servisCount.textContent, 3);
});

test('resolveLogMasterCategoryId(s) -- fallback by-nama (resolveServisCatForVehicle) utk entry lama tanpa categoryId', () => {
  const D = makeD();
  // Entry lama tanpa categoryId, hanya `item` yg cocok nama kategori persis.
  D.servisLogs.push({ id: 's4', vehicleId: 'v1', date: '2026-09-05', item: 'Oli mesin', categoryId: null, km: 15000, cost: 45000, note: '', actionType: null });
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  const entry = D.servisLogs.find((s) => s.id === 's4');
  const masterCategoryId = ctx.Servis.resolveLogMasterCategoryId(entry);
  assert.equal(masterCategoryId, 'servis-mesin');
});

test('renderList() -- 0 DatabaseAPI.masterCategory sama sekali (car-notes.js dimuat tanpa database-api.js/sparepart-servis.js) -> 0 chip row masterCategory dibuat, daftar tetap tampil, 0 error', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub, files: [CAR_NOTES_FILE] });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  assert.doesNotThrow(() => ctx.Servis.renderList());
  assert.equal(documentStub.elements.servisMasterCatChipRow, undefined, 'chip row masterCategory tidak boleh dibuat kalau 0 DatabaseAPI');
  assert.equal(documentStub.elements.servisCount.textContent, 3, 'daftar tetap tampil normal walau 0 chip filter (0 crash di resolveLogMasterCategoryId karena guard typeof resolveCatGroup)');
});
