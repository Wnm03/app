'use strict';
// tests/scan-ocr-epoch-guard.test.js — regresi utk fix "hasil scan OCR bisa
// nyasar ke record lain" (audit: race condition async scan vs pindah modal).
//
// Root cause: scan-ocr.js (scanReceipt/scanBuktiTransfer/scanTanggalDariFoto/
// scanKmOdometer) menulis hasil OCR ke ID field TETAP (mis. #billAmt) yang
// dipakai ulang oleh modal yang sama utk record APAPUN yang lagi diedit
// (mis. billEditId, tagihan-kalender.js). ocrRecognize() (Tesseract) bisa
// makan beberapa detik -- kalau user tutup modal & buka record LAIN sebelum
// OCR selesai, hasil scan yang telat itu dulu tetap ditulis ke field yang
// sekarang terikat ke record baru, diam-diam menimpa data record yang salah.
//
// Fix: openModal() menaikkan window._modalEpoch tiap kali modal dibuka (atau
// dibuka ULANG utk record berbeda). scan-ocr.js menangkap epoch SEBELUM await
// OCR (_scanEpochNow()) lalu mengecek ulang PERSIS setelah OCR selesai
// (_scanEpochStale()) -- kalau epoch sudah berubah, penulisan hasil OCR
// dibatalkan.
//
// Test ini tidak mensimulasikan Tesseract sungguhan (di luar cakupan unit
// test), tapi membuktikan lewat source ASLI (loadSource) bahwa:
//   1. openModal() menaikkan _modalEpoch tiap dipanggil (termasuk dipanggil
//      ulang utk modal id yang sama -- kasus "ganti record").
//   2. _scanEpochStale() balik true kalau epoch sudah berubah sejak
//      _scanEpochNow() ditangkap, dan false kalau belum berubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeOverlay() {
  const classes = new Set();
  return {
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
  };
}

function makeFakeDocument() {
  return {
    getElementById() { return makeFakeOverlay(); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    body: { classList: { add() {}, remove() {}, contains: () => false, toggle() {} } },
  };
}

test('openModal() menaikkan window._modalEpoch tiap dipanggil, termasuk dipanggil ulang utk id yang sama (ganti record)', () => {
  const fakeWindow = {};
  const ctx = loadSource(
    ['modules/shared/modal-navigasi.js'],
    { document: makeFakeDocument(), window: fakeWindow },
  );

  assert.equal(fakeWindow._modalEpoch, undefined, 'belum ada modal dibuka -> epoch belum diset');

  ctx.openModal('billModal'); // buka utk edit Tagihan A
  const epochA = fakeWindow._modalEpoch;
  assert.equal(typeof epochA, 'number');

  ctx.openModal('billModal'); // tutup A, buka LAGI billModal tapi utk Tagihan B
  const epochB = fakeWindow._modalEpoch;
  assert.notEqual(epochB, epochA, 'buka ulang modal yang sama (record berbeda) harus menaikkan epoch');
});

test('_scanEpochStale() mendeteksi modal/record sudah berpindah sebelum OCR selesai', () => {
  const fakeWindow = { _modalEpoch: 5 };
  const toasts = [];
  const ctx = loadSource(
    ['modules/shared/scan-ocr.js'],
    { document: makeFakeDocument(), window: fakeWindow, toast: (msg) => toasts.push(msg) },
  );

  const epochAtScanStart = ctx._scanEpochNow();
  assert.equal(epochAtScanStart, 5);

  // Belum ada perpindahan modal -> hasil OCR masih valid.
  assert.equal(ctx._scanEpochStale(epochAtScanStart), false);
  assert.equal(toasts.length, 0);

  // Simulasikan user pindah ke record lain (openModal menaikkan epoch) SEBELUM
  // OCR yang berjalan di background selesai.
  fakeWindow._modalEpoch = 6;

  assert.equal(ctx._scanEpochStale(epochAtScanStart), true, 'epoch berubah -> hasil OCR harus ditolak, bukan ditulis ke record baru');
  assert.equal(toasts.length, 1, 'user harus diberi tahu kalau hasil scan dibatalkan');
});
