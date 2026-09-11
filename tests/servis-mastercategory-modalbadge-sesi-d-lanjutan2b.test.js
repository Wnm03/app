'use strict';
// tests/servis-mastercategory-modalbadge-sesi-d-lanjutan2b.test.js
//
// Sesi D-lanjutan2b (lanjutan D-lanjutan2a/v1668, badge dibaca 1x saat modal
// dibuka). Sesi ini menambahkan `Sparepart.updateMasterCatBadgeLive()` --
// wrapper yang membaca ulang nama & vehicleId LANGSUNG dari DOM (bukan dari
// argumen closure openCatModal()), lalu diwire ke rangkaian `oninput` yang
// sudah ada di #sparepartName (modules/shared/modals.js) supaya badge ikut
// update tiap kali user mengetik, bukan cuma sekali saat modal dibuka.
//
// Yang dites:
// (1) updateMasterCatBadgeLive() membaca #sparepartName & #sparepartVehicleId
//     dari DOM saat itu juga, lalu delegasikan ke updateMasterCatBadge()
//     apa adanya (0 logic classify baru).
// (2) vehicleId dropdown kosong ('' / null) -> diteruskan sebagai null (pola
//     sama semua caller updateMasterCatBadge() lain, bukan string kosong).
// (3) Guard fail-safe: elemen #sparepartName atau #sparepartVehicleId tidak
//     ada di DOM sama sekali -> tidak throw.
// (4) modules/shared/modals.js: atribut oninput #sparepartName memanggil
//     Sparepart.updateMasterCatBadgeLive() sebagai pemanggilan ke-4 dalam
//     rangkaian oninput yang sudah ada (autoFillSparepartCode();
//     simpleAutocompleteInput(...); Sparepart.autoSuggestInterval(); ...),
//     bukan listener terpisah baru -- 0 titik lain di rangkaian oninput itu
//     berubah/dihapus.

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_A_FILE = 'modules/vehicle/sparepart-servis.js';
const MODALS_FILE = path.join(__dirname, '..', 'modules', 'shared', 'modals.js');

function makeFakeDoc(fields) {
  const store = {};
  Object.keys(fields || {}).forEach((id) => {
    store[id] = {
      id,
      value: fields[id],
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
// (1) updateMasterCatBadgeLive() -- baca DOM langsung, delegasi apa adanya
// ---------------------------------------------------------------------

test('updateMasterCatBadgeLive() -- baca nama & vehicleId dari DOM, badge terisi kalau match', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartVehicleId: '',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  ctx.Sparepart.updateMasterCatBadgeLive();

  const wrap = doc._store.sparepartMasterCatBadgeWrap;
  assert.equal(wrap.classList.contains('u-dnone'), false);
  assert.ok(wrap.innerHTML.includes('Servis Mesin'));
});

test('updateMasterCatBadgeLive() -- nama diketik ulang jadi 0 match -> badge disembunyikan lagi', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartVehicleId: '',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  ctx.Sparepart.updateMasterCatBadgeLive();
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), false);

  // simulasi user lanjut mengetik jadi nama yang tidak match apa pun
  doc._store.sparepartName.value = 'Oli mes tidak jelas xyz123';
  ctx.Sparepart.updateMasterCatBadgeLive();

  const wrap = doc._store.sparepartMasterCatBadgeWrap;
  assert.equal(wrap.classList.contains('u-dnone'), true);
  assert.equal(wrap.innerHTML, '');
});

test('updateMasterCatBadgeLive() -- nama dikosongkan lagi (backspace semua) -> badge disembunyikan, tidak throw', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartVehicleId: '',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  ctx.Sparepart.updateMasterCatBadgeLive();
  doc._store.sparepartName.value = '';
  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadgeLive());
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), true);
});

// ---------------------------------------------------------------------
// (2) vehicleId dropdown kosong -> diteruskan sebagai null, bukan ''
// ---------------------------------------------------------------------

test('updateMasterCatBadgeLive() -- dropdown vehicleId kosong ("") diteruskan sebagai null ke updateMasterCatBadge()', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartVehicleId: '',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  let capturedVehicleId = 'BELUM_DIPANGGIL';
  const originalFn = ctx.Sparepart.updateMasterCatBadge;
  ctx.Sparepart.updateMasterCatBadge = (name, vehicleId) => {
    capturedVehicleId = vehicleId;
    return originalFn.call(ctx.Sparepart, name, vehicleId);
  };

  ctx.Sparepart.updateMasterCatBadgeLive();
  assert.equal(capturedVehicleId, null);
});

test('updateMasterCatBadgeLive() -- dropdown vehicleId terisi -> diteruskan apa adanya (bukan null)', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartVehicleId: 'veh-1',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  let capturedVehicleId = 'BELUM_DIPANGGIL';
  const originalFn = ctx.Sparepart.updateMasterCatBadge;
  ctx.Sparepart.updateMasterCatBadge = (name, vehicleId) => {
    capturedVehicleId = vehicleId;
    return originalFn.call(ctx.Sparepart, name, vehicleId);
  };

  ctx.Sparepart.updateMasterCatBadgeLive();
  assert.equal(capturedVehicleId, 'veh-1');
});

// ---------------------------------------------------------------------
// (3) Guard fail-safe: elemen tidak ada di DOM
// ---------------------------------------------------------------------

test('updateMasterCatBadgeLive() -- #sparepartName tidak ada di DOM -> tidak throw, badge disembunyikan', () => {
  const doc = makeFakeDoc({
    sparepartVehicleId: '',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadgeLive());
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), true);
});

test('updateMasterCatBadgeLive() -- #sparepartVehicleId tidak ada di DOM -> tidak throw, tetap kirim vehicleId null', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartMasterCatBadgeWrap: undefined,
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadgeLive());
  assert.equal(doc._store.sparepartMasterCatBadgeWrap.classList.contains('u-dnone'), false);
});

test('updateMasterCatBadgeLive() -- wrap elemen tidak ada sama sekali -> tidak throw', () => {
  const doc = makeFakeDoc({
    sparepartName: 'Oli mesin',
    sparepartVehicleId: '',
  });
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    document: doc,
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);

  assert.doesNotThrow(() => ctx.Sparepart.updateMasterCatBadgeLive());
});

// ---------------------------------------------------------------------
// (4) modules/shared/modals.js -- wiring ke rangkaian oninput yang sudah ada
// ---------------------------------------------------------------------

test('modals.js -- oninput #sparepartName memanggil Sparepart.updateMasterCatBadgeLive() sebagai pemanggilan ke-4, 3 pemanggilan lama tetap utuh', () => {
  const src = fs.readFileSync(MODALS_FILE, 'utf8');
  const marker = "id=\\\"sparepartName\\\"";
  const idx = src.indexOf(marker);
  assert.ok(idx >= 0, 'field #sparepartName harus ditemukan di modals.js');

  // ambil potongan sekitar field ini (cukup panjang utk mencakup atribut oninput)
  const snippet = src.slice(idx, idx + 400);

  assert.ok(snippet.includes('autoFillSparepartCode()'), 'pemanggilan lama #1 harus tetap ada');
  assert.ok(
    snippet.includes("simpleAutocompleteInput('sparepartName','sparepartNameBox',acSparepartCatNames)"),
    'pemanggilan lama #2 harus tetap ada'
  );
  assert.ok(snippet.includes('Sparepart.autoSuggestInterval()'), 'pemanggilan lama #3 harus tetap ada');
  assert.ok(snippet.includes('Sparepart.updateMasterCatBadgeLive()'), 'pemanggilan baru sesi ini harus ada');

  // urutan: updateMasterCatBadgeLive() harus SETELAH autoSuggestInterval()
  // dalam rangkaian oninput yang sama (bukan menyisip di tengah/awal)
  const posAutoSuggest = snippet.indexOf('Sparepart.autoSuggestInterval()');
  const posBadgeLive = snippet.indexOf('Sparepart.updateMasterCatBadgeLive()');
  assert.ok(posBadgeLive > posAutoSuggest, 'updateMasterCatBadgeLive() harus dipanggil setelah autoSuggestInterval() dalam rangkaian oninput yang sama');
});
