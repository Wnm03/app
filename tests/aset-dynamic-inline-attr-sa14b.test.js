'use strict';
// tests/aset-dynamic-inline-attr-sa14b.test.js — SA14 sesi 2 dari 2 (lihat
// SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md), lanjutan
// tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js. Bagian dari
// epic migrasi "123 atribut event inline yang di-generate dinamis di
// modules/*.js" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3).
// SA11 (aset-owners.js), SA12 (investasi-view.js), SA13 (akun.js/AccOwners),
// SA14a (investasi-list-view.js) sudah tuntas. Sesi ini: aset.js (4 titik),
// pola markup IDENTIK PERSIS dgn SA14a (Aset._renderFilterBar() adalah
// turunan langsung InvestmentListUI._renderFilterBar(), komentar S805-834
// di source sendiri menyebut "pola SAMA PERSIS InvestmentListUI S671").
//
// 4 titik yang dimigrasi:
//   1. Tombol "Pilih Semua"      onclick="Aset.onFilterOwnerSelectAll()"
//      -> data-action="Aset.onFilterOwnerSelectAll" (0 args)
//   2. Tombol "Bersihkan"        onclick="Aset.onFilterOwnerClearAll()"
//      -> data-action="Aset.onFilterOwnerClearAll" (0 args)
//   3. Checkbox filter per-owner onchange="Aset.onFilterOwnerToggle('id')"
//      -> data-onchange="Aset.onFilterOwnerToggle"
//         data-onchange-args='["id"]' (literal id, escapeHtml(JSON.stringify([id])))
//   4. Select Status Dana        onchange="Aset.onFilterSettlementChange(this.value)"
//      -> data-onchange="Aset.onFilterSettlementChange"
//         data-onchange-args='["$value"]'
//
// 2 lapis yang dikunci di sini (pola sama SA11-SA14a):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/oninput=/dst
//      (bukan data-*) di file ini.
//   B. Fungsional end-to-end -- markup nyata hasil _renderFilterBar() punya
//      data-action/data-onchange(-args) yang BENAR, DAN diproses lewat
//      dispatcher ASLI (klik: _dataActionClickHandler; input/change:
//      _dataActionInputChangeHandler, keduanya diekstrak dari
//      modules/shared/features-helpers-global-security.js, TIDAK diubah
//      lagi sesi ini) benar-benar memanggil handler Aset yang tepat dengan
//      argumen yang tepat.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'asset', 'aset.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn SA11/SA12/SA13/SA14a & audit S1588) ----

test('SA14b gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di aset.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g) || [];
  assert.deepEqual(matches, []);
});

test('SA14b gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=/data-action=', () => {
  const positiveOnchange = 'onchange="Foo.bar(1,this.value)"';
  const positiveOnclick = 'onclick="Foo.baz()"';
  const negativeDataOnchange = 'data-onchange="Foo.bar"';
  const negativeDataAction = 'data-action="Foo.baz"';
  const re = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g;
  assert.equal((positiveOnchange.match(re) || []).length, 1);
  assert.equal((positiveOnclick.match(re) || []).length, 1);
  assert.equal((negativeDataOnchange.match(re) || []).length, 0);
  assert.equal((negativeDataAction.match(re) || []).length, 0);
});

test('SA14b gate: tepat 4 titik data-action/data-onchange baru tersedia di source', () => {
  assert.ok(SRC.includes('data-action="Aset.onFilterOwnerSelectAll"'));
  assert.ok(SRC.includes('data-action="Aset.onFilterOwnerClearAll"'));
  assert.ok(SRC.includes('data-onchange="Aset.onFilterOwnerToggle" data-onchange-args='));
  assert.ok(SRC.includes('data-onchange="Aset.onFilterSettlementChange" data-onchange-args=\\\'["$value"]\\\''));
});

// ---- Lapis B: markup nyata + dispatcher asli end-to-end ----

function extractFnSource(src, fnName) {
  const asyncMarker = `async function ${fnName}(`;
  const plainMarker = `function ${fnName}(`;
  let start = src.indexOf(asyncMarker);
  if (start === -1) start = src.indexOf(plainMarker);
  if (start === -1) throw new Error(`"${plainMarker}" tidak ditemukan`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionResolveArgs')}
${extractFnSource(DISPATCHER_SRC, '_dataActionInputChangeHandler')}
this._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa14b-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeClickDispatcher(windowObj) {
  const context = { console, window: windowObj, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionClickHandler')}
this._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa14b-click-dispatcher-extract.js' });
  return context._dataActionClickHandler;
}

function makeFakeElement(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

function makeD(ownerCount) {
  // owner non-SELF > 5 supaya quickActionsHtml (tombol Pilih Semua/Bersihkan)
  // ikut dirender oleh _renderFilterBar() -- lihat komentar S671/S673 di source.
  const assets = [];
  for (let i = 1; i <= ownerCount; i += 1) {
    assets.push({
      id: 'a' + i,
      name: 'Aset ' + i,
      nilai: 1000000,
      owners: [
        { ownerId: 'SELF', porsi: 20, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'own' + i, porsi: 80, ownerName: 'Owner ' + i },
      ],
    });
  }
  return { assets, debts: [] };
}

function makeCtx(D) {
  let _n = 9000;
  return loadSource(
    ['modules/shared/filter-prefs-store.js',
      'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      uid: () => (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      todayStr: () => '2026-08-30',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset'],
  );
}

test('SA14b: markup tombol "Pilih Semua"/"Bersihkan" pakai data-action, bukan onclick= (muncul saat owner non-SELF > 5)', () => {
  const D = makeD(6);
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /data-action="Aset\.onFilterOwnerSelectAll">Pilih Semua<\/button>/);
  assert.match(html, /data-action="Aset\.onFilterOwnerClearAll">Bersihkan<\/button>/);
  assert.doesNotMatch(html, /onclick=/);
});

test('SA14b: markup checkbox filter per-owner berisi data-onchange + data-onchange-args id yang benar', () => {
  const D = makeD(2);
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /data-onchange="Aset\.onFilterOwnerToggle" data-onchange-args='\[&quot;own1&quot;\]'/);
  assert.match(html, /data-onchange="Aset\.onFilterOwnerToggle" data-onchange-args='\[&quot;own2&quot;\]'/);
});

test('SA14b: markup select Status Dana berisi data-onchange dgn token $value', () => {
  const D = makeD(1);
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /data-onchange="Aset\.onFilterSettlementChange" data-onchange-args='\["\$value"\]'/);
});

test('SA14b end-to-end (klik): dispatcher ASLI + dataset persis hasil migrasi -> onFilterOwnerSelectAll() benar-benar terpanggil, filterOwnerIds terisi', () => {
  const D = makeD(6);
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = [];

  const dispatchClick = makeClickDispatcher({ Aset: ctx.Aset });
  const el = makeFakeElement({ action: 'Aset.onFilterOwnerSelectAll' });
  dispatchClick({ target: el });

  const ids = ctx.Aset.filterOwnerIds.slice().sort();
  assert.equal(ids.length, 6);
  assert.equal(ids.join(','), 'own1,own2,own3,own4,own5,own6');
});

test('SA14b end-to-end (klik): onFilterOwnerClearAll() benar-benar mengosongkan filterOwnerIds & filterSettlement', () => {
  const D = makeD(2);
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['own1', 'own2'];
  ctx.Aset.filterSettlement = 'milik';

  const dispatchClick = makeClickDispatcher({ Aset: ctx.Aset });
  const el = makeFakeElement({ action: 'Aset.onFilterOwnerClearAll' });
  dispatchClick({ target: el });

  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

test('SA14b end-to-end (change): dataset persis hasil migrasi -> onFilterOwnerToggle("own1") benar-benar terpanggil dgn id yang tepat', () => {
  const D = makeD(2);
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = [];

  const dispatchChange = makeChangeDispatcher({ Aset: ctx.Aset });
  const el = makeFakeElement({ onchange: 'Aset.onFilterOwnerToggle', onchangeArgs: '["own1"]' });
  dispatchChange({ type: 'change', target: el });

  assert.equal(ctx.Aset.filterOwnerIds.length, 1);
  assert.equal(ctx.Aset.filterOwnerIds[0], 'own1');
});

test('SA14b end-to-end (change): dataset dgn token $value -> onFilterSettlementChange(el.value) benar-benar terpanggil', () => {
  const D = makeD(1);
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['own1'];
  ctx.Aset.filterSettlement = '';

  const dispatchChange = makeChangeDispatcher({ Aset: ctx.Aset });
  const el = makeFakeElement({ onchange: 'Aset.onFilterSettlementChange', onchangeArgs: '["$value"]' });
  el.value = 'titipan';
  dispatchChange({ type: 'change', target: el });

  assert.equal(ctx.Aset.filterSettlement, 'titipan');
});
