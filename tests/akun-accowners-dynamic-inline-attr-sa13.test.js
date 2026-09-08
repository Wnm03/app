'use strict';
// tests/akun-accowners-dynamic-inline-attr-sa13.test.js — SA13, sesi ketiga dari
// epic migrasi "123 atribut event inline yang di-generate dinamis di
// modules/*.js" (lihat docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi
// #3, dan SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md untuk tabel
// rencana 8 sesi SA11-SA18). SA11 sudah menuntaskan aset-owners.js (10 titik),
// SA12 investasi-view.js (10 titik) — SA13 = 1 file: modules/finance/akun.js,
// bagian AccOwners (7 dari 123 titik, form "Atur Porsi Kepemilikan" versi Akun
// — wiring sejenis Aset/Investasi tapi domain akun bank).
//
// Pola migrasi identik dengan SA11/SA12: onX="Fn(i,this.value)" ->
// data-onX="Fn" data-onX-args='[i,"$value"]', dibaca oleh dispatcher yang
// SUDAH ADA & sudah dikunci test sejak SA1
// (modules/shared/features-helpers-global-security.js,
// _dataActionInputChangeHandler/_dataActionResolveArgs).
//
// 2 lapis yang dikunci di sini:
//   A. Gate statis permanen — 0 kemunculan onclick=/onchange=/oninput=/dst
//      (bukan data-*) di file ini.
//   B. Fungsional end-to-end — markup nyata hasil _renderList()/
//      _renderRebalancePanel() punya data-onX + data-onX-args yang BENAR,
//      DAN dataset itu kalau diproses lewat dispatcher ASLI benar-benar
//      memanggil handler AccOwners yang tepat dengan argumen yang tepat.
//
// Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'finance', 'akun.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md) ----

test('SA13 gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di akun.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="/g) || [];
  assert.deepEqual(matches, []);
});

test('SA13 gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=', () => {
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
  vm.runInContext(snippet, context, { filename: 'sa13-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeElement(dataset, extra) {
  const el = Object.assign({ dataset: Object.assign({}, dataset) }, extra || {});
  el.closest = () => el;
  return el;
}

// makeStatefulDom: sama pola dgn rebalance-porsi-pemilik.test.js Bagian 3 —
// _renderRebalancePanel() butuh insertAdjacentElement() nyata (bikin
// #accountOwnersRebalanceBox sbg sibling #accountOwnersList).
function makeStatefulDom() {
  const el = {};
  function stubEl(id) {
    if (!el[id]) {
      el[id] = {
        id, innerHTML: '', value: '', textContent: '', style: {}, checked: false,
        classList: { toggle() {}, add() {}, remove() {} },
        insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; },
        insertAdjacentHTML() {},
      };
    }
    return el[id];
  }
  return {
    getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); },
    createElement() { return { id: '', innerHTML: '' }; },
  };
}

function makeCtx(D, dom) {
  const ctx = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js'],
    {
      D, document: dom, escapeHtml: (s) => String(s), toast: () => {}, save: () => {},
      openModal: () => {}, closeModal: () => {}, sameId: (a, b) => String(a) === String(b),
      findLinkedHoldingsForAccount: () => [], uid: () => 'x', OwnerRegistry: undefined,
      getAccOwners: (id) => { const acc = D.accounts.find((a) => a.id === id); return acc ? { ok: true, owners: acc.owners } : { ok: false, owners: [] }; },
    },
    ['AccOwners'],
  );
  // akun.js mendeklarasikan `let editAccIdx=-1` di top-level FILE-nya sendiri —
  // sama quirk vm spt di rebalance-porsi-pemilik.test.js: harus di-assign lewat
  // script vm tambahan di context yang sama, bukan lewat property sandbox biasa.
  new vm.Script('editAccIdx = 0;').runInContext(ctx);
  return ctx;
}

function baseD() {
  return {
    accounts: [{
      id: 'acc1',
      name: 'BCA',
      owners: [
        { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 50, isSelf: true },
        { ownerId: 'istri1', ownerName: 'Istri', porsi: 50 },
      ],
    }],
  };
}

test('SA13: markup _renderList() baris ke-1 (index 1) berisi data-oninput nama pemilik yang benar', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();
  const html = dom.getElementById('accountOwnersList').innerHTML;
  assert.match(html, /data-oninput="AccOwners\.onNameInput" data-oninput-args='\[1,"\$value"\]'/);
});

test('SA13: markup Porsi (%) baris ke-0 berisi data-oninput-args index yang benar', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();
  const html = dom.getElementById('accountOwnersList').innerHTML;
  assert.match(html, /data-oninput="AccOwners\.onPorsiInput" data-oninput-args='\[0,"\$value"\]'/);
});

test('SA13: checkbox "Ini saya" baris ke-1 berisi data-onchange-args dgn token $checked (bukan $value)', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();
  const html = dom.getElementById('accountOwnersList').innerHTML;
  assert.match(html, /data-onchange="AccOwners\.onIsSelfToggle" data-onchange-args='\[1,"\$checked"\]'/);
});

test('SA13: panel rebalance — select pemilik manual & 3 radio metode pakai data-onchange, bukan onchange=', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();
  ctx.AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  ctx.AccOwners._rebalancePending = { editedIndex: 2, method: 'manual', manualIndex: null };
  ctx.AccOwners._renderRebalancePanel();
  const html = dom.getElementById('accountOwnersRebalanceBox').innerHTML;
  assert.match(html, /data-onchange="AccOwners\.setRebalanceManualOwner" data-onchange-args='\["\$value"\]'/);
  assert.match(html, /value="proporsional"[^>]*data-onchange="AccOwners\.setRebalanceMethod" data-onchange-args='\["\$value"\]'/);
  assert.match(html, /value="largest"[^>]*data-onchange="AccOwners\.setRebalanceMethod" data-onchange-args='\["\$value"\]'/);
  assert.match(html, /value="manual"[^>]*data-onchange="AccOwners\.setRebalanceMethod" data-onchange-args='\["\$value"\]'/);
});

test('SA13 end-to-end: dispatcher ASLI + dataset persis hasil migrasi -> onNameInput(1,val) benar-benar terpanggil, draft ter-update', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();

  const dispatch = makeDispatcher({ AccOwners: ctx.AccOwners });
  const el = makeFakeElement({ oninput: 'AccOwners.onNameInput', oninputArgs: '[1,"$value"]' }, { value: 'Budi Santoso' });
  dispatch({ type: 'input', target: el });

  assert.equal(ctx.AccOwners._draft[1].ownerName, 'Budi Santoso');
});

test('SA13 end-to-end: dispatcher ASLI + dataset checkbox "Ini saya" -> onIsSelfToggle(1,true) ter-update ke draft', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();
  assert.equal(ctx.AccOwners._draft[1].isSelf, false);

  const dispatch = makeDispatcher({ AccOwners: ctx.AccOwners });
  const el = makeFakeElement({ onchange: 'AccOwners.onIsSelfToggle', onchangeArgs: '[1,"$checked"]' }, { checked: true });
  dispatch({ type: 'change', target: el });

  assert.equal(ctx.AccOwners._draft[1].isSelf, true);
});

test('SA13 end-to-end: dispatcher ASLI + dataset setRebalanceMethod -> pending.method ter-update ke "largest"', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.AccOwners.open();
  ctx.AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  ctx.AccOwners._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };

  const dispatch = makeDispatcher({ AccOwners: ctx.AccOwners });
  const el = makeFakeElement({ onchange: 'AccOwners.setRebalanceMethod', onchangeArgs: '["$value"]' }, { value: 'largest' });
  dispatch({ type: 'change', target: el });

  assert.equal(ctx.AccOwners._rebalancePending.method, 'largest');
});
