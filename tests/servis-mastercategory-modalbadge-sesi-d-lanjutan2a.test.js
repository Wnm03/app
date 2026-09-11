'use strict';
// tests/servis-mastercategory-modalbadge-sesi-d-lanjutan2a.test.js
//
// Sesi D-lanjutan2a (consumer #2 dari 2, lanjutan Sesi D-lanjutan1/v1667
// yang baru wiring badge READ-ONLY di dashboard). Sesi ini dipecah lagi
// jadi 2 sub-sesi lebih ringan karena limit tools:
//   - D-lanjutan2a (sesi ini): badge dibaca 1x saat modal Kategori
//     Sparepart dibuka (openCatModal(), jalur Tambah maupun Edit).
//     0 event listener baru.
//   - D-lanjutan2b (belum): live-update saat mengetik nama item --
//     ditunda, perlu koordinasi dengan listener `oninput` lain yang
//     sudah ada di #sparepartName.
//
// Yang dites:
// (1) Sparepart.updateMasterCatBadge(name, vehicleId) -- reuse
//     resolveCatGroup() apa adanya, tulis ke #sparepartMasterCatBadgeWrap
//     kalau match, sembunyikan (u-dnone + innerHTML kosong) kalau 0 match
//     atau nama kosong -- 0 elemen DOM lain disentuh.
// (2) openCatModal() memanggil updateMasterCatBadge() 1x baik jalur
//     Tambah (nama kosong -> badge tersembunyi) maupun Edit (nama
//     tersimpan -> badge terisi kalau match).
// (3) Wrap elemen null (mis. test lama yang belum kenal elemen baru ini)
//     -- guard fail-safe, tidak throw.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_A_FILE = 'modules/vehicle/sparepart-servis.js';

function makeFakeDoc(initialIds) {
  const store = {};
  (initialIds || []).forEach((id) => {
    store[id] = {
      id,
      value: '',
      dataset: {},
      innerHTML: '',
      _classes: new Set(['u-dnone']),
      classList: {
        add(c) { store[id]._classes.add(c); },
        remove(c) { store[id]._classes.delete(c); },
        contains(c) { return store[id]._classes.has(c); },
      },
      style: {},
    };
  });
  return {
    _store: store,
    getElementById: (id) => store[id] || null,
  };
}

// ---------------------------------------------------------------------
// (1) updateMasterCatBadge() -- pure-ish, DOM-touching
// ---------------------------------------------------------------------

test('updateMasterCatBadge() -- nama MATCH keyword master category -> wrap terisi & u-dnone dilepas', () => {
  const doc = makeFakeDoc(['sparepartMasterCatBadgeWrap']);
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  ctx.Sparepart.updateMasterCatBadge('Oli mesin', null);

  const wrap = doc._store.sparepartMasterCatBadgeWrap;
  assert.equal(wrap.classList.contains('u-dnone'), false, 'badge harus ditampilkan (u-dnone dilepas)');
  assert.ok(wrap.innerHTML.includes('Servis Mesin'), 'harus mengandung nama kategori master yang match');
});

test('updateMasterCatBadge() -- nama 0 match keyword mana pun -> wrap disembunyikan, innerHTML dikosongkan', () => {
  const doc = makeFakeDoc(['sparepartMasterCatBadgeWrap']);
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  // paksa wrap kelihatan dulu supaya kita bisa pastikan fungsi ini
  // BENAR-BENAR menyembunyikannya lagi saat dipanggil dgn nama 0 match.
  doc._store.sparepartMasterCatBadgeWrap.classList.remove('u-dnone');
  doc._store.sparepartMasterCatBadgeWrap.innerHTML = 'sisa lama';

  ctx.Sparepart.updateMasterCatBadge('Item aneh tidak dikenal xyz123', null);

  const wrap = doc._store.sparepartMasterCatBadgeWrap;
  assert.equal(wrap.classList.contains('u-dnone'), true, 'badge harus disembunyikan lagi (tidak menebak)');
  assert.equal(wrap.innerHTML, '', 'innerHTML harus dikosongkan, tidak menyisakan badge lama');
});

test('updateMasterCatBadge() -- nama kosong (mis. Tambah baru, belum diisi) -> wrap disembunyikan, tidak throw', () => {
  const doc = makeFakeDoc(['sparepartMasterCatBadgeWrap']);
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadge('', null));
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), true);
});

test('updateMasterCatBadge() -- wrap elemen TIDAK ADA di DOM (guard fail-safe) -> tidak throw', () => {
  const doc = makeFakeDoc([]); // sengaja tidak daftarkan sparepartMasterCatBadgeWrap
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadge('Oli mesin', null));
});

test('updateMasterCatBadge() -- 0 DatabaseAPI sama sekali (file sparepart-servis.js dimuat sendirian) -> wrap disembunyikan, 0 error', () => {
  const doc = makeFakeDoc(['sparepartMasterCatBadgeWrap']);
  const ctx = loadSource([SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadge('Oli mesin', null));
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), true);
});

// ---------------------------------------------------------------------
// (2) openCatModal() -- integrasi: dipanggil 1x, jalur Tambah & Edit
// ---------------------------------------------------------------------

function makeModalDoc() {
  return makeFakeDoc([
    'sparepartModalTitle', 'sparepartName', 'sparepartCode', 'sparepartInterval',
    'sparepartVehicleId', 'sparepartGroupId', 'sparepartShowInReminder',
    'sparepartAiSuggestBox', 'sparepartDelBtn', 'sparepartMasterCatBadgeWrap',
  ]);
}

test('openCatModal() -- jalur TAMBAH baru (nama kosong) -> updateMasterCatBadge() dipanggil, badge tersembunyi', () => {
  const doc = makeModalDoc();
  const D = { sparepartCats: [], vehicles: [] };
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    D,
    document: doc,
    escapeHtml: (s) => String(s),
    openModal: () => {},
    codeFromName: () => '',
  }, ['Sparepart']);

  ctx.Sparepart.populateVehicleSelect = () => {};
  ctx.Sparepart.populateGroupSelect = () => {};
  ctx.Sparepart.autoSuggestInterval = () => {};

  assert.doesNotThrow(() => ctx.Sparepart.openCatModal());
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), true);
});

test('openCatModal() -- jalur EDIT kategori existing dgn nama MATCH -> badge terisi sesuai nama tersimpan', () => {
  const doc = makeModalDoc();
  const D = {
    sparepartCats: [{ id: 'sp1', name: 'Oli mesin', code: 'OM', intervalKm: 2000, vehicleId: null }],
    vehicles: [],
  };
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    D,
    document: doc,
    escapeHtml: (s) => String(s),
    openModal: () => {},
    codeFromName: () => '',
  }, ['Sparepart']);

  ctx.Sparepart.populateVehicleSelect = () => {};
  ctx.Sparepart.populateGroupSelect = () => {};
  ctx.Sparepart.autoSuggestInterval = () => {};

  ctx.Sparepart.openCatModal(0);

  const wrap = doc._store.sparepartMasterCatBadgeWrap;
  assert.equal(wrap.classList.contains('u-dnone'), false, 'badge harus tampil utk kategori edit yang namanya match');
  assert.ok(wrap.innerHTML.includes('Servis Mesin'));
});
