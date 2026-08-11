'use strict';
// tests/openmodal-scannersession-selfheal.test.js — regresi utk bugfix
// "tab Kelola Kendaraan / Katalog Suku Cadang tidak respon, 0 toast"
// (laporan user).
//
// Root cause: self-heal ScannerSession (_scannerSessionSelfHeal(), via
// isActive()) sebelumnya CUMA dipanggil dari showPage() (pindah tab bawah)
// atau ScannerSession.enter() (coba buka scanner lagi). Kalau
// _scannerSessionActive nyangkut true (kamera scan terputus di tengah jalan
// -- izin ditolak/app di-minimize/tab di-suspend) TAPI user cuma tap tombol
// openVehicleModal()/VehicleCatalogUI.open() langsung (BUKAN pindah tab,
// BUKAN coba buka scanner), openModal() tetap sukses nambahin class 'open'
// secara JS -- tapi CSS body.scanner-session-active memaksa
// display:none!important ke SEMUA .overlay.open DAN #toast (lihat
// scanner-session.js), jadi user tidak lihat modal atau toast apa pun.
//
// Fix: openModal() sekarang juga memanggil ScannerSession.isActive() di
// awal (pola SAMA PERSIS showPage()), supaya self-heal jalan SEBELUM modal
// dibuka, bukan cuma saat pindah tab.
//
// Test ini memuat modal-navigasi.js ASLI lewat harness vm loadSource(),
// dengan fake ScannerSession yang mensimulasikan state nyangkut.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeClassList(set) {
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      const has = set.has(c);
      const shouldHave = force === undefined ? !has : !!force;
      if (shouldHave) set.add(c); else set.delete(c);
      return shouldHave;
    },
  };
}

function makeFakeEl(id, classes = []) {
  const classSet = new Set(classes);
  return {
    id,
    _classSet: classSet,
    classList: makeFakeClassList(classSet),
    setAttribute() {},
    querySelector() { return null; },
  };
}

function makeFakeDocument({ modal }) {
  const bodyClasses = new Set();
  return {
    body: { classList: makeFakeClassList(bodyClasses) },
    getElementById(id) {
      if (modal && modal.id === id) return modal;
      return null;
    },
    querySelectorAll(selector) {
      if (selector.indexOf('.overlay') !== -1) return modal ? [modal] : [];
      return [];
    },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadModalNavigasi(fakeDoc, fakeWindow, ScannerSession) {
  return loadSource(
    ['modules/shared/modal-navigasi.js'],
    {
      document: fakeDoc,
      window: fakeWindow,
      setTimeout,
      clearTimeout,
      escapeHtml: (s) => String(s == null ? '' : s),
      ScannerSession,
    },
  );
}

test('openModal() memanggil ScannerSession.isActive() supaya self-heal jalan sebelum modal dibuka', () => {
  const vehicleModal = makeFakeEl('vehicleModal', ['overlay']);
  const fakeDoc = makeFakeDocument({ modal: vehicleModal });
  const fakeWindow = {};
  let isActiveCalls = 0;
  const fakeScannerSession = { isActive() { isActiveCalls++; return false; } };
  const ctx = loadModalNavigasi(fakeDoc, fakeWindow, fakeScannerSession);

  ctx.openModal('vehicleModal');

  assert.equal(isActiveCalls, 1, 'openModal() harus memanggil ScannerSession.isActive() (self-heal), sama seperti showPage()');
  assert.equal(vehicleModal.classList.contains('open'), true, 'modal tetap terbuka seperti biasa setelah self-heal');
});

test('openModal() tidak error kalau ScannerSession belum dimuat (guard typeof)', () => {
  const catalogModal = makeFakeEl('catalogModal', ['overlay']);
  const fakeDoc = makeFakeDocument({ modal: catalogModal });
  const fakeWindow = {};
  // ScannerSession sengaja TIDAK dioper (typeof ScannerSession==='undefined' di dalam sandbox).
  const ctx = loadSource(
    ['modules/shared/modal-navigasi.js'],
    { document: fakeDoc, window: fakeWindow, setTimeout, clearTimeout, escapeHtml: (s) => String(s == null ? '' : s) },
  );

  assert.doesNotThrow(() => ctx.openModal('catalogModal'));
  assert.equal(catalogModal.classList.contains('open'), true);
});

test('openModal() — skenario nyangkut penuh: ScannerSession.isActive() mensimulasikan self-heal yang membersihkan body.scanner-session-active', () => {
  const vehicleModal = makeFakeEl('vehicleModal', ['overlay']);
  const fakeDoc = makeFakeDocument({ modal: vehicleModal });
  fakeDoc.body.classList.add('scanner-session-active'); // state nyangkut sebelum fix
  const fakeWindow = {};
  // Simulasikan ScannerSession.isActive() ASLI: self-heal karena overlay scanner sudah tidak ada.
  const fakeScannerSession = {
    isActive() {
      fakeDoc.body.classList.remove('scanner-session-active');
      return false;
    },
  };
  const ctx = loadModalNavigasi(fakeDoc, fakeWindow, fakeScannerSession);

  ctx.openModal('vehicleModal');

  assert.equal(fakeDoc.body.classList.contains('scanner-session-active'), false, 'state nyangkut harus ke-heal SEBELUM modal dibuka, bukan cuma saat pindah tab');
  assert.equal(vehicleModal.classList.contains('open'), true);
});
