'use strict';
// tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js — SA14 sesi 1
// dari 2 sesi (lihat SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md),
// bagian dari epic migrasi "123 atribut event inline yang di-generate dinamis
// di modules/*.js" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3).
// SA11 (aset-owners.js), SA12 (investasi-view.js), SA13 (akun.js/AccOwners)
// sudah tuntas. SA14 rencana awal = investasi-list-view.js (4 titik) +
// aset.js (4 titik) -- dipecah W jadi 2 sesi: sesi ini HANYA
// investasi-list-view.js, aset.js menyusul di SA14 sesi 2.
//
// 4 titik yang dimigrasi (beda dari SA11-SA13: 2 di antaranya klik tombol
// TANPA argumen, dispatcher klik `data-action` dipakai -- bukan
// data-oninput/data-onchange seperti SA11-SA13 yang semuanya field
// input/select):
//   1. Tombol "Pilih Semua"      onclick="InvestmentListUI.onFilterOwnerSelectAll()"
//      -> data-action="InvestmentListUI.onFilterOwnerSelectAll" (0 args)
//   2. Tombol "Bersihkan"        onclick="InvestmentListUI.onFilterOwnerClearAll()"
//      -> data-action="InvestmentListUI.onFilterOwnerClearAll" (0 args)
//   3. Checkbox filter per-owner onchange="InvestmentListUI.onFilterOwnerToggle('id')"
//      -> data-onchange="InvestmentListUI.onFilterOwnerToggle"
//         data-onchange-args='["id"]' (literal id, BUKAN $value/$checked --
//         pola baru, id di-escape lewat escapeHtml(JSON.stringify([id])),
//         konsisten dgn pola data-args di modules/shared/modules-render.js)
//   4. Select Status Dana        onchange="InvestmentListUI.onFilterSettlementChange(this.value)"
//      -> data-onchange="InvestmentListUI.onFilterSettlementChange"
//         data-onchange-args='["$value"]'
//
// 2 lapis yang dikunci di sini (pola sama SA11-SA13):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/oninput=/dst
//      (bukan data-*) di file ini.
//   B. Fungsional end-to-end -- markup nyata hasil _renderFilterBar() punya
//      data-action/data-onchange(-args) yang BENAR, DAN diproses lewat
//      dispatcher ASLI (klik: _dataActionClickHandler; input/change:
//      _dataActionInputChangeHandler, keduanya diekstrak dari
//      modules/shared/features-helpers-global-security.js, TIDAK diubah
//      lagi sesi ini) benar-benar memanggil handler InvestmentListUI yang
//      tepat dengan argumen yang tepat.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'asset', 'investasi-list-view.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn SA11/SA12/SA13 & audit S1588) ----

test('SA14a gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di investasi-list-view.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g) || [];
  assert.deepEqual(matches, []);
});

test('SA14a gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=/data-action=', () => {
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

test('SA14a gate: tepat 4 titik data-action/data-onchange baru tersedia di source', () => {
  assert.ok(SRC.includes('data-action="InvestmentListUI.onFilterOwnerSelectAll"'));
  assert.ok(SRC.includes('data-action="InvestmentListUI.onFilterOwnerClearAll"'));
  assert.ok(SRC.includes('data-onchange="InvestmentListUI.onFilterOwnerToggle" data-onchange-args='));
  assert.ok(SRC.includes('data-onchange="InvestmentListUI.onFilterSettlementChange" data-onchange-args=\\\'["$value"]\\\''));
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
  vm.runInContext(snippet, context, { filename: 'sa14a-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeClickDispatcher(windowObj) {
  const context = { console, window: windowObj, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionClickHandler')}
this._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa14a-click-dispatcher-extract.js' });
  return context._dataActionClickHandler;
}

function makeFakeElement(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', classList: { toggle() {}, contains: () => false } };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
  };
}

function makeD(ownerCount) {
  // owner non-SELF > 5 supaya quickActionsHtml (tombol Pilih Semua/Bersihkan)
  // ikut dirender oleh _renderFilterBar() -- lihat komentar S671 di source.
  // Porsi HARUS total 100 (syarat MultiOwnerEngine.validateOwners(), dibaca
  // Investment.getOwners() -> kalau invalid, fallback ke default 1 baris SELF
  // 100% & ownerMap jadi kosong -- _renderFilterBar() balik '').
  const perOwner = Math.floor(80 / ownerCount) || 1;
  const owners = [{ ownerId: 'SELF', porsi: 100 - perOwner * ownerCount, ownerName: 'Milik Sendiri', isSelf: true }];
  for (let i = 1; i <= ownerCount; i += 1) {
    owners.push({ ownerId: 'own' + i, porsi: perOwner, ownerName: 'Owner ' + i });
  }
  return {
    investments: [{ id: 'inv1', name: 'Reksadana X', type: 'Reksadana', unit: 100, avgPrice: 1000, currentPrice: 1100, owners }],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
  };
}

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/investasi-list-view.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      parseDecStr: (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; },
      uid: () => 'inv_x',
      save: () => {},
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderDebtList: () => {},
      AIBus: { emit: () => {} },
      InvestmentUI: { openOwnersModal: () => {} },
    },
    ['Investment', 'InvestmentListUI'],
  );
}

test('SA14a: markup tombol "Pilih Semua"/"Bersihkan" pakai data-action, bukan onclick= (muncul saat owner non-SELF > 5)', () => {
  const D = makeD(6);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const html = ctx.InvestmentListUI._renderFilterBar(ctx.Investment.getHoldings());
  assert.match(html, /data-action="InvestmentListUI\.onFilterOwnerSelectAll">Pilih Semua<\/button>/);
  assert.match(html, /data-action="InvestmentListUI\.onFilterOwnerClearAll">Bersihkan<\/button>/);
  assert.doesNotMatch(html, /onclick=/);
});

test('SA14a: markup checkbox filter per-owner berisi data-onchange + data-onchange-args id yang benar', () => {
  const D = makeD(2);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const html = ctx.InvestmentListUI._renderFilterBar(ctx.Investment.getHoldings());
  assert.match(html, /data-onchange="InvestmentListUI\.onFilterOwnerToggle" data-onchange-args='\[&quot;own1&quot;\]'/);
  assert.match(html, /data-onchange="InvestmentListUI\.onFilterOwnerToggle" data-onchange-args='\[&quot;own2&quot;\]'/);
});

test('SA14a: markup select Status Dana berisi data-onchange dgn token $value', () => {
  const D = makeD(1);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const html = ctx.InvestmentListUI._renderFilterBar(ctx.Investment.getHoldings());
  assert.match(html, /data-onchange="InvestmentListUI\.onFilterSettlementChange" data-onchange-args='\["\$value"\]'/);
});

test('SA14a end-to-end (klik): dispatcher ASLI + dataset persis hasil migrasi -> onFilterOwnerSelectAll() benar-benar terpanggil, filterOwnerIds terisi', () => {
  const D = makeD(6);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.filterOwnerIds = [];

  const dispatchClick = makeClickDispatcher({ InvestmentListUI: ctx.InvestmentListUI });
  const el = makeFakeElement({ action: 'InvestmentListUI.onFilterOwnerSelectAll' });
  dispatchClick({ target: el });

  const ids = ctx.InvestmentListUI.filterOwnerIds.slice().sort();
  assert.equal(ids.length, 6);
  assert.equal(ids.join(','), 'own1,own2,own3,own4,own5,own6');
});

test('SA14a end-to-end (klik): onFilterOwnerClearAll() benar-benar mengosongkan filterOwnerIds & filterSettlement', () => {
  const D = makeD(2);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.filterOwnerIds = ['own1', 'own2'];
  ctx.InvestmentListUI.filterSettlement = 'milik';

  const dispatchClick = makeClickDispatcher({ InvestmentListUI: ctx.InvestmentListUI });
  const el = makeFakeElement({ action: 'InvestmentListUI.onFilterOwnerClearAll' });
  dispatchClick({ target: el });

  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '');
});

test('SA14a end-to-end (change): dataset persis hasil migrasi -> onFilterOwnerToggle("own1") benar-benar terpanggil dgn id yang tepat', () => {
  const D = makeD(2);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.filterOwnerIds = [];

  const dispatchChange = makeChangeDispatcher({ InvestmentListUI: ctx.InvestmentListUI });
  const el = makeFakeElement({ onchange: 'InvestmentListUI.onFilterOwnerToggle', onchangeArgs: '["own1"]' });
  dispatchChange({ type: 'change', target: el });

  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 1);
  assert.equal(ctx.InvestmentListUI.filterOwnerIds[0], 'own1');
});

test('SA14a end-to-end (change): dataset dgn token $value -> onFilterSettlementChange(el.value) benar-benar terpanggil', () => {
  const D = makeD(1);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.filterOwnerIds = ['own1'];
  ctx.InvestmentListUI.filterSettlement = '';

  const dispatchChange = makeChangeDispatcher({ InvestmentListUI: ctx.InvestmentListUI });
  const el = makeFakeElement({ onchange: 'InvestmentListUI.onFilterSettlementChange', onchangeArgs: '["$value"]' });
  el.value = 'titipan';
  dispatchChange({ type: 'change', target: el });

  assert.equal(ctx.InvestmentListUI.filterSettlement, 'titipan');
});
