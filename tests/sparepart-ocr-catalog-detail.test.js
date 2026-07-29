'use strict';
// tests/sparepart-ocr-catalog-detail.test.js — cakupan
// modules/vehicle/sparepart-ocr-catalog-detail.js (Tahap 7C-3b: tampilkan
// detail part KALAU hasil pencarian SparepartOcrCatalogLink (Tahap 7C-3a)
// ditemukan). Fungsi MURNI, tidak menyentuh DOM, jadi dites langsung lewat
// loadSource() tanpa stub DOM (pola sama tests/sparepart-ocr-parser.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(extraGlobals) {
  return loadSource(
    ['modules/vehicle/sparepart-ocr-catalog-detail.js'],
    extraGlobals || {},
    ['SparepartOcrCatalogDetail']
  );
}

const SAMPLE_ITEM = {
  id: 'p1',
  partName: 'Kampas Rem Depan',
  category: 'Rem',
  oemCode: 'AHM12345K',
  barcode: '8991234567890',
  aftermarketCode: 'FDR-XYZ-01',
  price: 45000,
  supplier: 'Toko Jaya',
  location: 'Rak A1',
  notes: 'Catatan bebas',
  serviceNotes: 'Ganti tiap 10rb km',
  photos: ['data:image/png;base64,AAA'],
  compatibleVehicleIds: ['v1', 'v2'],
  isDraft: false,
};

// ------------------------------------------------------------------------
// fields() — normalisasi field siap tampil, fallback "Belum diisi"
// ------------------------------------------------------------------------
test('fields() — item lengkap: semua field terisi apa adanya, harga via fmt() kalau ada', () => {
  const ctx = makeCtx({ fmt: (n) => 'Rp' + n.toLocaleString('id-ID') });
  const f = ctx.SparepartOcrCatalogDetail.fields(SAMPLE_ITEM);
  assert.equal(f.partName, 'Kampas Rem Depan');
  assert.equal(f.category, 'Rem');
  assert.equal(f.oemCode, 'AHM12345K');
  assert.equal(f.barcode, '8991234567890');
  assert.equal(f.partNumber, 'FDR-XYZ-01'); // Part Number = aftermarketCode
  assert.equal(f.price, 'Rp45.000');
  assert.equal(f.supplier, 'Toko Jaya');
  assert.equal(f.location, 'Rak A1');
  assert.equal(f.isDraft, false);
});

test('fields() — fmt() belum tersedia -> harga fallback String(price) polos', () => {
  const ctx = makeCtx({});
  const f = ctx.SparepartOcrCatalogDetail.fields(SAMPLE_ITEM);
  assert.equal(f.price, '45000');
});

test('fields() — field opsional kosong/null -> fallback "Belum diisi"', () => {
  const ctx = makeCtx({});
  const f = ctx.SparepartOcrCatalogDetail.fields({
    id: 'p2', partName: '', category: '', oemCode: '', barcode: '',
    aftermarketCode: '', price: null, supplier: '', location: '',
  });
  assert.equal(f.partName, 'Belum diisi');
  assert.equal(f.category, 'Belum diisi');
  assert.equal(f.oemCode, 'Belum diisi');
  assert.equal(f.barcode, 'Belum diisi');
  assert.equal(f.partNumber, 'Belum diisi');
  assert.equal(f.price, 'Belum diisi');
  assert.equal(f.supplier, 'Belum diisi');
  assert.equal(f.location, 'Belum diisi');
});

test('fields() — price 0 (angka valid, bukan "kosong") -> tetap diformat, bukan "Belum diisi"', () => {
  const ctx = makeCtx({ fmt: (n) => 'Rp' + n });
  const f = ctx.SparepartOcrCatalogDetail.fields(Object.assign({}, SAMPLE_ITEM, { price: 0 }));
  assert.equal(f.price, 'Rp0');
});

test('fields() — item null/undefined -> semua field fallback, tidak error', () => {
  const ctx = makeCtx({});
  const f1 = ctx.SparepartOcrCatalogDetail.fields(null);
  const f2 = ctx.SparepartOcrCatalogDetail.fields(undefined);
  assert.equal(f1.partName, 'Belum diisi');
  assert.equal(f2.partName, 'Belum diisi');
});

test('fields() — photos/compatibleVehicleIds bukan referensi internal item (slice())', () => {
  const ctx = makeCtx({});
  const item = Object.assign({}, SAMPLE_ITEM, { photos: ['a'], compatibleVehicleIds: ['v1'] });
  const f = ctx.SparepartOcrCatalogDetail.fields(item);
  f.photos.push('b');
  f.compatibleVehicleIds.push('v2');
  assert.equal(item.photos.length, 1);
  assert.equal(item.compatibleVehicleIds.length, 1);
});

// ------------------------------------------------------------------------
// html() — kartu detail read-only, escaped
// ------------------------------------------------------------------------
test('html() — mengandung nama part, OEM Code, Barcode, Part Number, escaped', () => {
  const ctx = makeCtx({ escapeHtml: (s) => String(s).replace(/</g, '&lt;'), fmt: (n) => String(n) });
  const html = ctx.SparepartOcrCatalogDetail.html(Object.assign({}, SAMPLE_ITEM, { partName: '<script>' }));
  assert.match(html, /&lt;script&gt;|&lt;script>/);
  assert.match(html, /AHM12345K/);
  assert.match(html, /8991234567890/);
  assert.match(html, /FDR-XYZ-01/);
});

test('html() — item isDraft:true -> badge draft muncul', () => {
  const ctx = makeCtx({});
  const html = ctx.SparepartOcrCatalogDetail.html(Object.assign({}, SAMPLE_ITEM, { isDraft: true }));
  assert.match(html, /Draft/);
});

test('html() — item TANPA foto -> pakai ikon placeholder, tidak <img>', () => {
  const ctx = makeCtx({});
  const html = ctx.SparepartOcrCatalogDetail.html(Object.assign({}, SAMPLE_ITEM, { photos: [] }));
  assert.equal(html.includes('<img'), false);
});

test('html() — TIDAK ada tombol aksi apa pun (read-only, bukan form edit)', () => {
  const ctx = makeCtx({});
  const html = ctx.SparepartOcrCatalogDetail.html(SAMPLE_ITEM);
  assert.equal(html.includes('<button'), false);
  assert.equal(html.includes('data-action'), false);
});

// ------------------------------------------------------------------------
// show() — orkestrasi utama 7C-3b: hanya tampil KALAU found:true
// ------------------------------------------------------------------------
test('show() — found:true & ada item -> {fields, html, matchedBy}', () => {
  const ctx = makeCtx({ fmt: (n) => String(n) });
  const res = ctx.SparepartOcrCatalogDetail.show({ found: true, item: SAMPLE_ITEM, matchedBy: 'oemCode' });
  assert.notEqual(res, null);
  assert.equal(res.matchedBy, 'oemCode');
  assert.equal(res.fields.partName, 'Kampas Rem Depan');
  assert.match(res.html, /Kampas Rem Depan/);
});

test('show() — found:false -> null (TIDAK ADA yang ditampilkan)', () => {
  const ctx = makeCtx({});
  const res = ctx.SparepartOcrCatalogDetail.show({ found: false, item: null });
  assert.equal(res, null);
});

test('show() — found:true tapi item kosong (data cacat) -> tetap null, tidak crash', () => {
  const ctx = makeCtx({});
  const res = ctx.SparepartOcrCatalogDetail.show({ found: true, item: null });
  assert.equal(res, null);
});

test('show() — result undefined/null -> null, tidak error', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.SparepartOcrCatalogDetail.show(undefined), null);
  assert.equal(ctx.SparepartOcrCatalogDetail.show(null), null);
});

// ------------------------------------------------------------------------
// open() — wiring UI (Sesi 189): tulis html ke DOM + buka modal, di atas
// show() yang murni (0 logic baru, reuse penuh)
// ------------------------------------------------------------------------
function makeFakeBody() {
  return { innerHTML: '' };
}
function makeFakeDocument(elements) {
  return { getElementById: (id) => elements[id] || null };
}

test('open() — found:true -> tulis html ke #sparepartOcrDetailBody & panggil openModal("sparepartOcrDetailModal")', () => {
  const body = makeFakeBody();
  const openModalCalls = [];
  const ctx = makeCtx({
    fmt: (n) => String(n),
    document: makeFakeDocument({ sparepartOcrDetailBody: body }),
    openModal: (id) => openModalCalls.push(id),
  });
  const res = ctx.SparepartOcrCatalogDetail.open({ found: true, item: SAMPLE_ITEM, matchedBy: 'oemCode' });
  assert.notEqual(res, null);
  assert.match(body.innerHTML, /Kampas Rem Depan/);
  assert.deepEqual(openModalCalls, ['sparepartOcrDetailModal']);
});

test('open() — found:false -> TIDAK menulis DOM & TIDAK membuka modal, return null', () => {
  const body = makeFakeBody();
  const openModalCalls = [];
  const ctx = makeCtx({
    document: makeFakeDocument({ sparepartOcrDetailBody: body }),
    openModal: (id) => openModalCalls.push(id),
  });
  const res = ctx.SparepartOcrCatalogDetail.open({ found: false, item: null });
  assert.equal(res, null);
  assert.equal(body.innerHTML, '');
  assert.equal(openModalCalls.length, 0);
});

test('open() — elemen #sparepartOcrDetailBody tidak ada di DOM -> tidak melempar, modal tetap dibuka', () => {
  const openModalCalls = [];
  const ctx = makeCtx({
    fmt: (n) => String(n),
    document: makeFakeDocument({}),
    openModal: (id) => openModalCalls.push(id),
  });
  const res = ctx.SparepartOcrCatalogDetail.open({ found: true, item: SAMPLE_ITEM });
  assert.notEqual(res, null);
  assert.deepEqual(openModalCalls, ['sparepartOcrDetailModal']);
});

test('open() — document/openModal tidak tersedia -> tidak melempar, show() tetap dikembalikan apa adanya', () => {
  const ctx = makeCtx({ fmt: (n) => String(n) });
  const res = ctx.SparepartOcrCatalogDetail.open({ found: true, item: SAMPLE_ITEM, matchedBy: 'barcode' });
  assert.notEqual(res, null);
  assert.equal(res.matchedBy, 'barcode');
});

test('open() — result undefined/null -> null, tidak error', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.SparepartOcrCatalogDetail.open(undefined), null);
  assert.equal(ctx.SparepartOcrCatalogDetail.open(null), null);
});

// ------------------------------------------------------------------------
// EMPTY_LABEL diekspos & konsisten
// ------------------------------------------------------------------------
test('EMPTY_LABEL — diekspos & dipakai konsisten sbg fallback', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.SparepartOcrCatalogDetail.EMPTY_LABEL, 'Belum diisi');
  const f = ctx.SparepartOcrCatalogDetail.fields({});
  assert.equal(f.partName, ctx.SparepartOcrCatalogDetail.EMPTY_LABEL);
});
