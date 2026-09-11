'use strict';
// tests/sparepart-mastercategoryfilter-sesi-d-lanjutan3.test.js
//
// Sesi D-lanjutan3 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi D --
// item "filter/chip by master category di daftar Servis/Sparepart utama"
// yang tercatat "Belum dikerjakan" di CHANGELOG sesi D-lanjutan2b/v1669).
// Target: "Kelola Kategori Sparepart" (Sparepart.renderCatList()).
//
// Pola SAMA PERSIS Servis.renderActionTypeChips()/setActionTypeFilter()
// (Sesi E6, car-notes.js) -- chip row disisipkan lewat JS sebelum
// #sparepartCatList (bukan markup statis), 1x dibuat, tidak dobel-insert
// di render berikutnya. 0 fungsi classify baru -- reuse resolveCatGroup()
// apa adanya (SoT tunggal, sudah dipakai konsisten sejak Sesi D v1666).
//
// Yang dites:
// (1) renderCatList() default (activeMasterCategoryFilter=null) -- 0
//     filter tambahan, perilaku identik sebelum sesi ini (0 regresi).
// (2) renderCatList() dgn filter aktif -- hanya kategori yg classify-nya
//     match masterCategoryId yg tampil.
// (3) Chip row disisipkan 1x (tidak dobel-insert di render ke-2).
// (4) Chip "Semua" bertanda active saat filter null.
// (5) setMasterCategoryFilter(id) mengubah state + render ulang.
// (6) 0 DatabaseAPI.masterCategory sama sekali -- chip row TIDAK dibuat,
//     0 error, daftar tetap tampil apa adanya (fail-safe, tidak menebak).

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

function makeCtx({ D, documentStub, files }) {
  return loadSource(files || [DB_API_FILE, SERVIS_A_FILE], {
    D,
    curVehicleId: 'v1',
    escapeHtml: (s) => String(s),
    document: documentStub,
  }, ['Sparepart']);
}

function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Oli mesin', intervalKm: 2000 },
      { id: 'c2', name: 'Minyak rem', intervalKm: 8000 },
      { id: 'c3', name: 'Kampas rem', intervalKm: 15000 },
    ],
    partsStock: [],
  };
}

test('renderCatList() default (activeMasterCategoryFilter=null) -- 0 filter, semua 3 kategori tampil (0 regresi)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Oli mesin'));
  assert.ok(html.includes('Minyak rem'));
  assert.ok(html.includes('Kampas rem'));
});

test("renderCatList() dgn activeMasterCategoryFilter='servis-mesin' -- hanya kategori yg classify Servis Mesin tampil", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.activeMasterCategoryFilter = 'servis-mesin';
  ctx.Sparepart.renderCatList();
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Oli mesin'), 'Oli mesin harus classify ke Servis Mesin');
  assert.ok(!html.includes('Minyak rem'));
  assert.ok(!html.includes('Kampas rem'));
});

test('renderCatList() -- filter dgn 0 kategori match -> pesan empty khusus (bukan pesan "belum ada kategori" default)', () => {
  const D = { sparepartCats: [{ id: 'c1', name: 'Oli mesin', intervalKm: 2000 }], partsStock: [] };
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.activeMasterCategoryFilter = 'sistem-pengereman';
  ctx.Sparepart.renderCatList();
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Tidak ada kategori sparepart utk kategori master ini'));
});

test('renderCatList() -- chip row disisipkan sebelum #sparepartCatList (beforebegin), 1x dibuat (tidak dobel-insert di render ke-2)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  assert.ok(documentStub.elements.sparepartMasterCatChipRow, 'chip row harus ada setelah render pertama');
  assert.equal(documentStub.getCreateElementCalls(), 1);
  ctx.Sparepart.renderCatList();
  assert.equal(documentStub.getCreateElementCalls(), 1, 'render ke-2: 0 createElement tambahan');
});

test('renderCatList() -- chip "Semua" bertanda active saat filter null, chip lain tidak', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  const chipHtml = documentStub.elements.sparepartMasterCatChipRow.innerHTML;
  const semuaBlock = chipHtml.split('data-args')[0];
  assert.ok(semuaBlock.includes('active'));
  assert.ok(chipHtml.includes('13 kategori tidak wajib disebut') === false); // sanity: bukan placeholder
});

test('renderCatList() -- chip row memuat 13 kategori master + "Semua" + "❔ Belum Terklasifikasi" (15 total, Sesi D-lanjutan5)', () => {
  // Diupdate Sesi D-lanjutan5 (PATCH-AKUMULASI v1675): chip count naik dari
  // 14 -> 15 krn chip baru "❔ Belum Terklasifikasi" (UNCATEGORIZED_FILTER_ID)
  // ditambah di UJUNG opsi -- lihat SESSION-NOTE-sesi-d-lanjutan5-...md &
  // tests/sparepart-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js
  // utk cakupan detail chip barunya. 0 perubahan ke 13 kategori master
  // terkunci itu sendiri (DatabaseAPI.masterCategory) -- chip baru murni
  // level UI (Sparepart.renderMasterCategoryChips()), bukan skema data baru.
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  const chipHtml = documentStub.elements.sparepartMasterCatChipRow.innerHTML;
  const chipCount = (chipHtml.match(/data-action="Sparepart.setMasterCategoryFilter"/g) || []).length;
  assert.equal(chipCount, 15, '1 "Semua" + 13 kategori master terkunci + 1 "❔ Belum Terklasifikasi"');
});

test("setMasterCategoryFilter('sistem-pengereman') -- mengubah activeMasterCategoryFilter, render ulang dgn filter aktif", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.setMasterCategoryFilter('sistem-pengereman');
  assert.equal(ctx.Sparepart.activeMasterCategoryFilter, 'sistem-pengereman');
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Minyak rem'));
  assert.ok(html.includes('Kampas rem'));
  assert.ok(!html.includes('Oli mesin'));
});

test('setMasterCategoryFilter(null) -- kembali ke "Semua", semua kategori tampil lagi', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.setMasterCategoryFilter('servis-mesin');
  assert.ok(!documentStub.elements.sparepartCatList.innerHTML.includes('Minyak rem'));
  ctx.Sparepart.setMasterCategoryFilter(null);
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Oli mesin'));
  assert.ok(html.includes('Minyak rem'));
  assert.ok(html.includes('Kampas rem'));
});

test('renderCatList() -- 0 DatabaseAPI.masterCategory sama sekali (file sparepart-servis.js dimuat sendirian) -> 0 chip row dibuat, daftar tetap tampil, 0 error', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub, files: [SERVIS_A_FILE] });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  assert.doesNotThrow(() => ctx.Sparepart.renderCatList());
  assert.equal(documentStub.elements.sparepartMasterCatChipRow, undefined, 'chip row tidak boleh dibuat kalau 0 DatabaseAPI');
  const html = documentStub.elements.sparepartCatList.innerHTML;
  assert.ok(html.includes('Oli mesin'), 'daftar kategori tetap tampil normal walau 0 chip filter');
});

test('renderMasterCategoryChips() -- dipanggil langsung, guard beforeEl aman (tidak throw) kalau row belum ada', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  assert.doesNotThrow(() => ctx.Sparepart.renderMasterCategoryChips(documentStub.elements.sparepartCatList));
  assert.ok(documentStub.elements.sparepartMasterCatChipRow);
});
