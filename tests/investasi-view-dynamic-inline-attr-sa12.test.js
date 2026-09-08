'use strict';
// tests/investasi-view-dynamic-inline-attr-sa12.test.js — SA12, lanjutan epic migrasi
// "123 atribut event inline yang di-generate dinamis di modules/*.js" (lihat
// docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3, & SESSION-NOTE-SA11).
//
// SA12 = 1 file: modules/asset/investasi-view.js (10 dari 123 titik, family fitur
// sama "Atur Porsi Kepemilikan" dgn SA11/aset-owners.js -- pola migrasi identik:
// onX="Fn(i,this.value)" -> data-onX="Fn" data-onX-args='[i,"$value"]', dibaca
// dispatcher yang SUDAH ADA & sudah dikunci sejak SA1
// (modules/shared/features-helpers-global-security.js,
// _dataActionInputChangeHandler/_dataActionResolveArgs).
//
// CATATAN PENTING (beda dari gaya SA11's test): sesi ini HANYA menerima 2 ZIP
// patch sebelumnya (SA11 + fuel-price-ref), BUKAN proyek penuh -- jadi
// tests/helpers/loadSource.js, modules/asset/investasi.js,
// modules/shared/multi-owner-engine.js, modules/shared/owner-registry.js,
// modules/shared/ownership-engine.js TIDAK tersedia di sandbox sesi ini.
// investasi-view.js sendiri diekstrak APA ADANYA dari app-bundle-b.min.js (yang
// menurut SESSION-NOTE-SA11 dibuild TANPA minifikasi, jadi isinya source asli
// per-file) -- panjang hasil ekstraksi (1061 baris) dicocokkan dgn
// docs/FILE-MAP.md sebelum dipakai.
//
// Karena keterbatasan itu, test ini pakai vm.Script mandiri (bukan loadSource())
// dgn stub Investment MINIMAL (getHolding/getOwners/getOwnerSettlement -- 3
// method yang benar2 dipanggil openOwnersModal(), lihat source), BUKAN
// re-implementasi InvestmentUI itu sendiri. Cakupan & level assertion identik
// dgn tests/aset-owners-dynamic-inline-attr-sa11.test.js (Lapis A gate statis +
// Lapis B fungsional end-to-end lewat dispatcher ASLI). SESI BERIKUTNYA yang
// punya akses proyek penuh SEBAIKNYA menyamakan gaya ke loadSource() (ganti stub
// Investment jadi module investasi.js asli) supaya konsisten dgn test lain --
// tidak wajib, krn assertion & cakupan sudah setara, ini murni soal gaya.
//
// 2 lapis yang dikunci di sini (sama seperti SA11):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/oninput=/dst
//      (bukan data-*) di investasi-view.js.
//   B. Fungsional end-to-end -- markup nyata hasil _renderOwnersList()/
//      _ownerNameFieldHtml()/_renderRebalancePanel() punya data-onX +
//      data-onX-args yang benar, DAN dataset itu diproses lewat dispatcher ASLI
//      (diekstrak dari source file yang sama persis seperti
//      tests/data-oninput-onchange-dispatcher.test.js) -> membuktikan
//      onOwnerNameInput/onOwnerIsSelfToggle/onOwnerSettlementChange/
//      onOwnerPorsiInput benar-benar terpanggil dgn argumen tepat & draft
//      ter-update.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'asset', 'investasi-view.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md) ----

test('SA12 gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di investasi-view.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="/g) || [];
  assert.deepEqual(matches, []);
});

test('SA12 gate: tepat 10 titik data-onX="InvestmentUI...." di file ini (cocok jumlah audit S1588)', () => {
  const matches = SRC.match(/data-on(click|change|input)="InvestmentUI\./g) || [];
  assert.equal(matches.length, 10);
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
  vm.runInContext(snippet, context, { filename: 'sa12-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

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
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
  };
}

// Stub Investment MINIMAL -- hanya 3 method yang benar-benar dipanggil
// openOwnersModal()/_renderOwnersList() di source ini (lihat catatan header).
function makeInvestmentStub(holding) {
  return {
    getHolding: (id) => (id === holding.id ? holding : null),
    getOwners: (h) => h.owners,
    holdingValue: () => holding.nilai || 0,
    getOwnerSettlement: () => 'titipan',
  };
}

function baseHolding() {
  return {
    id: 'inv1',
    name: 'RDPU Bibit',
    nilai: 10000000,
    owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'istri1', porsi: 50, ownerName: 'Istri' },
    ],
  };
}

function makeCtx(dom, holding) {
  const context = {
    console,
    document: dom,
    Investment: makeInvestmentStub(holding),
    escapeHtml: (s) => String(s),
    openModal: () => {},
    closeModal: () => {},
    toast: () => {},
    askConfirm: async () => true,
    fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    fmt: (n) => 'Rp ' + Math.round(n || 0),
  };
  vm.createContext(context);
  vm.runInContext(SRC + '\nthis.InvestmentUI = InvestmentUI;', context, { filename: 'investasi-view.js' });
  return context;
}

test('SA12: markup _ownerNameFieldHtml() baris ke-1 (index 1) berisi data-oninput + data-oninput-args yang benar', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');
  const html = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(html, /data-oninput="InvestmentUI\.onOwnerNameInput" data-oninput-args='\[1,"\$value"\]'/);
});

test('SA12: markup select owner-select-change (registry) & rebalance manual owner pakai data-onchange, bukan onchange=', () => {
  assert.ok(SRC.includes('data-onchange="InvestmentUI.onOwnerSelectChange" data-onchange-args=\\\'['));
  assert.ok(SRC.includes('data-onchange="InvestmentUI.setRebalanceManualOwner" data-onchange-args=\\\'["$value"]\\\''));
});

test('SA12: markup porsi(%) & nominal(Rp) baris ke-0 berisi data-oninput-args index yang benar', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');
  const html = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(html, /data-oninput="InvestmentUI\.onOwnerPorsiInput" data-oninput-args='\[0,"\$value"\]'/);
  assert.match(html, /data-oninput="InvestmentUI\.onOwnerNominalInput" data-oninput-args='\[0,"\$value"\]'/);
});

test('SA12: checkbox "Ini saya" baris ke-1 berisi data-onchange-args dgn token $checked (bukan $value)', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');
  const html = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(html, /data-onchange="InvestmentUI\.onOwnerIsSelfToggle" data-onchange-args='\[1,"\$checked"\]'/);
});

test('SA12: select "Status Dana" (settlement) baris non-SELF berisi data-onchange yang benar', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');
  const html = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(html, /data-onchange="InvestmentUI\.onOwnerSettlementChange" data-onchange-args='\[1,"\$value"\]'/);
});

test('SA12: 3 radio metode rebalance (proporsional/largest/manual) berisi data-onchange yang benar', () => {
  const matches = SRC.match(/data-onchange="InvestmentUI\.setRebalanceMethod" data-onchange-args=\\'\["\$value"\]\\'/g) || [];
  assert.equal(matches.length, 3);
});

test('SA12 end-to-end: dispatcher ASLI + dataset persis hasil migrasi -> onOwnerNameInput(1,val) benar-benar terpanggil, draft ter-update', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');

  const dispatch = makeDispatcher({ InvestmentUI: ctx.InvestmentUI });
  const el = makeFakeElement({ oninput: 'InvestmentUI.onOwnerNameInput', oninputArgs: '[1,"$value"]' }, { value: 'Budi Santoso' });
  dispatch({ type: 'input', target: el });

  assert.equal(ctx.InvestmentUI._ownersDraft[1].ownerName, 'Budi Santoso');
});

test('SA12 end-to-end: dispatcher ASLI + dataset checkbox "Ini saya" -> onOwnerIsSelfToggle(1,true) ter-update ke draft', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');
  assert.equal(ctx.InvestmentUI._ownersDraft[1].isSelf, false); // baseline sebelum toggle

  const dispatch = makeDispatcher({ InvestmentUI: ctx.InvestmentUI });
  const el = makeFakeElement({ onchange: 'InvestmentUI.onOwnerIsSelfToggle', onchangeArgs: '[1,"$checked"]' }, { checked: true });
  dispatch({ type: 'change', target: el });

  assert.equal(ctx.InvestmentUI._ownersDraft[1].isSelf, true);
});

test('SA12 end-to-end: dispatcher ASLI + dataset select "Status Dana" -> onOwnerSettlementChange(1,"milik") ter-update ke draft', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');

  const dispatch = makeDispatcher({ InvestmentUI: ctx.InvestmentUI });
  const el = makeFakeElement({ onchange: 'InvestmentUI.onOwnerSettlementChange', onchangeArgs: '[1,"$value"]' }, { value: 'milik' });
  dispatch({ type: 'change', target: el });

  assert.equal(ctx.InvestmentUI._ownersDraft[1].settlement, 'milik');
});

test('SA12 end-to-end: dispatcher ASLI + dataset porsi(%) baris ke-0 -> onOwnerPorsiInput(0,"60") ter-update ke draft', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(dom, baseHolding());
  ctx.InvestmentUI.openOwnersModal('inv1');

  const dispatch = makeDispatcher({ InvestmentUI: ctx.InvestmentUI });
  const el = makeFakeElement({ oninput: 'InvestmentUI.onOwnerPorsiInput', oninputArgs: '[0,"$value"]' }, { value: '60' });
  dispatch({ type: 'input', target: el });

  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 60);
});
