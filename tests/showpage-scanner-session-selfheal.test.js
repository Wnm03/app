'use strict';
// tests/showpage-scanner-session-selfheal.test.js — regresi utk bugfix
// "semua tombol Car Notes & Tagihan tidak respon, 0 toast" (laporan user,
// s362). Root cause: ScannerSession bisa nyangkut _scannerSessionActive=true
// permanen kalau proses tutup kamera terputus (app di-minimize saat prompt
// izin kamera, tab di-suspend, dll) -- lihat modules/shared/scanner-session.js.
// Selama itu, body.scanner-session-active nempel & CSS
// (_scannerSessionEnsureStyle) men-display:none SEMUA .overlay/.qs-modal-
// overlay/.calc-overlay/.keu-fab/#toast SELAMANYA -- termasuk toast error
// dispatcher sendiri, jadi tombol kelihatan "mati total" tanpa jejak apa pun.
//
// Self-heal (_scannerSessionSelfHeal) SEBELUM fix ini cuma dipanggil lewat
// ScannerSession.enter()/isActive(), yang cuma jalan saat user coba buka
// scanner LAGI. Kalau user cuma pindah tab (showPage()), state nyangkut ini
// tidak pernah ke-heal. Fix: showPage() sekarang juga memanggil
// ScannerSession.isActive() di awal (titik aman self-heal, karena pindah tab
// = keluar dari konteks scanner manapun).
//
// Test ini TIDAK mengetes ulang logic self-heal itu sendiri (sudah dites
// lengkap di tests/scanner-session.test.js) -- cuma membuktikan showPage()
// benar-benar MEMANGGIL ScannerSession.isActive() setiap kali dijalankan,
// lewat source ASLI (loadSource), bukan re-implementasi.

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
    setAttribute() {},
    style: {},
  };
}

function makeFakeDocument({ pageExists }) {
  const body = { classList: { add() {}, remove() {}, contains: () => false } };
  const scrollRoot = { scrollTop: 0 };
  return {
    body,
    getElementById(id) {
      if (id === 'scrollRoot') return scrollRoot;
      if (id.startsWith('page-')) return pageExists ? makeFakeOverlay() : null;
      return makeFakeOverlay();
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadModalNavigasi(fakeDoc, scannerSessionStub) {
  return loadSource(
    ['modules/shared/modal-navigasi.js'],
    {
      document: fakeDoc,
      window: {},
      ScannerSession: scannerSessionStub,
      renderPageContent: () => {},
    },
  );
}

test('showPage() — memanggil ScannerSession.isActive() (self-heal) tiap pindah tab', () => {
  let calls = 0;
  const scannerSessionStub = { isActive: () => { calls++; return false; } };
  const fakeDoc = makeFakeDocument({ pageExists: true });
  const ctx = loadModalNavigasi(fakeDoc, scannerSessionStub);

  ctx.showPage('mobil');

  assert.equal(calls, 1, 'showPage() harus memanggil ScannerSession.isActive() tepat 1x');
});

test('showPage() — tetap aman kalau ScannerSession belum dimuat (typeof guard)', () => {
  const fakeDoc = makeFakeDocument({ pageExists: true });
  // ScannerSession sengaja TIDAK di-inject sama sekali (simulasi urutan
  // load script/GROUP_A vs GROUP_B) -- showPage() tidak boleh throw.
  const ctx = loadSource(
    ['modules/shared/modal-navigasi.js'],
    { document: fakeDoc, window: {}, renderPageContent: () => {} },
  );

  assert.doesNotThrow(() => ctx.showPage('mobil'));
});

test('showPage() — self-heal tetap terpanggil walau halaman tujuan tidak ditemukan', () => {
  let calls = 0;
  const scannerSessionStub = { isActive: () => { calls++; return false; } };
  const fakeDoc = makeFakeDocument({ pageExists: false });
  const ctx = loadModalNavigasi(fakeDoc, scannerSessionStub);

  ctx.showPage('halaman-typo');

  assert.equal(calls, 1, 'self-heal harus tetap jalan sebelum guard "halaman tidak ditemukan"');
});
