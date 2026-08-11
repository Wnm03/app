'use strict';
// tests/dialog-scannersession-selfheal.test.js — regresi utk gap lanjutan
// audit v1026: askConfirm()/showPromptModal()/showChoiceModal()/
// showAlertModal()/showPinPromptModal()/openQS() TIDAK lewat openModal(),
// jadi TIDAK ikut ke-cover self-heal ScannerSession yang dipasang v1026
// (lihat tests/openmodal-scannersession-selfheal.test.js).
//
// Root cause: overlay-nya di-classList.add('open') LANGSUNG lewat
// _queueDialog() (utk 5 dialog custom) / langsung di openQS(). Kalau
// body.scanner-session-active nyangkut (skenario sama spt fix v1026: kamera
// scan terputus di tengah jalan), dialog2 ini kena gejala identik dgn bug
// v1026: classList 'open' sukses ditambahkan scr JS, tapi CSS
// _scannerSessionEnsureStyle() (body.scanner-session-active .overlay.open{
// display:none!important}) bikin overlay tetap invisible + #toast ikut mati
// -- "macet total" tanpa jejak. Krusial krn askConfirm() dipakai di ~20
// file utk konfirmasi aksi DESTRUKTIF (hapus transaksi/akun/dll).
//
// Fix: _queueDialog() & openQS() sekarang memanggil _dialogSelfHeal() (jadi
// ScannerSession.isActive()) SEBELUM overlay dibuka -- pola sama persis
// openModal()/showPage(). Test ini memuat modal-navigasi.js ASLI lewat
// harness vm loadSource(), dengan fake ScannerSession yang mensimulasikan
// state nyangkut.

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

function makeFakeEl(id) {
  const classSet = new Set();
  return {
    id,
    _classSet: classSet,
    classList: makeFakeClassList(classSet),
    textContent: '',
    className: '',
    value: '',
    style: {},
    setAttribute() {},
    focus() {},
    select() {},
  };
}

// Semua id elemen yang dibaca/ditulis oleh askConfirm/showPromptModal/
// showChoiceModal/showAlertModal/showPinPromptModal/openQS di
// modal-navigasi.js (lihat isi fungsi masing-masing).
const ELEMENT_IDS = [
  'confirmModalOverlay', 'confirmModalIcon', 'confirmModalTitle', 'confirmModalMsg',
  'confirmModalOk', 'confirmModalCancel',
  'promptModalOverlay', 'promptModalIcon', 'promptModalTitle', 'promptModalMsg',
  'promptModalInput', 'promptModalError', 'promptModalOkBtn', 'promptModalCancelBtn',
  'choiceModalOverlay', 'choiceModalTitle', 'choiceModalMsg', 'choiceModalList',
  'infoModalOverlay', 'infoModalIcon', 'infoModalTitle', 'infoModalMsg', 'infoModalOk',
  'pinPromptModalOverlay', 'pinPromptModalTitle', 'pinPromptModalMsg', 'pinPromptInput', 'pinPromptError',
  'qsCarnotes',
];

function makeFakeDocument() {
  const bodyClasses = new Set();
  const els = new Map(ELEMENT_IDS.map((id) => [id, makeFakeEl(id)]));
  return {
    body: { classList: makeFakeClassList(bodyClasses) },
    getElementById(id) { return els.get(id) || null; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadModalNavigasi(fakeDoc, ScannerSession) {
  return loadSource(
    ['modules/shared/modal-navigasi.js'],
    {
      document: fakeDoc,
      window: {},
      setTimeout,
      clearTimeout,
      escapeHtml: (s) => String(s == null ? '' : s),
      ScannerSession,
    },
  );
}

test('askConfirm() memanggil ScannerSession.isActive() sebelum confirmModalOverlay dibuka', () => {
  const fakeDoc = makeFakeDocument();
  let isActiveCalls = 0;
  const fakeScannerSession = { isActive() { isActiveCalls++; return false; } };
  const ctx = loadModalNavigasi(fakeDoc, fakeScannerSession);

  ctx.askConfirm('Yakin mau hapus?');

  assert.equal(isActiveCalls, 1, 'askConfirm() harus memicu self-heal ScannerSession, sama seperti openModal()');
  assert.equal(fakeDoc.getElementById('confirmModalOverlay').classList.contains('open'), true);
});

test('askConfirm() — skenario nyangkut penuh: self-heal membersihkan body.scanner-session-active sebelum dialog konfirmasi (mis. hapus transaksi) dibuka', () => {
  const fakeDoc = makeFakeDocument();
  fakeDoc.body.classList.add('scanner-session-active'); // state nyangkut sebelum fix
  const fakeScannerSession = {
    isActive() {
      fakeDoc.body.classList.remove('scanner-session-active');
      return false;
    },
  };
  const ctx = loadModalNavigasi(fakeDoc, fakeScannerSession);

  ctx.askConfirm('Hapus transaksi ini?');

  assert.equal(fakeDoc.body.classList.contains('scanner-session-active'), false, 'state nyangkut harus ke-heal SEBELUM dialog konfirmasi dibuka');
  assert.equal(fakeDoc.getElementById('confirmModalOverlay').classList.contains('open'), true);
});

test('showPromptModal()/showChoiceModal()/showAlertModal()/showPinPromptModal() semuanya memicu self-heal (lewat _queueDialog bersama)', () => {
  const fakeDoc = makeFakeDocument();
  let isActiveCalls = 0;
  const fakeScannerSession = { isActive() { isActiveCalls++; return false; } };
  const ctx = loadModalNavigasi(fakeDoc, fakeScannerSession);

  ctx.showPromptModal({ message: 'Isi nama' });
  ctx.showChoiceModal({ choices: [{ label: 'A' }, { label: 'B' }] });
  ctx.showAlertModal('Perhatian');
  ctx.showPinPromptModal({});

  assert.equal(isActiveCalls, 4, 'keempat dialog harus masing-masing memicu 1x self-heal saat langsung dirender (queue kosong)');
  assert.equal(fakeDoc.getElementById('promptModalOverlay').classList.contains('open'), true);
  assert.equal(fakeDoc.getElementById('choiceModalOverlay').classList.contains('open'), true);
  assert.equal(fakeDoc.getElementById('infoModalOverlay').classList.contains('open'), true);
  assert.equal(fakeDoc.getElementById('pinPromptModalOverlay').classList.contains('open'), true);
});

test('openQS() memanggil ScannerSession.isActive() sebelum overlay Quick Switcher dibuka', () => {
  const fakeDoc = makeFakeDocument();
  let isActiveCalls = 0;
  const fakeScannerSession = { isActive() { isActiveCalls++; return false; } };
  const ctx = loadModalNavigasi(fakeDoc, fakeScannerSession);

  ctx.openQS('qsCarnotes');

  assert.equal(isActiveCalls, 1, 'openQS() harus memicu self-heal ScannerSession');
  assert.equal(fakeDoc.getElementById('qsCarnotes').classList.contains('open'), true);
});

test('dialog tidak error kalau ScannerSession belum dimuat (guard typeof) -- askConfirm() & openQS()', () => {
  const fakeDoc = makeFakeDocument();
  const ctx = loadSource(
    ['modules/shared/modal-navigasi.js'],
    { document: fakeDoc, window: {}, setTimeout, clearTimeout, escapeHtml: (s) => String(s == null ? '' : s) },
    // ScannerSession sengaja TIDAK dioper (typeof ScannerSession==='undefined' di sandbox).
  );

  assert.doesNotThrow(() => ctx.askConfirm('Test'));
  assert.doesNotThrow(() => ctx.openQS('qsCarnotes'));
  assert.equal(fakeDoc.getElementById('confirmModalOverlay').classList.contains('open'), true);
});
