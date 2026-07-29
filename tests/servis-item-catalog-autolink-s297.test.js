'use strict';
// tests/servis-item-catalog-autolink-s297.test.js — Sesi 297 (permintaan
// eksplisit user): sinkronkan field "Jenis Servis/Item" di modal Edit/Catat
// Catatan Servis dengan dropdown "Part dari Vehicle Catalog", supaya part
// katalog otomatis terpilih (dan karenanya stoknya otomatis kepotong saat
// simpan, lewat alur applyStockUsage/findMatchingStockByCatalogId yang SUDAH
// ada sejak Tahap 6 / S273) tanpa user perlu pilih dua kali secara terpisah.
//
// CAKUPAN: hanya `Servis.tryAutoLinkCatalogPart()` (fungsi baru) & integrasi
// pemanggilannya dari `Servis.onItemAutofillInterval()` (dipanggil live saat
// user mengetik di field Item). TIDAK mengubah logic simpan/stok itu sendiri
// (`_saveInner`, `applyStockUsage`, dll — sudah dites terpisah di
// servis-catalog-stock-sync-fix-s273.test.js & vehicle-catalog-servis-link).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeSelect(options, initialValue) {
  return {
    value: initialValue || '',
    options: options.map((o) => ({ value: o.value, dataset: { name: o.name || '', oem: o.oem || '' } })),
  };
}

function makeCtx({ document, D, calls }) {
  return loadSource(
    ['car-notes.js'],
    {
      document, D,
      curVehicleId: 'v1',
      uid: (() => { let n = 9000; return () => (n += 1); })(),
      escapeHtml: (s) => String(s),
      matchingVehicleName: () => null,
      codeFromName: (s) => String(s).toLowerCase(),
      getVehicleKm: () => 0,
      resolveVehicleTxCategory: () => 'Transportasi',
      save: () => calls.push('save'),
      closeModal: (id) => calls.push('closeModal:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      renderCnTab: () => calls.push('renderCnTab'),
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      askConfirm: async () => true,
      withSaveGuardAsync: (key, modalId, fn) => fn(),
      Sparepart: { renderStockList: () => {}, renderCatList: () => {} },
      VehicleCatalogServisLink: { attachToServis: () => {} },
    },
    ['Servis'],
  );
}

function baseD(overrides = {}) {
  return Object.assign({
    vehicles: [{ id: 'v1', name: 'Vario' }],
    accounts: [{ id: 'a1', name: 'Cash' }],
    sparepartCats: [],
    partsStock: [],
    servisLogs: [],
    transactions: [],
  }, overrides);
}

function makeDoc(els) {
  return { getElementById: (id) => els[id] || null };
}

function makeWrap() {
  return { style: {}, classList: { list: new Set(['u-dnone']), remove(c) { this.list.delete(c); }, add(c) { this.list.add(c); } } };
}

function baseEls(catalogSel) {
  return {
    servisItem: { value: '' },
    servisInterval: { value: '', dataset: {} },
    servisCatalogPartId: catalogSel,
    servisCatalogPartQtyWrap: { style: {} },
    servisCatalogPartialWrap: makeWrap(),
    servisCatalogPartialList: { innerHTML: '' },
    servisCatalogRecoWrap: { style: {} },
    servisCatalogRecoList: { innerHTML: '' },
  };
}

test('exact name match tunggal -> auto-pilih part katalog & tampilkan qty field', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([
    { value: '', name: '' },
    { value: 'cat_1', name: 'Piston Kit' },
  ], '');
  const els = baseEls(catalogSel);
  els.servisItem.value = 'Piston Kit';
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Piston Kit');

  assert.equal(catalogSel.value, 'cat_1');
  assert.equal(els.servisCatalogPartQtyWrap.style.display, 'block');
});

test('match case-insensitive tetap kena (Piston kit vs Piston Kit)', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_9', name: 'Kampas Rem Depan' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('kampas rem depan');

  assert.equal(catalogSel.value, 'cat_9');
});

test('tidak ada match -> dropdown katalog tetap kosong, tidak error', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Piston Kit' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Ganti Oli');

  assert.equal(catalogSel.value, '');
});

test('ambigu (2+ part nama sama persis) -> TIDAK auto-pilih (biar user pilih manual)', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([
    { value: 'cat_1', name: 'Kampas Rem' },
    { value: 'cat_2', name: 'Kampas Rem' },
  ], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem');

  assert.equal(catalogSel.value, '');
});

test('sudah ada pilihan manual sebelumnya -> TIDAK ditimpa oleh auto-link', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([
    { value: 'cat_1', name: 'Piston Kit' },
    { value: 'cat_2', name: 'Klep Set' },
  ], 'cat_2'); // user sudah pilih manual "Klep Set"
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Piston Kit');

  assert.equal(catalogSel.value, 'cat_2'); // tetap, tidak berubah jadi cat_1
});

test('item kosong -> tidak crash, dropdown katalog tetap seperti semula', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Piston Kit' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  assert.doesNotThrow(() => ctx.Servis.tryAutoLinkCatalogPart(''));
  assert.equal(catalogSel.value, '');
});

test('integrasi: onItemAutofillInterval() (dipanggil live saat ketik) turut memicu auto-link', () => {
  const D = baseD({ sparepartCats: [{ id: 'c1', name: 'Piston Kit', intervalKm: 8000 }] });
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Piston Kit' }], '');
  const els = baseEls(catalogSel);
  els.servisItem.value = 'Piston Kit';
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.onItemAutofillInterval();

  assert.equal(catalogSel.value, 'cat_1');
  assert.equal(els.servisInterval.value, 8000); // interval tetap tersinkron seperti sebelumnya (S-lama, tidak berubah)
});

test('dropdown katalog belum termuat (null) -> onItemAutofillInterval tetap aman, tidak crash', () => {
  const D = baseD({ sparepartCats: [] });
  const calls = [];
  const els = baseEls(null);
  els.servisItem.value = 'Ganti Oli';
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  assert.doesNotThrow(() => ctx.Servis.onItemAutofillInterval());
});

// --- Partial match + konfirmasi (sesi lanjutan, permintaan eksplisit user) ---

test('partial match (nama part memuat teks item) -> TIDAK auto-pilih, tampil area konfirmasi', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Kampas Rem Depan Set' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem');

  assert.equal(catalogSel.value, '');
  assert.ok(!els.servisCatalogPartialWrap.classList.list.has('u-dnone'));
  assert.match(els.servisCatalogPartialList.innerHTML, /Kampas Rem Depan Set/);
});

test('partial match (item memuat nama part yang lebih pendek) -> tetap terdeteksi sbg kandidat', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Piston' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Ganti Piston Kit Depan');

  assert.equal(catalogSel.value, '');
  assert.match(els.servisCatalogPartialList.innerHTML, /Piston/);
});

test('konfirmasi partial match (tap chip) -> BARU part terpilih & qty field muncul', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Kampas Rem Depan Set' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem');
  assert.equal(catalogSel.value, '');
  ctx.Servis.confirmPartialCatalogMatch('cat_1');

  assert.equal(catalogSel.value, 'cat_1');
  assert.equal(els.servisCatalogPartQtyWrap.style.display, 'block');
  assert.ok(els.servisCatalogPartialWrap.classList.list.has('u-dnone'));
});

test('abaikan partial match (dismiss) -> dropdown katalog tetap kosong, area konfirmasi tertutup', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Kampas Rem Depan Set' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem');
  ctx.Servis.dismissPartialCatalogMatch();

  assert.equal(catalogSel.value, '');
  assert.ok(els.servisCatalogPartialWrap.classList.list.has('u-dnone'));
  assert.equal(els.servisCatalogPartialList.innerHTML, '');
});

test('tidak ada match sama sekali (exact maupun partial) -> area konfirmasi tetap tertutup', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([{ value: 'cat_1', name: 'Piston Kit' }], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Ganti Oli');

  assert.equal(catalogSel.value, '');
  assert.ok(els.servisCatalogPartialWrap.classList.list.has('u-dnone'));
});

test('ambigu di exact match -> TIDAK lanjut ke partial match juga', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([
    { value: 'cat_1', name: 'Kampas Rem' },
    { value: 'cat_2', name: 'Kampas Rem' },
  ], '');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem');

  assert.equal(catalogSel.value, '');
  assert.ok(els.servisCatalogPartialWrap.classList.list.has('u-dnone'));
});

test('sudah ada pilihan manual sebelumnya -> tidak muncul area konfirmasi partial juga', () => {
  const D = baseD();
  const calls = [];
  const catalogSel = makeSelect([
    { value: 'cat_1', name: 'Kampas Rem Depan Set' },
    { value: 'cat_2', name: 'Klep Set' },
  ], 'cat_2');
  const els = baseEls(catalogSel);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem');

  assert.equal(catalogSel.value, 'cat_2');
  assert.ok(els.servisCatalogPartialWrap.classList.list.has('u-dnone'));
});

test('dropdown katalog belum termuat (null) -> tryAutoLinkCatalogPart tetap aman, tidak crash', () => {
  const D = baseD();
  const calls = [];
  const els = baseEls(null);
  const doc = makeDoc(els);
  const ctx = makeCtx({ document: doc, D, calls });

  assert.doesNotThrow(() => ctx.Servis.tryAutoLinkCatalogPart('Kampas Rem'));
});
