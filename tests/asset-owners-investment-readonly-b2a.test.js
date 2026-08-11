'use strict';
// tests/asset-owners-investment-readonly-b2a.test.js — Sesi B2a (FIX-B2a-ASSET-OWNERS-
// INVESTMENT-READONLY): assetOwnersModal jadi READ-ONLY kalau aset yang dibuka
// terhubung ke Holding Investasi (a.investmentId, field baru Sesi B1) -- porsi
// ditampilkan dari Investment.getOwners() (h.owners), BUKAN a.owners, dan tombol
// edit (Tambah Pemilik/Simpan Porsi/Reset Draft) disembunyikan.
//
// Scope sesi ini SENGAJA dibatasi (lihat FIX-B2a-*.md): baru bagian "baca porsi dari
// D.investments[].owners + sembunyikan tombol edit". Tombol "⚖️ Atur Porsi
// Kepemilikan" di assetModal utama & navigasi ke investmentOwnersModal ditunda ke
// Sesi B2b -- TIDAK ditest di sini.
//
// Dijalankan lewat SOURCE ASLI (loadSource, pola sama
// asset-owners-flow-e2e-392a-to-392e.test.js) dengan DOM tiruan STATEFUL supaya alur
// "buka modal -> baca hasil render" beneran nyambung seperti browser asli.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// --- DOM tiruan STATEFUL (100% sama pola asset-owners-flow-e2e-392a-to-392e.test.js) ---
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

function makeInvestmentMock(D) {
  return {
    getOwners(h) {
      if (!h) return [];
      if (Array.isArray(h.owners)) return h.owners;
      return [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }];
    },
  };
}

function makeCtx(D) {
  const openModalCalls = [];
  const toastMessages = [];
  const dom = makeStatefulDom();
  const ctx = loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/asset/aset.js',
    ],
    {
      D,
      Investment: makeInvestmentMock(D),
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
    },
    ['Aset', 'MultiOwnerEngine'],
  );
  ctx.Aset.renderList = () => {};
  ctx.dom = dom;
  ctx.openModalCalls = openModalCalls;
  ctx.toastMessages = toastMessages;
  return ctx;
}

// ============================================================
// LAPIS 1 — cross-check template HTML ASLI (id baru B2a memang ada & tidak merusak
// struktur assetOwnersModal existing, pola sama gap-check 392a-e).
// ============================================================

function extractAssetOwnersModalHtml() {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  const vm = require('vm');
  const sandbox = {};
  const context = vm.createContext(sandbox);
  new vm.Script(modalsSrc + '\nthis.MODAL_HTML = MODAL_HTML;', { filename: 'modals.js' }).runInContext(context);
  const all = context.MODAL_HTML.join('\n');
  const match = /<div class="overlay" id="assetOwnersModal"[\s\S]*?\n\s*<\/div>\n<\/div>/.exec(all);
  assert.ok(match, 'assetOwnersModal harus ditemukan utuh di MODAL_HTML');
  return match[0];
}

test('[gap-check] assetOwnersModal: id baru B2a (assetOwnersReadOnlyHint, assetOwnersEditControls) ada di template & membungkus tombol edit lama', () => {
  const html = extractAssetOwnersModalHtml();
  assert.match(html, /id="assetOwnersReadOnlyHint"/, 'hint read-only harus ada di template');
  assert.match(html, /id="assetOwnersEditControls"/, 'wrapper tombol edit harus ada di template');
  const editBoxIdx = html.indexOf('id="assetOwnersEditControls"');
  const addBtnIdx = html.indexOf('data-action="Aset.addOwnerRow"');
  const saveBtnIdx = html.indexOf('id="assetOwnersSaveBtn"');
  const resetBtnIdx = html.indexOf('data-action="Aset.resetOwners"');
  assert.ok(editBoxIdx !== -1 && editBoxIdx < addBtnIdx, 'wrapper harus mendahului tombol Tambah Pemilik');
  assert.ok(addBtnIdx < saveBtnIdx && saveBtnIdx < resetBtnIdx, 'urutan tombol lama (Tambah/Simpan/Reset) tidak berubah');
  // Tutup modal & tombol close TETAP di luar wrapper (harus selalu bisa ditutup walau
  // read-only) -- cek tombol "Tutup" muncul SETELAH wrapper edit-controls ditutup.
  const closeBtnIdx = html.lastIndexOf('data-args=\'["assetOwnersModal"]\'>Tutup');
  assert.ok(closeBtnIdx > resetBtnIdx, 'tombol Tutup harus tetap ada & berada setelah blok tombol edit');
});

test('[gap-check] tag div/button seimbang di assetOwnersModal setelah patch B2a', () => {
  const html = extractAssetOwnersModalHtml();
  for (const tag of ['div', 'button', 'span']) {
    const openCount = (html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
    const closeCount = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(openCount, closeCount, `<${tag}> tidak seimbang (${openCount} buka vs ${closeCount} tutup) -- indikasi HTML rusak`);
  }
});

// ============================================================
// LAPIS 2 — perilaku read-only lewat source asli
// ============================================================

test('[readonly] aset terhubung investasi: openOwnersModal baca porsi dari Investment.getOwners(), BUKAN dari a.owners', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();

  assert.equal(ctx.Aset._ownersReadOnly, true, 'flag read-only harus true utk aset terhubung investasi');
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.Aset._ownersDraft)).map((o) => ({ ownerName: o.ownerName, porsi: o.porsi, isSelf: o.isSelf })),
    [
      { ownerName: 'Milik Sendiri', porsi: 60, isSelf: true },
      { ownerName: 'Budi', porsi: 40, isSelf: false },
    ],
    'draft harus persis porsi dari h.owners holding investasi tertaut, bukan default/kosong'
  );
  assert.ok(ctx.openModalCalls.includes('assetOwnersModal'), 'modal tetap dibuka seperti biasa');
});

test('[readonly] list #assetOwnersList dirender statis (nama+porsi%), tanpa input/tombol hapus', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();

  const listHtml = ctx.dom.getElementById('assetOwnersList').innerHTML;
  assert.match(listHtml, />Budi</, 'nama pemilik dari holding investasi harus tampil');
  assert.match(listHtml, /40%/, 'porsi dari holding investasi harus tampil');
  assert.match(listHtml, /60%/);
  assert.doesNotMatch(listHtml, /<input/, 'TIDAK boleh ada input edit di baris read-only');
  assert.doesNotMatch(listHtml, /removeOwnerRow/, 'TIDAK boleh ada tombol hapus baris di mode read-only');
});

test('[readonly] blok tombol edit (#assetOwnersEditControls) disembunyikan, hint read-only ditampilkan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();

  const editBox = ctx.dom.getElementById('assetOwnersEditControls');
  const hint = ctx.dom.getElementById('assetOwnersReadOnlyHint');
  assert.equal(editBox.classList.contains('u-dnone'), true, 'wrapper tombol edit harus disembunyikan (u-dnone)');
  assert.equal(hint.classList.contains('u-dnone'), false, 'hint read-only harus ditampilkan');
  assert.match(hint.textContent, /Holding Investasi/, 'hint harus menjelaskan alasan read-only');
});

test('[readonly] addOwnerRow/removeOwnerRow/saveOwners/resetOwners tidak pernah menulis a.owners saat read-only (pertahanan berlapis)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  const before = JSON.parse(JSON.stringify(D.assets.find((x) => x.id === 'a1')));

  ctx.Aset.addOwnerRow();
  ctx.Aset.removeOwnerRow(0);
  ctx.Aset.saveOwners();
  ctx.Aset.resetOwners();

  const after = D.assets.find((x) => x.id === 'a1');
  assert.deepEqual(JSON.parse(JSON.stringify(after)), before, 'a.owners/aset TIDAK boleh berubah sama sekali lewat jalur read-only');
  assert.ok(ctx.toastMessages.some((m) => /Holding Investasi/.test(m)), 'harus ada toast penjelasan saat mencoba edit di mode read-only');
});

// ============================================================
// LAPIS 3 — regresi: aset TANPA investmentId tetap 100% jalur lama (editable)
// ============================================================

test('[regression] aset TANPA investmentId: modal tetap editable seperti sebelum Sesi B2a', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.editId = 'a2'; // Tanah Kavling Biasa, tidak ada investmentId
  ctx.Aset.openOwnersModal();

  assert.equal(ctx.Aset._ownersReadOnly, false, 'aset tanpa investmentId TIDAK boleh masuk mode read-only');
  const editBox = ctx.dom.getElementById('assetOwnersEditControls');
  assert.equal(editBox.classList.contains('u-dnone'), false, 'tombol edit harus tetap tampil utk aset biasa');

  const lenBefore = ctx.Aset._ownersDraft.length;
  ctx.Aset.addOwnerRow();
  assert.equal(ctx.Aset._ownersDraft.length, lenBefore + 1, 'addOwnerRow tetap berfungsi normal (0 regresi jalur lama)');
});

test('[regression] investmentId orphan (holding sudah dihapus) -> fallback ke jalur editable lama, tidak macet', () => {
  const D = makeD();
  D.assets.push({ id: 'a3', name: 'Aset Tautan Rusak', jenis: 'Saham', nilai: 1000000, investmentId: 'inv_sudah_dihapus' });
  const ctx = makeCtx(D);
  ctx.Aset.editId = 'a3';
  ctx.Aset.openOwnersModal();

  assert.equal(ctx.Aset._ownersReadOnly, false, 'tautan orphan harus fallback ke jalur editable, bukan macet/kosong permanen');
  const editBox = ctx.dom.getElementById('assetOwnersEditControls');
  assert.equal(editBox.classList.contains('u-dnone'), false);
});

test('[regression] Investment module belum dimuat -> fallback ke jalur editable lama (tidak crash)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Investment = undefined; // simulasikan module investasi.js belum dimuat
  ctx.Aset.editId = 'a1';
  assert.doesNotThrow(() => ctx.Aset.openOwnersModal());
  assert.equal(ctx.Aset._ownersReadOnly, false, 'tanpa Investment module, harus fallback aman ke jalur lama');
});
