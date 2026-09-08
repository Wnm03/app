'use strict';
// tests/sa15-import-preview-dynamic-inline-attr.test.js — SA15, lanjutan
// SA11-SA14 (lihat SESSION-NOTE-SA15-import-preview-dynamic-inline-attr.md),
// bagian dari epic migrasi "123 atribut event inline yang di-generate
// dinamis di modules/*.js" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md,
// rekomendasi #3). SA11-SA14 (aset-owners.js, investasi-view.js, akun.js,
// investasi-list-view.js, aset.js) sudah tuntas. Sesi ini: 5 file "preview
// import" (vehicle-catalog-import-ui.js, honda-pdf-import-ui.js,
// vehicle-catalog-web-import-ui.js, shop-scan-ui.js, shop-pdf-import-ui.js),
// 22 titik total -- semua pola SAMA (beda dari SA11-SA14): checkbox
// onchange="X.toggleRow(idx)" (1 arg numerik) + input oninput=
// "X.editField(idx,'field',this.value)" (3 arg: idx numerik, NAMA FIELD
// LITERAL, token $value) -- pola 3-arg dgn literal field name di tengah ini
// BARU (belum pernah dipakai SA11-SA14, yang selalu [i,"$value"] atau
// [i,"$checked"] 2-arg), jadi lapis B di bawah menguji KHUSUS resolusi
// args campuran [idx, "field literal", "$value"] lewat dispatcher ASLI.
//
//   1. Checkbox "sertakan baris" onchange="X.toggleRow(idx)"
//      -> data-onchange="X.toggleRow" data-onchange-args='[idx]'
//   2. Input field (per field)   oninput="X.editField(idx,'field',this.value)"
//      -> data-oninput="X.editField" data-oninput-args='[idx,"field","$value"]'
//
// 2 lapis (pola sama SA11-SA14):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/oninput=/dst
//      (bukan data-*) di kelima file.
//   B. Fungsional end-to-end -- dispatcher ASLI (_dataActionInputChangeHandler,
//      diekstrak dari modules/shared/features-helpers-global-security.js,
//      TIDAK diubah lagi sesi ini) benar-benar memanggil toggleRow(idx) &
//      editField(idx,'field',value) dengan argumen yang tepat, memakai
//      dataset PERSIS seperti yang dihasilkan template masing-masing file
//      (idx + nama field literal per file, diverifikasi cocok dgn source).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILES = [
  { path: 'modules/vehicle/vehicle-catalog-import-ui.js', ns: 'VehicleCatalogImportUI', fields: ['partName', 'category', 'oemCode', 'price'] },
  { path: 'modules/vehicle/honda-pdf-import-ui.js', ns: 'HondaPdfImportUI', fields: ['partName', 'category', 'oemCode', 'price'] },
  { path: 'modules/vehicle/vehicle-catalog-web-import-ui.js', ns: 'VehicleCatalogWebImportUI', fields: ['partName', 'oemCode', 'price'] },
  { path: 'modules/business/shop-scan-ui.js', ns: 'ShopScanUI', fields: ['nama', 'kategori', 'harga'] },
  { path: 'modules/business/shop-pdf-import-ui.js', ns: 'ShopPdfImportUI', fields: ['nama', 'kategori', 'harga'] },
];

const INLINE_RE = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g;

for (const { path: relPath, ns, fields } of FILES) {
  const SRC_PATH = path.join(__dirname, '..', relPath);
  const SRC = fs.readFileSync(SRC_PATH, 'utf8');

  test(`SA15 gate: 0 atribut event inline tersisa di ${relPath}`, () => {
    const matches = SRC.match(INLINE_RE) || [];
    assert.deepEqual(matches, []);
  });

  test(`SA15 gate: ${ns}.toggleRow data-onchange dgn args idx tersedia di source`, () => {
    assert.ok(SRC.includes(`data-onchange="${ns}.toggleRow" data-onchange-args=`));
  });

  for (const field of fields) {
    test(`SA15 gate: ${ns}.editField data-oninput dgn field literal "${field}" + $value tersedia di source`, () => {
      assert.ok(SRC.includes(`data-oninput="${ns}.editField" data-oninput-args=`));
      assert.ok(SRC.includes(`,"${field}","$value"]`));
    });
  }
}

test('SA15 gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=/data-oninput=', () => {
  const positiveOnchange = 'onchange="Foo.bar(1)"';
  const positiveOninput = 'oninput="Foo.baz(1,\'f\',this.value)"';
  const negativeDataOnchange = 'data-onchange="Foo.bar"';
  const negativeDataOninput = 'data-oninput="Foo.baz"';
  assert.equal((positiveOnchange.match(INLINE_RE) || []).length, 1);
  assert.equal((positiveOninput.match(INLINE_RE) || []).length, 1);
  assert.equal((negativeDataOnchange.match(INLINE_RE) || []).length, 0);
  assert.equal((negativeDataOninput.match(INLINE_RE) || []).length, 0);
});

// ---- Lapis B: dispatcher asli end-to-end (pola args 3-elemen BARU) ----

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

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

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionResolveArgs')}
${extractFnSource(DISPATCHER_SRC, '_dataActionInputChangeHandler')}
this._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa15-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeElement(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

for (const { path: relPath, ns, fields } of FILES) {
  test(`SA15 end-to-end (change): ${ns} dataset persis hasil migrasi -> toggleRow(idx) benar-benar terpanggil dgn idx yang tepat`, () => {
    const calls = [];
    const stub = { [ns]: { toggleRow: (...args) => calls.push(args) } };
    const dispatchChange = makeChangeDispatcher(stub);
    const el = makeFakeElement({ onchange: `${ns}.toggleRow`, onchangeArgs: '[3]' });
    dispatchChange({ type: 'change', target: el });
    assert.deepEqual(calls, [[3]]);
  });

  test(`SA15 end-to-end (input): ${ns} dataset persis hasil migrasi -> editField(idx,'${fields[0]}',value) benar-benar terpanggil dgn 3 argumen yang tepat`, () => {
    const calls = [];
    const stub = { [ns]: { editField: (...args) => calls.push(args) } };
    const dispatchInput = makeChangeDispatcher(stub);
    const el = makeFakeElement({ oninput: `${ns}.editField`, oninputArgs: JSON.stringify([2, fields[0], '$value']) });
    el.value = 'nilai baru';
    dispatchInput({ type: 'input', target: el });
    assert.deepEqual(calls, [[2, fields[0], 'nilai baru']]);
  });
}
