'use strict';
// tests/s692-target-modal-editbyid.test.js — cakupan modules/finance/tx-target.js
// (Sesi S692, lanjutan AUDIT-RENCANA-kartu-klik-ke-sumber: linimasa target-*
// rows di TimelineW.goals() [modules/asset/aset-misc.js] masih tertunda
// diklik sampai openTargetModal() punya mode edit-by-id -- sesi ini BARU
// membangun fondasi itu, belum mengubah TimelineW/render() linimasa itu
// sendiri, sesuai catatan "Belum dikerjakan" di SESSION-NOTE-S691).
//
// openTargetModal()/saveTarget() baca/tulis DOM (getElementById dst), jadi
// dites lewat fake DOM minimal (bukan jsdom) via loadSource, pola sama
// dengan tests/fuel-card.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => {
    els[id] = { value: '', checked: false, style: {}, textContent: '', innerHTML: '' };
  });
  return {
    doc: { getElementById: (id) => els[id] || null },
    els,
  };
}

const TARGET_MODAL_IDS = [
  'tName', 'tAmt', 'tSaved', 'tEmoji', 'tDanaDarurat', 'tDanaDaruratHint',
  'tAcc', 'tSavedWrap', 'targetModalTitle',
];

function makeCtx({ document, D, toast, closeModal, openModal, save, renderSettings,
  populateAccFilters, AlokasiAset } = {}) {
  return loadSource(
    ['modules/finance/tx-target.js'],
    {
      document,
      D: D || { targets: [], accounts: [] },
      uid: () => 'newid-' + Math.random().toString(36).slice(2, 8),
      sameId: (a, b) => String(a) === String(b),
      save: save || (() => {}),
      closeModal: closeModal || (() => {}),
      openModal: openModal || (() => {}),
      populateAccFilters: populateAccFilters || (() => {}),
      toast: toast || (() => {}),
      renderSettings: renderSettings || (() => {}),
      AlokasiAset,
      escapeHtml: (s) => String(s),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      recalcAccBalance: () => 0,
      FI: undefined,
    },
    ['openTargetModal', 'saveTarget', 'onTargetAccChange', 'onTargetDanaDaruratToggle'],
  );
}

test('openTargetModal() tanpa id — mode tambah, field kosong, judul "Tambah Target" (regresi perilaku lama)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tName.value = 'Sisa dari sesi sebelumnya';
  const ctx = makeCtx({ document: doc, D: { targets: [], accounts: [] } });
  ctx.openTargetModal();
  assert.equal(els.tName.value, '');
  assert.equal(els.tEmoji.value, '🎯');
  assert.equal(els.tDanaDarurat.checked, false);
  assert.equal(els.tSavedWrap.style.display, 'block');
  assert.equal(els.targetModalTitle.textContent, 'Tambah Target');
  assert.equal(ctx._editingTargetId, null);
});

test('openTargetModal(id) — mode edit, field terisi dari D.targets & judul "Edit Target"', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const D = {
    targets: [
      { id: 't1', name: 'Dana Pendidikan', amount: 10000000, saved: 2500000, emoji: '🎓', isDanaDarurat: false },
    ],
    accounts: [],
  };
  const ctx = makeCtx({ document: doc, D });
  ctx.openTargetModal('t1');
  assert.equal(els.tName.value, 'Dana Pendidikan');
  assert.equal(els.tAmt.value, 10000000);
  assert.equal(els.tEmoji.value, '🎓');
  assert.equal(els.tSaved.value, 2500000);
  assert.equal(els.tSavedWrap.style.display, 'block');
  assert.equal(els.targetModalTitle.textContent, 'Edit Target');
  assert.equal(ctx._editingTargetId, 't1');
});

test('openTargetModal(id) — target terkait akun: tSavedWrap disembunyikan & tAcc terisi (SOT: saved ikut saldo akun)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const D = {
    targets: [
      { id: 't2', name: 'Tabungan Rumah', amount: 500000000, saved: 0, accountId: 'acc9', emoji: '🏠', isDanaDarurat: false },
    ],
    accounts: [{ id: 'acc9', name: 'BRI' }],
  };
  const ctx = makeCtx({ document: doc, D });
  ctx.openTargetModal('t2');
  assert.equal(els.tAcc.value, 'acc9');
  assert.equal(els.tSavedWrap.style.display, 'none');
});

test('openTargetModal(id) — id tidak ditemukan: fallback aman ke mode tambah (bukan crash, bukan mode edit nyasar)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const D = { targets: [{ id: 't1', name: 'A', amount: 1, saved: 0 }], accounts: [] };
  const ctx = makeCtx({ document: doc, D });
  ctx.openTargetModal('id-tidak-ada');
  assert.equal(ctx._editingTargetId, null);
  assert.equal(els.tName.value, '');
  assert.equal(els.targetModalTitle.textContent, 'Tambah Target');
});

test('saveTarget() mode tambah (regresi) — tetap push entry baru saat _editingTargetId kosong', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tName.value = 'Target Baru';
  els.tAmt.value = '1000000';
  const D = { targets: [], accounts: [] };
  let toasted = null;
  const ctx = makeCtx({ document: doc, D, toast: (m) => { toasted = m; } });
  ctx.saveTarget();
  assert.equal(D.targets.length, 1);
  assert.equal(D.targets[0].name, 'Target Baru');
  assert.equal(D.targets[0].amount, 1000000);
  assert.match(toasted, /tersimpan/);
});

test('saveTarget() mode edit — update entry existing (id & properti lain tetap terjaga), bukan push baru', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const D = {
    targets: [
      { id: 't1', name: 'Lama', amount: 1000000, saved: 200000, emoji: '🎯', isDanaDarurat: false, customFlag: 'jangan-hilang' },
    ],
    accounts: [],
  };
  const ctx = makeCtx({ document: doc, D });
  ctx.openTargetModal('t1');
  els.tName.value = 'Sudah Diedit';
  els.tAmt.value = '5000000';
  let toasted = null;
  const ctxToast = makeCtx; // no-op, keep lint happy
  ctx.toast = (m) => { toasted = m; };
  ctx.saveTarget();
  assert.equal(D.targets.length, 1, 'tidak boleh nambah entry baru di mode edit');
  assert.equal(D.targets[0].id, 't1', 'id target asli harus tetap sama');
  assert.equal(D.targets[0].name, 'Sudah Diedit');
  assert.equal(D.targets[0].amount, 5000000);
  assert.equal(D.targets[0].customFlag, 'jangan-hilang', 'properti lain yg tidak diubah form harus tetap terjaga (spread)');
  assert.equal(ctx._editingTargetId, null, '_editingTargetId harus direset setelah simpan');
});

test('saveTarget() mode edit lalu openTargetModal() tanpa id lagi — tidak nyangkut di mode edit sebelumnya', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const D = {
    targets: [{ id: 't1', name: 'A', amount: 1000000, saved: 0 }],
    accounts: [],
  };
  const ctx = makeCtx({ document: doc, D });
  ctx.openTargetModal('t1');
  assert.equal(ctx._editingTargetId, 't1');
  // Batal/tutup tanpa simpan, lalu buka lagi via tombol "+ Tambah Target" (tanpa id)
  ctx.openTargetModal();
  assert.equal(ctx._editingTargetId, null);
  els.tName.value = 'Target Lain';
  els.tAmt.value = '2000000';
  ctx.saveTarget();
  assert.equal(D.targets.length, 2, 'harus jadi entry baru, bukan menimpa t1');
  assert.equal(D.targets[0].name, 'A', 'target lama (t1) tidak boleh ikut berubah');
});
