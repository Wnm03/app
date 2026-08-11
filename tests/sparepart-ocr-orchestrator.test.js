'use strict';
// tests/sparepart-ocr-orchestrator.test.js — cakupan
// modules/vehicle/sparepart-ocr-orchestrator.js (Tahap 7C-4b: orkestrator
// utama Scan (7C-1) -> Parse (7C-2) -> Cari Vehicle Catalog (7C-3a) ->
// found ? Detail (7C-3b) : Add (7C-3c)).
// Kelima dependency (SparepartOcr/SparepartOcrParser/
// SparepartOcrCatalogLink/SparepartOcrCatalogDetail/SparepartOcrCatalogAdd)
// di-mock lewat extraGlobals (pola sama tests/sparepart-ocr-catalog-add.test.js
// / tests/sparepart-ocr-catalog-detail.test.js) supaya orkestrator dites
// murni sbg pemanggil, TANPA mengulang logic tahap-tahap sebelumnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const SAMPLE_TEXT = 'NGK BUSI CB150R IRIDIUM\nAHM12345K\n8991234567890';
const SAMPLE_PARSED = {
  oemCode: 'AHM12345K',
  partName: 'NGK BUSI CB150R IRIDIUM',
  brand: 'NGK',
  barcode: '8991234567890',
};
const SAMPLE_ITEM = { id: 'p1', partName: 'Busi Iridium', oemCode: 'AHM12345K' };

function makeSparepartOcr(scanImpl) {
  return {
    calls: 0,
    async scan() {
      this.calls++;
      return typeof scanImpl === 'function' ? scanImpl() : scanImpl;
    },
  };
}

function makeParser(parseTextImpl) {
  return {
    calls: [],
    parseText(text) {
      this.calls.push(text);
      return typeof parseTextImpl === 'function' ? parseTextImpl(text) : parseTextImpl;
    },
  };
}

function makeLink(findResult) {
  return {
    calls: [],
    async findFromParsed(parsed) {
      this.calls.push(parsed);
      return findResult;
    },
  };
}

function makeDetail(showResult) {
  return {
    calls: [],
    show(result) {
      this.calls.push(result);
      return showResult;
    },
  };
}

function makeDetailWithOpen(openResult) {
  return {
    showCalls: [],
    openCalls: [],
    show(result) {
      this.showCalls.push(result);
      return null; // tidak boleh dipakai kalau open() tersedia
    },
    open(result) {
      this.openCalls.push(result);
      return openResult;
    },
  };
}

function makeAdd(openResult) {
  return {
    calls: [],
    async open(findResult, parsed) {
      this.calls.push({ findResult, parsed });
      return openResult;
    },
  };
}

function makeCtx({ ocr, parser, link, detail, add } = {}) {
  const extraGlobals = {};
  if (ocr !== undefined) extraGlobals.SparepartOcr = ocr;
  if (parser !== undefined) extraGlobals.SparepartOcrParser = parser;
  if (link !== undefined) extraGlobals.SparepartOcrCatalogLink = link;
  if (detail !== undefined) extraGlobals.SparepartOcrCatalogDetail = detail;
  if (add !== undefined) extraGlobals.SparepartOcrCatalogAdd = add;
  const ctx = loadSource(
    ['modules/vehicle/sparepart-ocr-orchestrator.js'],
    extraGlobals,
    ['SparepartOcrOrchestrator']
  );
  return ctx;
}

// ------------------------------------------------------------------------
// step: 'scan' — dependency belum tersedia / hasil scan null / hasil scan ''
// ------------------------------------------------------------------------
test('run() — SparepartOcr belum tersedia -> {ok:false, step:"scan"}, TIDAK lanjut apa pun', async () => {
  const parser = makeParser(SAMPLE_PARSED);
  const link = makeLink({ found: false, item: null });
  const ctx = makeCtx({ parser, link });
  const res = await ctx.SparepartOcrOrchestrator.run();
  assert.equal(res.ok, false);
  assert.equal(res.step, 'scan');
  assert.equal(parser.calls.length, 0);
  assert.equal(link.calls.length, 0);
});

test('run() — SparepartOcr.scan() null (dibatalkan/gagal) -> berhenti di scan, text:null, TIDAK lanjut parse/cari', async () => {
  const ocr = makeSparepartOcr(null);
  const parser = makeParser(SAMPLE_PARSED);
  const link = makeLink({ found: false, item: null });
  const ctx = makeCtx({ ocr, parser, link });
  const res = await ctx.SparepartOcrOrchestrator.run();
  assert.equal(res.ok, false);
  assert.equal(res.step, 'scan');
  assert.equal(res.text, null);
  assert.equal(ocr.calls, 1);
  assert.equal(parser.calls.length, 0);
  assert.equal(link.calls.length, 0);
});

test('run() — SparepartOcr.scan() "" (tidak ada teks terdeteksi) -> berhenti di scan, text:"", TIDAK lanjut parse/cari', async () => {
  const ocr = makeSparepartOcr('');
  const parser = makeParser(SAMPLE_PARSED);
  const link = makeLink({ found: false, item: null });
  const ctx = makeCtx({ ocr, parser, link });
  const res = await ctx.SparepartOcrOrchestrator.run();
  assert.equal(res.ok, false);
  assert.equal(res.step, 'scan');
  assert.equal(res.text, '');
  assert.equal(parser.calls.length, 0);
  assert.equal(link.calls.length, 0);
});

// ------------------------------------------------------------------------
// step: 'parse' — SparepartOcrParser belum tersedia
// ------------------------------------------------------------------------
test('run() — SparepartOcrParser belum tersedia -> berhenti di parse, TIDAK lanjut cari', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const link = makeLink({ found: false, item: null });
  const ctx = makeCtx({ ocr, link });
  const res = await ctx.SparepartOcrOrchestrator.run();
  assert.equal(res.ok, false);
  assert.equal(res.step, 'parse');
  assert.equal(res.text, SAMPLE_TEXT);
  assert.equal(link.calls.length, 0);
});

// ------------------------------------------------------------------------
// step: 'find' — SparepartOcrCatalogLink belum tersedia
// ------------------------------------------------------------------------
test('run() — SparepartOcrCatalogLink belum tersedia -> berhenti di find, TIDAK panggil detail/add', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const detail = makeDetail({ fields: {}, html: '', matchedBy: '' });
  const add = makeAdd({ partName: '' });
  const ctx = makeCtx({ ocr, parser, detail, add });
  const res = await ctx.SparepartOcrOrchestrator.run();
  assert.equal(res.ok, false);
  assert.equal(res.step, 'find');
  assert.deepEqual(res.parsed, SAMPLE_PARSED);
  assert.equal(detail.calls.length, 0);
  assert.equal(add.calls.length, 0);
});

// ------------------------------------------------------------------------
// step: 'detail' — ditemukan -> panggil SparepartOcrCatalogDetail.show(),
// TIDAK panggil SparepartOcrCatalogAdd.open() sama sekali
// ------------------------------------------------------------------------
test('run() — part DITEMUKAN -> step:"detail", panggil SparepartOcrCatalogDetail.show(findResult) apa adanya, Add TIDAK dipanggil', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const findResult = { found: true, item: SAMPLE_ITEM, matchedBy: 'oemCode' };
  const link = makeLink(findResult);
  const detailShow = { fields: { partName: 'Busi Iridium' }, html: '<div></div>', matchedBy: 'oemCode' };
  const detail = makeDetail(detailShow);
  const add = makeAdd({ partName: 'should-not-be-called' });
  const ctx = makeCtx({ ocr, parser, link, detail, add });

  const res = await ctx.SparepartOcrOrchestrator.run();

  assert.equal(res.ok, true);
  assert.equal(res.step, 'detail');
  assert.equal(res.text, SAMPLE_TEXT);
  assert.deepEqual(res.parsed, SAMPLE_PARSED);
  assert.deepEqual(res.findResult, findResult);
  assert.deepEqual(res.detail, detailShow);
  assert.equal(detail.calls.length, 1);
  assert.deepEqual(detail.calls[0], findResult);
  assert.equal(add.calls.length, 0);
});

test('run() — part DITEMUKAN tapi SparepartOcrCatalogDetail belum tersedia -> tetap step:"detail", detail:null (gagal aman)', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const findResult = { found: true, item: SAMPLE_ITEM, matchedBy: 'barcode' };
  const link = makeLink(findResult);
  const ctx = makeCtx({ ocr, parser, link });

  const res = await ctx.SparepartOcrOrchestrator.run();

  assert.equal(res.ok, true);
  assert.equal(res.step, 'detail');
  assert.equal(res.detail, null);
});

test('run() — part DITEMUKAN & SparepartOcrCatalogDetail punya open() (Sesi 189) -> utamakan open(findResult), BUKAN show()', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const findResult = { found: true, item: SAMPLE_ITEM, matchedBy: 'oemCode' };
  const link = makeLink(findResult);
  const openResult = { fields: { partName: 'Busi Iridium' }, html: '<div></div>', matchedBy: 'oemCode' };
  const detail = makeDetailWithOpen(openResult);
  const ctx = makeCtx({ ocr, parser, link, detail });

  const res = await ctx.SparepartOcrOrchestrator.run();

  assert.equal(res.step, 'detail');
  assert.deepEqual(res.detail, openResult);
  assert.equal(detail.openCalls.length, 1);
  assert.deepEqual(detail.openCalls[0], findResult);
  assert.equal(detail.showCalls.length, 0);
});

// ------------------------------------------------------------------------
// step: 'add' — tidak ditemukan -> panggil SparepartOcrCatalogAdd.open(),
// TIDAK panggil SparepartOcrCatalogDetail.show() sama sekali
// ------------------------------------------------------------------------
test('run() — part TIDAK ditemukan -> step:"add", panggil SparepartOcrCatalogAdd.open(findResult, parsed) apa adanya, Detail TIDAK dipanggil', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const findResult = { found: false, item: null };
  const link = makeLink(findResult);
  const detail = makeDetail({ fields: {}, html: '', matchedBy: '' });
  const addFields = { partName: 'NGK BUSI CB150R IRIDIUM', oemCode: 'AHM12345K', barcode: '8991234567890' };
  const add = makeAdd(addFields);
  const ctx = makeCtx({ ocr, parser, link, detail, add });

  const res = await ctx.SparepartOcrOrchestrator.run();

  assert.equal(res.ok, true);
  assert.equal(res.step, 'add');
  assert.equal(res.text, SAMPLE_TEXT);
  assert.deepEqual(res.parsed, SAMPLE_PARSED);
  assert.deepEqual(res.findResult, findResult);
  assert.deepEqual(res.addResult, addFields);
  assert.equal(add.calls.length, 1);
  assert.deepEqual(add.calls[0].findResult, findResult);
  assert.deepEqual(add.calls[0].parsed, SAMPLE_PARSED);
  assert.equal(detail.calls.length, 0);
});

test('run() — part TIDAK ditemukan tapi SparepartOcrCatalogAdd belum tersedia -> tetap step:"add", addResult:null (gagal aman)', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const findResult = { found: false, item: null };
  const link = makeLink(findResult);
  const ctx = makeCtx({ ocr, parser, link });

  const res = await ctx.SparepartOcrOrchestrator.run();

  assert.equal(res.ok, true);
  assert.equal(res.step, 'add');
  assert.equal(res.addResult, null);
});

test('run() — findResult.found falsy tanpa property found sama sekali -> tetap dianggap tidak ditemukan (step:"add")', async () => {
  const ocr = makeSparepartOcr(SAMPLE_TEXT);
  const parser = makeParser(SAMPLE_PARSED);
  const link = makeLink({ item: null });
  const add = makeAdd({ partName: '' });
  const ctx = makeCtx({ ocr, parser, link, add });

  const res = await ctx.SparepartOcrOrchestrator.run();

  assert.equal(res.step, 'add');
  assert.equal(add.calls.length, 1);
});
