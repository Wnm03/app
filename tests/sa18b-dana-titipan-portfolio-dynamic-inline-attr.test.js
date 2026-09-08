'use strict';
// tests/sa18b-dana-titipan-portfolio-dynamic-inline-attr.test.js — SA18b,
// lanjutan epic migrasi "atribut event inline dinamis"
// (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3), setelah SA18a
// (aset-reports.js/Penyusutan, lihat SESSION-NOTE-SA18a). Sesi ini:
// modules/finance/dana-titipan-portfolio-render.js, 5 titik — filter bar
// (`DanaTitipanPortfolioPresenter._renderFilterBar()`) pola IDENTIK PERSIS
// SA14a (investasi-list-view.js)/SA14b (aset.js) + 1 titik tambahan (select
// "Pilih Aset" -> onAssetPickChange, pola $el yang sudah dipakai
// `DanaTitipanCommitmentUI.openAssetPorsi` di file yang sama, S608).
//
// 5 titik yang dimigrasi:
//   1. Select "Pilih Aset"        onchange="DanaTitipanPortfolioPresenter.onAssetPickChange(this)"
//      -> data-onchange="DanaTitipanPortfolioPresenter.onAssetPickChange"
//         data-onchange-args='["$el"]' (pola sama openAssetPorsi, S608)
//   2. Tombol "Pilih Semua"       onclick="...onFilterOwnerSelectAll()"
//      -> data-action="DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll" (0 args)
//   3. Tombol "Bersihkan"         onclick="...onFilterOwnerClearAll()"
//      -> data-action="DanaTitipanPortfolioPresenter.onFilterOwnerClearAll" (0 args)
//   4. Checkbox filter per-owner  onchange="...onFilterOwnerToggle('id')"
//      -> data-onchange="DanaTitipanPortfolioPresenter.onFilterOwnerToggle"
//         data-onchange-args='["id"]' (literal id, escapeHtml(JSON.stringify([id])))
//   5. Select Status Dana         onchange="...onFilterSettlementChange(this.value)"
//      -> data-onchange="DanaTitipanPortfolioPresenter.onFilterSettlementChange"
//         data-onchange-args='["$value"]'
//
// 0 perubahan logic — onAssetPickChange()/onFilterOwner*()/
// onFilterSettlementChange() tidak disentuh sama sekali.
//
// Temuan tambahan sesi ini (BEDA dari SA14a/SA14b): titik #2/#3 pakai
// `data-action` (klik, bukan data-onchange) -- gate
// `scripts/verify-window-expose.js` (S423) scan SEMUA `data-action="X.method"`
// di repo dan mewajibkan X di-window-expose. DanaTitipanPortfolioPresenter
// SEBELUMNYA tidak pernah dipakai lewat data-action (cuma onclick/onchange
// inline, luput dari gate), jadi window-expose belum ada --
// modules/finance/dana-titipan-portfolio-render-b.js (window-expose block
// existing utk DanaTitipanCommitmentUI/DanaTitipanReturnUI/DanaTitipanPoolUI)
// ditambah `window.DanaTitipanPortfolioPresenter = ...` sesi ini juga.
//
// 2 lapis yang dikunci (pola sama SA11-SA18a):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/dst (bukan
//      data-*) di file ini.
//   B. Fungsional end-to-end -- markup nyata hasil _renderFilterBar()/
//      _ownerCardHtml() punya data-action/data-onchange(-args) yang BENAR,
//      DAN diproses lewat dispatcher ASLI (klik: _dataActionClickHandler;
//      input/change: _dataActionInputChangeHandler, keduanya diekstrak dari
//      modules/shared/features-helpers-global-security.js, TIDAK diubah
//      lagi sesi ini) benar-benar memanggil handler
//      DanaTitipanPortfolioPresenter yang tepat dengan argumen yang tepat.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'finance', 'dana-titipan-portfolio-render.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn audit S1588 & SA11-SA18a) ----

test('SA18b gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di dana-titipan-portfolio-render.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g) || [];
  assert.deepEqual(matches, []);
});

test('SA18b gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=/data-action=', () => {
  const positiveOnchange = 'onchange="Foo.bar(this.value)"';
  const positiveOnclick = 'onclick="Foo.baz()"';
  const negativeDataOnchange = 'data-onchange="Foo.bar"';
  const negativeDataAction = 'data-action="Foo.baz"';
  const re = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g;
  assert.equal((positiveOnchange.match(re) || []).length, 1);
  assert.equal((positiveOnclick.match(re) || []).length, 1);
  assert.equal((negativeDataOnchange.match(re) || []).length, 0);
  assert.equal((negativeDataAction.match(re) || []).length, 0);
});

test('SA18b gate: tepat 5 titik data-action/data-onchange baru tersedia di source', () => {
  assert.ok(SRC.includes('data-onchange="DanaTitipanPortfolioPresenter.onAssetPickChange" data-onchange-args=\'["$el"]\''));
  assert.ok(SRC.includes('data-action="DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll"'));
  assert.ok(SRC.includes('data-action="DanaTitipanPortfolioPresenter.onFilterOwnerClearAll"'));
  assert.ok(SRC.includes('data-onchange="DanaTitipanPortfolioPresenter.onFilterOwnerToggle" data-onchange-args='));
  assert.ok(SRC.includes('data-onchange="DanaTitipanPortfolioPresenter.onFilterSettlementChange" data-onchange-args=\\\'["$value"]\\\''));
});

// ---- Lapis A2: gate window-expose (temuan tambahan sesi ini) ----

test('SA18b gate: DanaTitipanPortfolioPresenter di-window-expose (wajib sejak dipakai via data-action)', () => {
  const bPath = path.join(__dirname, '..', 'modules', 'finance', 'dana-titipan-portfolio-render-b.js');
  const bSrc = fs.readFileSync(bPath, 'utf8');
  assert.match(bSrc, /window\.DanaTitipanPortfolioPresenter\s*=\s*DanaTitipanPortfolioPresenter\s*;/);
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
  vm.runInContext(snippet, context, { filename: 'sa18b-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeClickDispatcher(windowObj) {
  const context = { console, window: windowObj, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionClickHandler')}
this._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa18b-click-dispatcher-extract.js' });
  return context._dataActionClickHandler;
}

function makeFakeElement(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/aset-owners.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/aset.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      toast: () => {},
      sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-08-30',
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      fmtFullSigned: (n) => String(n),
    },
    ['Investment', 'Aset', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

// seedBanyakOwner(n) — n aset, tiap aset 1 owner non-SELF unik (owner1..ownerN),
// porsi non-zero, supaya build().owners punya persis n baris (>5 memicu
// tombol Pilih Semua/Bersihkan di _renderFilterBar(), pola sama SA14a/SA14b).
function seedBanyakOwner(n) {
  const assets = [];
  for (let i = 1; i <= n; i += 1) {
    assets.push({
      id: 'aB' + i,
      name: 'Aset ' + i,
      nilai: 1000000,
      owners: [
        { ownerId: 'SELF', porsi: 1, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'owner' + i, porsi: 99, ownerName: 'Owner ' + i },
      ],
    });
  }
  return {
    investments: [], investmentTx: [], investmentWatchlist: [], assets, debts: [],
    titipanCommitments: [], titipanReturns: [], transactions: [],
  };
}

function baseDOneOwner() {
  return {
    investments: [
      {
        id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000,
        owners: [
          { ownerId: 'SELF', porsi: 20, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'budi1', porsi: 80, ownerName: 'Budi' },
        ],
      },
    ],
    investmentTx: [], investmentWatchlist: [], assets: [], debts: [],
    titipanCommitments: [], titipanReturns: [], transactions: [],
  };
}

test('SA18b: markup tombol "Pilih Semua"/"Bersihkan" pakai data-action, bukan onclick= (muncul saat owner > 5)', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /data-action="DanaTitipanPortfolioPresenter\.onFilterOwnerSelectAll">Pilih Semua<\/button>/);
  assert.match(html, /data-action="DanaTitipanPortfolioPresenter\.onFilterOwnerClearAll">Bersihkan<\/button>/);
  assert.doesNotMatch(html, /onclick=/);
});

test('SA18b: markup checkbox filter per-owner berisi data-onchange + data-onchange-args id yang benar', () => {
  const D = baseDOneOwner();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /data-onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerToggle" data-onchange-args='\[&quot;budi1&quot;\]'/);
});

test('SA18b: markup select Status Dana berisi data-onchange dgn token $value', () => {
  const D = baseDOneOwner();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /data-onchange="DanaTitipanPortfolioPresenter\.onFilterSettlementChange" data-onchange-args='\["\$value"\]'/);
});

test('SA18b: markup select "Pilih Aset" berisi data-onchange dgn token $el (pola sama openAssetPorsi S608)', () => {
  const D = baseDOneOwner();
  const ctx = makeCtx(D);
  const dom = { getElementById: () => ({ innerHTML: '', querySelectorAll: () => [] }) };
  ctx.document = dom;
  ctx.DanaTitipanPortfolioPresenter.render();
  // render() menulis ke document.getElementById('danaTitipanPortfolioList').innerHTML --
  // ambil langsung dari _ownerCardHtml() supaya tidak bergantung ke DOM stub.
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const cardHtml = ctx.DanaTitipanPortfolioPresenter._ownerCardHtml(p.owners[0], 0);
  assert.match(cardHtml, /data-onchange="DanaTitipanPortfolioPresenter\.onAssetPickChange" data-onchange-args='\["\$el"\]'/);
  assert.doesNotMatch(cardHtml, /(?<!data-)onchange="DanaTitipanPortfolioPresenter\.onAssetPickChange/);
});

test('SA18b end-to-end (klik): dispatcher ASLI + dataset persis hasil migrasi -> onFilterOwnerSelectAll() benar-benar terpanggil, filterOwnerIds terisi', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {}; // hindari sentuh DOM stub, fokus state

  const dispatchClick = makeClickDispatcher({ DanaTitipanPortfolioPresenter: ctx.DanaTitipanPortfolioPresenter, DanaTitipanPortfolioAPI: ctx.DanaTitipanPortfolioAPI });
  const el = makeFakeElement({ action: 'DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll' });
  dispatchClick({ target: el });

  const ids = ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.slice().sort();
  assert.equal(ids.length, 6);
  assert.equal(ids.join(','), 'owner1,owner2,owner3,owner4,owner5,owner6');
});

test('SA18b end-to-end (klik): onFilterOwnerClearAll() benar-benar mengosongkan filterOwnerIds & filterSettlement', () => {
  const D = seedBanyakOwner(2);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['owner1', 'owner2'];
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = 'milik';
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  const dispatchClick = makeClickDispatcher({ DanaTitipanPortfolioPresenter: ctx.DanaTitipanPortfolioPresenter });
  const el = makeFakeElement({ action: 'DanaTitipanPortfolioPresenter.onFilterOwnerClearAll' });
  dispatchClick({ target: el });

  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

test('SA18b end-to-end (change): dataset persis hasil migrasi -> onFilterOwnerToggle("owner1") benar-benar terpanggil dgn id yang tepat', () => {
  const D = seedBanyakOwner(2);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  const dispatchChange = makeChangeDispatcher({ DanaTitipanPortfolioPresenter: ctx.DanaTitipanPortfolioPresenter });
  const el = makeFakeElement({ onchange: 'DanaTitipanPortfolioPresenter.onFilterOwnerToggle', onchangeArgs: '["owner1"]' });
  dispatchChange({ type: 'change', target: el });

  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 1);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds[0], 'owner1');
});

test('SA18b end-to-end (change): dataset dgn token $value -> onFilterSettlementChange(el.value) benar-benar terpanggil', () => {
  const D = seedBanyakOwner(1);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['owner1'];
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = '';
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  const dispatchChange = makeChangeDispatcher({ DanaTitipanPortfolioPresenter: ctx.DanaTitipanPortfolioPresenter });
  const el = makeFakeElement({ onchange: 'DanaTitipanPortfolioPresenter.onFilterSettlementChange', onchangeArgs: '["$value"]' });
  el.value = 'titipan';
  dispatchChange({ type: 'change', target: el });

  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, 'titipan');
});

test('SA18b end-to-end (change): dataset dgn token $el -> onAssetPickChange(el) benar-benar terpanggil dgn elemen yang tepat', () => {
  const D = baseDOneOwner();
  const ctx = makeCtx(D);
  const captured = [];
  ctx.DanaTitipanPortfolioPresenter.onAssetPickChange = (target) => { captured.push(target); };

  const dispatchChange = makeChangeDispatcher({ DanaTitipanPortfolioPresenter: ctx.DanaTitipanPortfolioPresenter });
  const el = makeFakeElement({ onchange: 'DanaTitipanPortfolioPresenter.onAssetPickChange', onchangeArgs: '["$el"]' });
  dispatchChange({ type: 'change', target: el });

  assert.equal(captured.length, 1);
  assert.equal(captured[0], el);
});
