'use strict';
// tests/emergency-fund-suggest-badge.test.js — Sesi A3 (LANGKAH-SESI-
// IMPLEMENTASI.md Kelompok A, sesi terakhir) — badge/tombol "Saran otomatis"
// di form Target Dana Darurat, hasil dari Sesi A1 (suggestEmergencyFundTarget()
// di modules/finance/tx-list-cashflow.js). Sesi ini TIDAK mengubah A1/A2 sama
// sekali (0 baris disentuh di tx-list-cashflow.js / financial-risk-dashboard-
// api.js) — murni tambahan 2 fungsi baru di tx-target.js
// (renderEmergencyFundSuggestBadge/applyEmergencyFundSuggestBadge) + wiring ke
// openTargetModal()/onTargetDanaDaruratToggle() yang sudah ada.
//
// Pola sama seperti tests/s692-target-modal-editbyid.test.js: fake DOM minimal
// (bukan jsdom) via loadSource, karena fungsi yang dites baca/tulis DOM.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => {
    els[id] = {
      value: '', checked: false, style: {}, textContent: '', innerHTML: '',
      dataset: {},
      removeAttribute(name) { delete this.dataset[name === 'data-suggested' ? 'suggested' : name]; },
      querySelector(sel) {
        if (sel === '.badge-text') {
          if (!this._badgeTextEl) this._badgeTextEl = { textContent: '' };
          return this._badgeTextEl;
        }
        return null;
      },
    };
  });
  return {
    doc: { getElementById: (id) => els[id] || null },
    els,
  };
}

const TARGET_MODAL_IDS = [
  'tName', 'tAmt', 'tSaved', 'tEmoji', 'tDanaDarurat', 'tDanaDaruratHint',
  'tAcc', 'tSavedWrap', 'targetModalTitle', 'tEmergencySuggestBadge',
];

function makeCtx({ document, D, toast, suggestEmergencyFundTarget, FI } = {}) {
  return loadSource(
    ['modules/finance/tx-target.js'],
    {
      document,
      D: D || { targets: [], accounts: [] },
      uid: () => 'newid-' + Math.random().toString(36).slice(2, 8),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      populateAccFilters: () => {},
      toast: toast || (() => {}),
      renderSettings: () => {},
      AlokasiAset: undefined,
      escapeHtml: (s) => String(s),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      recalcAccBalance: () => 0,
      FI,
      suggestEmergencyFundTarget,
    },
    [
      'openTargetModal', 'saveTarget', 'onTargetAccChange', 'onTargetDanaDaruratToggle',
      'renderEmergencyFundSuggestBadge', 'applyEmergencyFundSuggestBadge',
    ],
  );
}

test('renderEmergencyFundSuggestBadge() — tersembunyi kalau checkbox Dana Darurat belum dicentang', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const ctx = makeCtx({
    document: doc,
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 12000000, multiplier: 6, basedOnMonths: 3, monthlyExpenseAvg: 2000000 }),
  });
  ctx.renderEmergencyFundSuggestBadge();
  assert.equal(els.tEmergencySuggestBadge.style.display, 'none');
});

test('renderEmergencyFundSuggestBadge() — tersembunyi kalau suggestEmergencyFundTarget belum dimuat (guard typeof)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tDanaDarurat.checked = true;
  const ctx = makeCtx({ document: doc, suggestEmergencyFundTarget: undefined });
  ctx.renderEmergencyFundSuggestBadge();
  assert.equal(els.tEmergencySuggestBadge.style.display, 'none');
});

test('renderEmergencyFundSuggestBadge() — tersembunyi kalau suggestEmergencyFundTarget() {ok:false}', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tDanaDarurat.checked = true;
  const ctx = makeCtx({
    document: doc,
    suggestEmergencyFundTarget: () => ({ ok: false, reason: 'data pengeluaran historis belum cukup' }),
  });
  ctx.renderEmergencyFundSuggestBadge();
  assert.equal(els.tEmergencySuggestBadge.style.display, 'none');
});

test('renderEmergencyFundSuggestBadge() — tersembunyi kalau suggestEmergencyFundTarget() throw (guard try/catch)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tDanaDarurat.checked = true;
  const ctx = makeCtx({
    document: doc,
    suggestEmergencyFundTarget: () => { throw new Error('boom'); },
  });
  assert.doesNotThrow(() => ctx.renderEmergencyFundSuggestBadge());
  assert.equal(els.tEmergencySuggestBadge.style.display, 'none');
});

test('renderEmergencyFundSuggestBadge() — tampil & isi teks kalau checked + {ok:true} (reuse A1 apa adanya)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tDanaDarurat.checked = true;
  const ctx = makeCtx({
    document: doc,
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 12000000, multiplier: 6, basedOnMonths: 3, monthlyExpenseAvg: 2000000 }),
  });
  ctx.renderEmergencyFundSuggestBadge();
  assert.equal(els.tEmergencySuggestBadge.style.display, 'flex');
  assert.equal(els.tEmergencySuggestBadge.dataset.suggested, 12000000);
  const badgeText = els.tEmergencySuggestBadge.querySelector('.badge-text').textContent;
  assert.match(badgeText, /12\.000\.000|12000000/);
  assert.match(badgeText, /6/);
});

test('applyEmergencyFundSuggestBadge() — mengisi field tAmt dari data-suggested & toast sukses', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  let toastMsg = null;
  els.tEmergencySuggestBadge.dataset.suggested = '12000000';
  const ctx = makeCtx({ document: doc, toast: (m) => { toastMsg = m; } });
  ctx.applyEmergencyFundSuggestBadge();
  assert.equal(els.tAmt.value, 12000000);
  assert.match(toastMsg, /saran otomatis/i);
});

test('applyEmergencyFundSuggestBadge() — tidak ngapa-ngapain kalau belum ada data-suggested (badge belum pernah dirender ok:true)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  els.tAmt.value = '';
  const ctx = makeCtx({ document: doc });
  ctx.applyEmergencyFundSuggestBadge();
  assert.equal(els.tAmt.value, '');
});

test('openTargetModal() — badge auto-hidden untuk mode tambah (checkbox default unchecked, regresi perilaku lama tidak berubah)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const ctx = makeCtx({
    document: doc,
    D: { targets: [], accounts: [] },
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 12000000, multiplier: 6, basedOnMonths: 3 }),
  });
  ctx.openTargetModal();
  assert.equal(els.tDanaDarurat.checked, false);
  assert.equal(els.tEmergencySuggestBadge.style.display, 'none');
});

test('onTargetDanaDaruratToggle() — badge muncul begitu checkbox dicentang & hilang lagi begitu di-uncheck', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const ctx = makeCtx({
    document: doc,
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 18000000, multiplier: 6, basedOnMonths: 6 }),
  });
  els.tDanaDarurat.checked = true;
  ctx.onTargetDanaDaruratToggle();
  assert.equal(els.tEmergencySuggestBadge.style.display, 'flex');
  assert.equal(els.tEmergencySuggestBadge.dataset.suggested, 18000000);

  els.tDanaDarurat.checked = false;
  ctx.onTargetDanaDaruratToggle();
  assert.equal(els.tEmergencySuggestBadge.style.display, 'none');
});

test('onTargetDanaDaruratToggle() — hint lama (FI.annualExpense()-based) TIDAK berubah oleh badge baru (0 regresi)', () => {
  const { doc, els } = makeFakeDoc(TARGET_MODAL_IDS);
  const ctx = makeCtx({
    document: doc,
    FI: { annualExpense: () => 24000000 }, // 2jt/bln
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 99999999, multiplier: 6, basedOnMonths: 6 }),
  });
  els.tDanaDarurat.checked = true;
  ctx.onTargetDanaDaruratToggle();
  // hint lama tetap pakai FI.annualExpense()/12*6 = 12.000.000, BUKAN angka dari
  // suggestEmergencyFundTarget() (99999999) -- membuktikan 0 logic lama disentuh.
  assert.match(els.tDanaDaruratHint.innerHTML, /12\.000\.000|12000000/);
  assert.equal(els.tAmt.value, 12000000);
  // badge baru tetap independen, pakai angka dari suggestEmergencyFundTarget()
  assert.equal(els.tEmergencySuggestBadge.dataset.suggested, 99999999);
});
