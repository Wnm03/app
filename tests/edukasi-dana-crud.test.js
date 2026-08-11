'use strict';
// tests/edukasi-dana-crud.test.js — cakupan modules/finance/edukasi-dana.js
// (EduFund), sebelumnya 0 test file yang menyentuhnya langsung.
// Fokus: tombol Tambah/Edit (openModal) & Hapus (del) rencana Dana Pendidikan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
function makeDoc(predefined = {}) { return { getElementById: (id) => predefined[id] || autoEl() }; }
function makeD(overrides = {}) { return Object.assign({ eduFunds: [], accounts: [{ id: 'a1', name: 'Cash', emoji: '💵' }] }, overrides); }

function makeCtx({ document, D, calls }) {
  return loadSource(
    ['modules/finance/edukasi-dana.js'],
    {
      document, D,
      uid: (() => { let n = 1; return () => 'edu' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + n,
      fmtFull: (n) => 'Rp' + n,
      parsePzNum: (s) => parseFloat(s) || 0,
      recalcAccBalance: () => 0,
      withSaveGuard: (key, modalId, fn) => fn(),
      save: () => calls.push('save'),
      openModal: (id) => calls.push('open:' + id),
      closeModal: (id) => calls.push('close:' + id),
      toast: (msg) => calls.push('toast:' + msg),
    },
    ['EduFund'],
  );
}

test('openModal() tanpa id (tombol Tambah) -> form kosong, judul "Tambah Dana Pendidikan"', () => {
  const calls = [];
  const els = { eduFundModalTitle: { textContent: '' }, eduName: { value: 'sisa' } };
  const { EduFund } = makeCtx({ document: makeDoc(els), D: makeD(), calls });
  EduFund.openModal();
  assert.equal(els.eduFundModalTitle.textContent, 'Tambah Dana Pendidikan');
  assert.equal(els.eduName.value, '');
  assert.equal(EduFund.editId, null);
  assert.ok(calls.includes('open:eduFundModal'));
});

test('openModal(id) (tombol Edit) -> form terisi data existing, judul "Edit Dana Pendidikan"', () => {
  const calls = [];
  const els = { eduFundModalTitle: { textContent: '' }, eduName: { value: '' } };
  const D = makeD({ eduFunds: [{ id: 'e1', name: 'Kuliah Andi', biayaHariIni: 50000000, tahunTarget: 2035, inflasi: 10, returnAsumsi: 7, accountId: null, terkumpul: 5000000 }] });
  const { EduFund } = makeCtx({ document: makeDoc(els), D, calls });
  EduFund.openModal('e1');
  assert.equal(els.eduFundModalTitle.textContent, 'Edit Dana Pendidikan');
  assert.equal(els.eduName.value, 'Kuliah Andi');
  assert.equal(EduFund.editId, 'e1');
});

test('save() — nama kosong -> toast peringatan, TIDAK tersimpan', () => {
  const calls = [];
  const els = { eduName: { value: '  ' }, eduBiayaHariIni: { value: '' }, eduTahunTarget: { value: '' }, eduInflasi: { value: '' }, eduReturn: { value: '' } };
  const D = makeD();
  const { EduFund } = makeCtx({ document: makeDoc(els), D, calls });
  EduFund.save();
  assert.equal(D.eduFunds.length, 0);
  assert.match(calls.join(','), /toast:.*Nama anak\/jenjang/);
});

test('save() tanpa editId (Tambah) -> rencana baru masuk D.eduFunds, modal ditutup', () => {
  const calls = [];
  const els = {
    eduName: { value: 'SD Andi' }, eduBiayaHariIni: { value: '20000000' },
    eduTahunTarget: { value: '2030' }, eduInflasi: { value: '10' }, eduReturn: { value: '7' },
    eduTerkumpul: { value: '1000000' },
  };
  const D = makeD();
  const { EduFund } = makeCtx({ document: makeDoc(els), D, calls });
  EduFund.save();
  assert.equal(D.eduFunds.length, 1);
  assert.equal(D.eduFunds[0].name, 'SD Andi');
  assert.equal(D.eduFunds[0].biayaHariIni, 20000000);
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('close:eduFundModal'));
});

test('save() dengan editId (Edit) -> rencana existing di-UPDATE, bukan bikin baru', () => {
  const calls = [];
  const els = {
    eduName: { value: 'Kuliah Andi (revisi)' }, eduBiayaHariIni: { value: '60000000' },
    eduTahunTarget: { value: '2036' }, eduInflasi: { value: '10' }, eduReturn: { value: '7' },
    eduTerkumpul: { value: '8000000' },
  };
  const D = makeD({ eduFunds: [{ id: 'e1', name: 'Kuliah Andi', biayaHariIni: 50000000, tahunTarget: 2035, inflasi: 10, returnAsumsi: 7, accountId: null, terkumpul: 5000000 }] });
  const { EduFund } = makeCtx({ document: makeDoc(els), D, calls });
  EduFund.editId = 'e1';
  EduFund.save();
  assert.equal(D.eduFunds.length, 1);
  assert.equal(D.eduFunds[0].name, 'Kuliah Andi (revisi)');
  assert.equal(D.eduFunds[0].biayaHariIni, 60000000);
});

test('del() (tombol Hapus) -> rencana terhapus dari D.eduFunds, toast konfirmasi', () => {
  const calls = [];
  const D = makeD({ eduFunds: [{ id: 'e1', name: 'Kuliah Andi', biayaHariIni: 50000000, tahunTarget: 2035, inflasi: 10, returnAsumsi: 7 }] });
  const { EduFund } = makeCtx({ document: makeDoc(), D, calls });
  EduFund.del('e1');
  assert.equal(D.eduFunds.length, 0);
  assert.ok(calls.includes('save'));
  assert.match(calls.join(','), /toast:.*dihapus/);
});
