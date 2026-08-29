'use strict';
// tests/asset-investment-owners-redirect-b2b.test.js — Sesi B2b (FIX-B2b-ASSET-
// INVESTMENT-OWNERS-REDIRECT): lanjutan B2a (readonly). Sesi ini:
//   1. Tombol "Atur Porsi" di assetModal utama (#assetOwnersBtn) ganti label jadi
//      "🔗 Atur Porsi di Investasi" kalau aset yang dibuka tertaut ke Holding
//      Investasi yang masih ada (a.investmentId valid), balik ke label lama
//      "⚖️ Atur Porsi Kepemilikan" kalau tidak -- dipanggil openModal() (Aset.editId
//      tersimpan) & onInvestmentLinkChange() (live saat dropdown diganti).
//   2. Aset.openOwnersModal() utk aset tertaut REDIRECT LANGSUNG ke
//      InvestmentUI.openOwnersModal(id) (S464) -- assetOwnersModal (termasuk versi
//      read-only B2a) TIDAK dibuka sama sekali kalau InvestmentUI tersedia.
//   3. Fallback aman (0 regresi): kalau InvestmentUI belum dimuat, tetap fallback ke
//      jalur B2a/lama (sudah ditest tests/asset-owners-investment-readonly-b2a.test.js,
//      TIDAK diulang di sini).
//
// Dijalankan lewat SOURCE ASLI (loadSource), DOM tiruan STATEFUL -- pola sama persis
// tests/asset-owners-investment-readonly-b2a.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      className: '',
      placeholder: '',
      disabled: false,
      style: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Reksa Dana Pasar Uang X (dobel-catat)', jenis: 'Deposito/Investasi', nilai: 10000000, investmentId: 'inv1' },
      { id: 'a2', name: 'Tanah Kavling Biasa', jenis: 'Tanah', nilai: 500000000 },
      { id: 'a3', name: 'Aset Tautan Orphan', jenis: 'Saham', nilai: 1000000, investmentId: 'inv_ghost' },
    ],
    investments: [
      { id: 'inv1', name: 'RDPU X', jenis: 'Reksadana', owners: [
        { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 60, isSelf: true },
        { ownerId: 'owner_investor1', ownerName: 'Budi', porsi: 40, isSelf: false },
      ] },
    ],
    accounts: [],
    transactions: [],
    debts: [],
  };
}

function makeInvestmentMock() {
  return {
    getOwners(h) {
      if (!h) return [];
      if (Array.isArray(h.owners)) return h.owners;
      return [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }];
    },
  };
}

function makeCtx(D, { withInvestmentUI = true } = {}) {
  const openModalCalls = [];
  const investmentUIOwnersCalls = [];
  const toastMessages = [];
  const dom = makeStatefulDom();
  const globals = {
    D,
    Investment: makeInvestmentMock(),
    document: dom,
    escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c])),
    openModal: (id) => { openModalCalls.push(id); },
    closeModal: () => {},
    uid: () => 'owner_x',
    sameId: (a, b) => String(a) === String(b),
    save: () => {},
    toast: (msg) => { toastMessages.push(msg); },
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    todayStr: () => '2026-08-11',
    parsePzNum: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    calcPreviewValue: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    OwnershipEngine: { TYPES: ['SELF'], label: () => 'Milik Sendiri', resolve: () => ({ type: 'SELF' }) },
  };
  if (withInvestmentUI) {
    globals.InvestmentUI = {
      openOwnersModal(id) { investmentUIOwnersCalls.push(id); },
    };
  }
  const ctx = loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js',
    ],
    globals,
    ['Aset', 'MultiOwnerEngine'],
  );
  ctx.Aset.renderList = () => {};
  ctx.dom = dom;
  ctx.openModalCalls = openModalCalls;
  ctx.investmentUIOwnersCalls = investmentUIOwnersCalls;
  ctx.toastMessages = toastMessages;
  return ctx;
}

// ============================================================
// LAPIS 1 — gap-check template HTML: id baru #assetOwnersBtn & onchange dropdown
// ============================================================

test('[gap-check] assetModal: tombol Atur Porsi punya id="assetOwnersBtn" baru', () => {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  assert.match(modalsSrc, /id=\\"assetOwnersBtn\\"[^>]*data-action=\\"Aset\.openOwnersModal\\"/,
    'tombol Atur Porsi di assetModal harus punya id="assetOwnersBtn" (dipakai toggle label B2b)');
});

test('[gap-check] assetModal: dropdown assetInvestmentId punya onchange ke Aset.onInvestmentLinkChange()', () => {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  assert.match(modalsSrc, /id=\\"assetInvestmentId\\"[^>]*onchange=\\"Aset\.onInvestmentLinkChange\(\)\\"/,
    'dropdown link investasi harus punya onchange supaya label tombol update live');
});

// ============================================================
// LAPIS 2 — label tombol #assetOwnersBtn (openModal & onInvestmentLinkChange)
// ============================================================

test('[label] openModal(id) aset tertaut investasi valid -> label tombol jadi "🔗 Atur Porsi di Investasi"', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.openModal('a1');
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '🔗 Atur Porsi di Investasi');
});

test('[label] openModal(id) aset TIDAK tertaut -> label tombol tetap "⚖️ Atur Porsi Kepemilikan"', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.openModal('a2');
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '⚖️ Atur Porsi Kepemilikan');
});

test('[label] openModal(id) investmentId orphan (holding dihapus) -> label tetap default lama (bukan link label)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.openModal('a3');
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '⚖️ Atur Porsi Kepemilikan');
});

test('[label] openModal(null) (Tambah Aset baru) -> label default lama', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.openModal(null);
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '⚖️ Atur Porsi Kepemilikan');
});

test('[label] onInvestmentLinkChange(): user ganti dropdown ke holding valid saat modal terbuka -> label ikut update LIVE', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.openModal('a2'); // mulai tanpa tautan
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '⚖️ Atur Porsi Kepemilikan');
  ctx.dom.getElementById('assetInvestmentId').value = 'inv1';
  ctx.Aset.onInvestmentLinkChange();
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '🔗 Atur Porsi di Investasi');
  // balik ke "— Tidak terhubung —" (value kosong) -> label balik ke default
  ctx.dom.getElementById('assetInvestmentId').value = '';
  ctx.Aset.onInvestmentLinkChange();
  assert.equal(ctx.dom.getElementById('assetOwnersBtn').textContent, '⚖️ Atur Porsi Kepemilikan');
});

// ============================================================
// LAPIS 3 — redirect Aset.openOwnersModal() -> InvestmentUI.openOwnersModal(id)
// ============================================================

test('[redirect] aset tertaut investasi valid + InvestmentUI dimuat -> openOwnersModal() redirect ke InvestmentUI.openOwnersModal(investmentId), TIDAK buka assetOwnersModal', () => {
  const D = makeD();
  const ctx = makeCtx(D, { withInvestmentUI: true });
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();

  assert.deepEqual(ctx.investmentUIOwnersCalls, ['inv1'], 'InvestmentUI.openOwnersModal harus dipanggil persis 1x dgn id holding tertaut');
  assert.ok(!ctx.openModalCalls.includes('assetOwnersModal'), 'assetOwnersModal TIDAK boleh dibuka sama sekali utk aset tertaut');
});

test('[redirect] aset TIDAK tertaut investasi -> openOwnersModal() tetap buka assetOwnersModal seperti biasa (0 regresi)', () => {
  const D = makeD();
  const ctx = makeCtx(D, { withInvestmentUI: true });
  ctx.Aset.editId = 'a2';
  ctx.Aset.openOwnersModal();

  assert.deepEqual(ctx.investmentUIOwnersCalls, [], 'InvestmentUI TIDAK boleh dipanggil utk aset yang tidak tertaut');
  assert.ok(ctx.openModalCalls.includes('assetOwnersModal'), 'assetOwnersModal harus tetap dibuka utk aset biasa');
});

test('[redirect] investmentId orphan (holding sudah dihapus) -> fallback ke assetOwnersModal (jalur lama/B2a), bukan redirect', () => {
  const D = makeD();
  const ctx = makeCtx(D, { withInvestmentUI: true });
  ctx.Aset.editId = 'a3';
  ctx.Aset.openOwnersModal();

  assert.deepEqual(ctx.investmentUIOwnersCalls, [], 'holding orphan -> tidak boleh redirect (holding-nya sudah tidak ada)');
  assert.ok(ctx.openModalCalls.includes('assetOwnersModal'), 'harus fallback ke assetOwnersModal (editable lama, sesuai perilaku B2a utk orphan)');
});

test('[redirect] aset tertaut investasi TAPI InvestmentUI belum dimuat -> fallback aman ke assetOwnersModal, tidak crash', () => {
  const D = makeD();
  const ctx = makeCtx(D, { withInvestmentUI: false });
  ctx.Aset.editId = 'a1';
  assert.doesNotThrow(() => ctx.Aset.openOwnersModal());

  assert.ok(ctx.openModalCalls.includes('assetOwnersModal'), 'fallback ke assetOwnersModal (read-only B2a) kalau InvestmentUI belum ada');
});

test('[redirect] openOwnersModalById(assetId) (S515 wrapper) ikut redirect utk aset tertaut -- 100% reuse openOwnersModal()', () => {
  const D = makeD();
  const ctx = makeCtx(D, { withInvestmentUI: true });
  ctx.Aset.openOwnersModalById('a1');

  assert.deepEqual(ctx.investmentUIOwnersCalls, ['inv1']);
  assert.ok(!ctx.openModalCalls.includes('assetOwnersModal'));
});
