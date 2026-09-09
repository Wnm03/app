'use strict';
// tests/sesi3-txmodal-stok-renov-shopstock-shopsale-toggle-inline-attr.test.js —
// Sesi 3, lanjutan PATCH-SESI1-SESI2-fix-csp-inline-handlers (migrasi atribut
// event inline txModal yang diblokir CSP script-src-attr 'none'). Sesi ini
// menutup 9 elemen toggle sisa di panel Stok Sparepart/Renovasi/Stok Shop/
// Penjualan Shop: #txStockItem, #txAddRenov, #txAddShopStock,
// #txShopStockItem, #txShopStockProdusen, #txAddShopSale, #txShopSaleItem,
// #txShopSaleDiskon, #txShopSaleOngkir.
//
// (#txAddStock sudah dimigrasi sesi sebelumnya -- TIDAK termasuk cakupan
// sesi ini, hanya diverifikasi ulang di test "tidak ikut berubah" di bawah.)
//
// Semua 9 elemen ini onchange 0-argumen ke SATU fungsi top-level (tanpa
// argumen berbeda/tanpa referensi variabel non-JSON-serializable), jadi
// cukup migrasi LANGSUNG ke data-onchange="namaFungsi" lewat dispatcher
// generik (_dataActionInputChangeHandler) -- TIDAK perlu wrapper baru,
// pola sama persis dengan #txAcc/#txAddStock (Sesi 1/2).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');

const TARGETS = [
  { id: 'txStockItem', fn: 'onTxStockItemChange' },
  { id: 'txAddRenov', fn: 'toggleTxRenovFields' },
  { id: 'txAddShopStock', fn: 'toggleTxShopStockFields' },
  { id: 'txShopStockItem', fn: 'onTxShopStockItemChange' },
  { id: 'txShopStockProdusen', fn: 'onTxShopStockProdusenChange' },
  { id: 'txAddShopSale', fn: 'toggleTxShopSaleFields' },
  { id: 'txShopSaleItem', fn: 'onTxShopSaleItemChange' },
  { id: 'txShopSaleDiskon', fn: 'syncTxShopSaleAmt' },
  { id: 'txShopSaleOngkir', fn: 'syncTxShopSaleAmt' },
];

// ---- Lapis A: gate literal (markup) ----

for (const { id, fn } of TARGETS) {
  test(`sesi3 gate: #${id} sudah pakai data-onchange="${fn}", onchange inline lama hilang`, () => {
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan di modals.js`);
    const snippet = MODALS_SRC.slice(idx, idx + 200);
    assert.ok(
      snippet.includes(`data-onchange=\\"${fn}\\"`),
      `#${id} harus punya data-onchange=\\"${fn}\\". SNIPPET: ${snippet}`
    );
    assert.doesNotMatch(
      snippet,
      /(?<!data-)\bonchange=\\"/,
      `#${id} masih punya atribut onchange inline lama: ${snippet}`
    );
  });
}

test('sesi3 gate: #txAddStock (dimigrasi sesi sebelumnya) tidak ikut berubah/rusak sesi ini', () => {
  const idx = MODALS_SRC.indexOf('id=\\"txAddStock\\"');
  assert.notEqual(idx, -1, '#txAddStock tidak ditemukan');
  const snippet = MODALS_SRC.slice(idx, idx + 200);
  assert.ok(snippet.includes('data-onchange=\\"toggleTxStockFields\\"'));
});

// ---- Lapis B: dispatcher ASLI end-to-end (diekstrak dari source, tidak diubah sesi ini) ----

const DISPATCHER_PATH = path.join(ROOT, 'modules/shared/features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

function extractFnSource(fnName) {
  const marker = `function ${fnName}(`;
  const start = DISPATCHER_SRC.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = DISPATCHER_SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < DISPATCHER_SRC.length && depth > 0) {
    if (DISPATCHER_SRC[i] === '{') depth++;
    else if (DISPATCHER_SRC[i] === '}') depth--;
    i++;
  }
  return DISPATCHER_SRC.slice(start, i);
}

function makeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sesi3-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

for (const { id, fn } of TARGETS) {
  test(`sesi3 end-to-end (onchange): #${id} -> ${fn}() terpanggil 0-arg lewat dispatcher`, () => {
    const calls = [];
    const stub = { [fn]: (...args) => calls.push(args) };
    const dispatch = makeDispatcher(stub);
    const el = makeFakeEl({ onchange: fn });
    dispatch({ type: 'change', target: el });
    assert.deepEqual(calls, [[]]);
  });
}
