'use strict';
// tests/aset-owners-dynamic-inline-attr-sa11.test.js — SA11, sesi pertama dari
// epic migrasi "123 atribut event inline yang di-generate dinamis di
// modules/*.js" (lihat docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi
// #3). SA1-SA9/SA10a sebelumnya HANYA menuntaskan markup STATIS di
// index.html/app_production.html -- CSP aktif sekarang (`script-src` tanpa
// 'unsafe-inline' + `script-src-attr 'none'`) membuat 123 titik yang
// di-generate dinamis lewat `innerHTML=` di modules/*.js berisiko 0 reaksi
// di browser modern (Chrome/Edge/Firefox), karena atribut event inline yang
// di-inject lewat innerHTML tetap disaring CSP persis sama seperti markup
// statis.
//
// SA11 = 1 file: modules/asset/aset-owners.js (10 dari 123 titik, form
// "Atur Porsi Kepemilikan" -- prioritas tertinggi krn paling sering disentuh
// user aktif, lihat rekomendasi user). Pola migrasi: onX="Fn(i,this.value)"
// -> data-onX="Fn" data-onX-args='[i,"$value"]', identik dengan pola
// data-oninput/data-onchange yang sudah dipakai di index.html sejak SA1
// (dispatcher: modules/shared/features-helpers-global-security.js,
// _dataActionInputChangeHandler/_dataActionResolveArgs, dikunci permanen di
// tests/data-oninput-onchange-dispatcher.test.js).
//
// 2 lapis yang dikunci di sini:
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/oninput=/dst
//      (bukan data-*) di file ini. Supaya sesi mendatang yang menyentuh file
//      ini tidak tanpa sadar menambah 1 titik baru.
//   B. Fungsional end-to-end -- markup nyata hasil _renderOwnersList()/
//      _ownerNameFieldHtml()/_renderRebalancePanel() punya data-onX +
//      data-onX-args yang BENAR (bukan cuma "ada data-* apa saja"), DAN
//      dataset itu kalau diproses lewat dispatcher ASLI (bukan re-implementasi)
//      benar-benar memanggil handler Aset yang tepat dengan argumen yang
//      tepat -- membuktikan sync "Rekomendasi ... 0 reaksi" tidak berulang
//      di form owners ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'asset', 'aset-owners.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md) ----

test('SA11 gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di aset-owners.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="/g) || [];
  assert.deepEqual(matches, []);
});

test('SA11 gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=', () => {
  const positive = 'onchange="Foo.bar(1,this.value)"';
  const negative = 'data-onchange="Foo.bar"';
  const re = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="/g;
  assert.equal((positive.match(re) || []).length, 1);
  assert.equal((negative.match(re) || []).length, 0);
});

// ---- Lapis B: markup nyata + dispatcher asli end-to-end ----

function extractFnSource(src, fnName) {
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
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

function makeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionResolveArgs')}
${extractFnSource(DISPATCHER_SRC, '_dataActionInputChangeHandler')}
this._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa11-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

// makeFakeElement: dataset diisi dari STRING dataset[attr]/dataset[attr+'Args']
// yang mau disimulasikan (bukan re-parse HTML -- itu tugas lapis A/regex di
// atas & assert substring di bawah), pola sama seperti
// tests/data-oninput-onchange-dispatcher.test.js.
function makeFakeElement(dataset, extra) {
  const el = Object.assign({ dataset: Object.assign({}, dataset) }, extra || {});
  el.closest = () => el;
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '', disabled: false, style: {}, checked: false, classList: { toggle() {}, add() {}, remove() {} } };
  }
  return {
    getElementById(id) {
      if (id === 'assetList') return null;
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
  };
}

function makeCtx(D, dom) {
  let _n = 9000;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      uid: () => (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      openModal: () => {},
      closeModal: () => {},
      todayStr: () => '2026-08-30',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset'],
  );
}

function baseD() {
  return {
    assets: [{
      id: 'as1',
      name: 'Rumah Warisan Istri',
      nilai: 500000000,
      owners: [
        { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'istri1', porsi: 50, ownerName: 'Istri' },
      ],
    }],
    debts: [],
  };
}

test('SA11: markup _ownerNameFieldHtml() baris ke-1 (index 1) berisi data-oninput + data-oninput-args yang benar', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(html, /data-oninput="Aset\.onOwnerNameInput" data-oninput-args='\[1,"\$value"\]'/);
});

test('SA11: markup select owner-select-change (kalau registry non-kosong) pakai data-onchange, bukan onchange=', () => {
  // Registry kosong pada skenario baseD() -> fallback free-text (baris di atas).
  // Assert langsung dari SUMBER untuk cabang <select> onOwnerSelectChange,
  // supaya tidak bergantung ke skenario registry terisi (di luar cakupan SA11).
  assert.ok(SRC.includes('data-onchange="Aset.onOwnerSelectChange" data-onchange-args=\\\'['));
});

test('SA11: markup porsi(%) & nominal(Rp) baris ke-0 berisi data-oninput-args index yang benar', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(html, /data-oninput="Aset\.onOwnerPorsiInput" data-oninput-args='\[0,"\$value"\]'/);
  assert.match(html, /data-oninput="Aset\.onOwnerNominalInput" data-oninput-args='\[0,"\$value"\]'/);
});

test('SA11: checkbox "Ini saya" baris ke-1 berisi data-onchange-args dgn token $checked (bukan $value)', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(html, /data-onchange="Aset\.onOwnerIsSelfToggle" data-onchange-args='\[1,"\$checked"\]'/);
});

test('SA11: select "Status Dana" (settlement) baris non-SELF berisi data-onchange yang benar', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(html, /data-onchange="Aset\.onOwnerSettlementChange" data-onchange-args='\[1,"\$value"\]'/);
});

test('SA11 end-to-end: dispatcher ASLI + dataset persis hasil migrasi -> onOwnerNameInput(1,val) benar-benar terpanggil, draft ter-update', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');

  const dispatch = makeDispatcher({ Aset: ctx.Aset });
  // dataset di bawah PERSIS token yang divalidasi di test markup di atas
  // (data-oninput="Aset.onOwnerNameInput" data-oninput-args='[1,"$value"]") --
  // membuktikan kalau browser benar2 membaca dataset ini, hasilnya draft[1]
  // ter-update, bukan cuma "ada atribut data-* di HTML".
  const el = makeFakeElement({ oninput: 'Aset.onOwnerNameInput', oninputArgs: '[1,"$value"]' }, { value: 'Budi Santoso' });
  dispatch({ type: 'input', target: el });

  assert.equal(ctx.Aset._ownersDraft[1].ownerName, 'Budi Santoso');
});

test('SA11 end-to-end: dispatcher ASLI + dataset checkbox "Ini saya" -> onOwnerIsSelfToggle(1,true) ter-update ke draft', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  assert.equal(ctx.Aset._ownersDraft[1].isSelf, false); // baseline sebelum toggle

  const dispatch = makeDispatcher({ Aset: ctx.Aset });
  const el = makeFakeElement({ onchange: 'Aset.onOwnerIsSelfToggle', onchangeArgs: '[1,"$checked"]' }, { checked: true });
  dispatch({ type: 'change', target: el });

  assert.equal(ctx.Aset._ownersDraft[1].isSelf, true);
});

test('SA11 end-to-end: dispatcher ASLI + dataset select "Status Dana" -> onOwnerSettlementChange(1,"milik") ter-update ke draft', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');

  const dispatch = makeDispatcher({ Aset: ctx.Aset });
  const el = makeFakeElement({ onchange: 'Aset.onOwnerSettlementChange', onchangeArgs: '[1,"$value"]' }, { value: 'milik' });
  dispatch({ type: 'change', target: el });

  assert.equal(ctx.Aset._ownersDraft[1].settlement, 'milik');
});
