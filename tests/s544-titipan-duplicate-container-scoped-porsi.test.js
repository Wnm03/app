'use strict';
// tests/s544-titipan-duplicate-container-scoped-porsi.test.js — Sesi 544
// (audit laporan user: toast "⚠️ Pilih aset dulu" MASIH muncul saat klik
// "⚖️ Atur Porsi Aset" walau dropdown kelihatan sudah terisi — reproduksi
// TETAP terjadi setelah fix S543 preserve-selection).
//
// ROOT CAUSE (beda lapis dari S543): `renderLaporan()` (modules-render.js)
// merender `DanaTitipanPortfolioPresenter` ke DUA container SEKALIGUS tiap
// panggilan — `#danaTitipanPortfolioList` (kartu lama) DAN
// `#danaTitipanTabList` (sub-tab Laporan > Dana Titipan, Sesi 498) — KEDUANYA
// permanen ada di index.html (tidak dilepas per tab aktif). Karena isi kedua
// container SAMA PERSIS (`DanaTitipanPortfolioAPI.build()` sama), markup
// `<select id="titipanAssetPick_N">`/`<div id="titipanHoldingsList_N">` jadi
// DUPLIKAT ID di 2 tempat. `document.getElementById()` SELALU balikin
// elemen PERTAMA di seluruh dokumen — kalau user berinteraksi dgn container
// KEDUA (yg dirender belakangan), lookup id lama diam2 balikin elemen
// container PERTAMA (kosong) → toast "Pilih aset dulu" walau user MERASA
// sudah pilih.
//
// FIX: `onAssetPickChange()`/`openAssetPorsi()` sekarang bisa terima
// ELEMEN pemicu (`this` dari <select onchange>, `$el` dari
// data-action dispatcher) lalu telusur DOM RELATIF (`closest('details')`
// → `querySelector`) — jadi SELALU dapat elemen di container yang SAMA
// dgn yang diklik user, kebal terhadap duplikat id di container lain.
// Mode lama (angka index → getElementById) TETAP didukung (0 breaking
// change utk caller/test lama, lihat tests/s515-*).
//
// Test di bawah pakai fake DOM MINIMAL (bukan innerHTML-string-parsing
// seperti s543) supaya bisa mensimulasikan 2 SUBTREE TERPISAH dgn id
// duplikat + closest()/querySelector() beneran — cukup utk membuktikan
// fix ini, TIDAK menguji ulang capture/restore S543 (sudah dites di sana).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- Fake Element: cukup mendukung closest('details') & querySelector
// sederhana ('[id^="prefix"]' / 'select[id^="prefix"]') utk kebutuhan
// fungsi yang diuji. Bukan DOM lengkap.
function makeEl({ tag, id, attrs, parent }) {
  const el = {
    tagName: tag,
    id: id || '',
    _attrs: attrs || {},
    parentNode: parent || null,
    children: [],
    style: {},
    value: '',
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; },
    scrollIntoView() {},
    closest(selector) {
      let node = this;
      while (node) {
        if (selector === 'details' && node.tagName === 'details') return node;
        node = node.parentNode;
      }
      return null;
    },
    querySelector(selector) {
      const m = /^(select)?\[id\^="([^"]+)"\]$/.exec(selector);
      if (!m) return null;
      const wantTag = m[1] || null;
      const prefix = m[2];
      const stack = [...this.children];
      while (stack.length) {
        const n = stack.shift();
        if (n.id && n.id.indexOf(prefix) === 0 && (!wantTag || n.tagName === wantTag)) return n;
        stack.push(...n.children);
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector !== '[data-linked-asset-id]') return [];
      const out = [];
      const stack = [...this.children];
      while (stack.length) {
        const n = stack.shift();
        if (Object.prototype.hasOwnProperty.call(n._attrs, 'data-linked-asset-id')) out.push(n);
        stack.push(...n.children);
      }
      return out;
    },
  };
  if (parent) parent.children.push(el);
  return el;
}

// Bangun 1 "container" (meniru 1 render #danaTitipanPortfolioList ATAU
// #danaTitipanTabList) dgn struktur persis markup _renderNow(): <details>
// membungkus <select id="titipanAssetPick_0"> + <div
// id="titipanHoldingsList_0"><row data-linked-asset-id></div>.
function makeOwnerCard({ selectValue, rowAssetId }) {
  const details = makeEl({ tag: 'details' });
  const select = makeEl({ tag: 'select', id: 'titipanAssetPick_0', parent: details });
  select.value = selectValue;
  const list = makeEl({ tag: 'div', id: 'titipanHoldingsList_0', parent: details });
  makeEl({ tag: 'div', attrs: { 'data-linked-asset-id': rowAssetId }, parent: list });
  return { details, select, list };
}

function loadPresenter() {
  const calls = [];
  const ctx = loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    {
      D: {},
      escapeHtml: (s) => String(s),
      toast: (msg) => calls.push({ kind: 'toast', msg }),
      Aset: { openOwnersModalById: (id) => calls.push({ kind: 'openAsset', id }) },
    },
    ['DanaTitipanCommitmentUI', 'DanaTitipanPortfolioPresenter'],
  );
  return { ctx, calls };
}

test('1. openAssetPorsi(el) — dgn elemen tombol, resolve select DI CONTAINER YANG SAMA walau ada id duplikat di container lain', () => {
  const { ctx, calls } = loadPresenter();
  // Container 1 ("kartu lama"): user TIDAK pernah sentuh, dropdown kosong.
  makeOwnerCard({ selectValue: '', rowAssetId: 'aX' });
  // Container 2 ("sub-tab Laporan"): user PILIH aset "a1" di sini.
  const card2 = makeOwnerCard({ selectValue: 'a1', rowAssetId: 'a1' });
  // Tombol "Atur Porsi Aset" di container 2 — inilah `$el` yang dikirim
  // data-action dispatcher (lihat features-helpers-global-security.js).
  const btn2 = makeEl({ tag: 'button', parent: card2.details });

  ctx.DanaTitipanCommitmentUI.openAssetPorsi(btn2);

  assert.equal(calls.length, 1, 'harus tepat 1 panggilan (bukan toast gagal)');
  assert.equal(calls[0].kind, 'openAsset');
  assert.equal(calls[0].id, 'a1', 'harus baca pilihan dari CONTAINER YANG SAMA dgn tombol yg diklik, bukan container lain yg kosong');
});

test('2. openAssetPorsi(el) — dropdown BENAR2 kosong di container yg diklik -> toast "Pilih aset dulu" (0 regresi perilaku)', () => {
  const { ctx, calls } = loadPresenter();
  const card = makeOwnerCard({ selectValue: '', rowAssetId: 'aX' });
  const btn = makeEl({ tag: 'button', parent: card.details });

  ctx.DanaTitipanCommitmentUI.openAssetPorsi(btn);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, 'toast');
  assert.match(calls[0].msg, /Pilih aset dulu/);
});

test('3. openAssetPorsi(i) — mode lama (angka index) TETAP jalan lewat getElementById (0 breaking change)', () => {
  const { ctx, calls } = loadPresenter();
  const el = makeEl({ tag: 'select', id: 'titipanAssetPick_0' });
  el.value = 'a7';
  const registry = { titipanAssetPick_0: el };
  ctx.document = { getElementById: (id) => registry[id] || null };
  // loadSource injects `document` as a context global if provided in D-like
  // scope? Kalau tidak, uji lewat global langsung (sesuai pola s515).
  global.document = ctx.document;
  try {
    ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  } finally {
    delete global.document;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, 'openAsset');
  assert.equal(calls[0].id, 'a7');
});

test('4. onAssetPickChange(sel) — dgn elemen select, highlight baris DI CONTAINER YANG SAMA (0 salah pasang ke container lain)', () => {
  const { ctx } = loadPresenter();
  makeOwnerCard({ selectValue: '', rowAssetId: 'aX' }); // container lain, harus TIDAK kesentuh
  const card2 = makeOwnerCard({ selectValue: 'a1', rowAssetId: 'a1' });

  ctx.DanaTitipanPortfolioPresenter.onAssetPickChange(card2.select);

  const row = card2.list.children[0];
  assert.equal(row.style.outline, '2px solid var(--accent, #4a9eff)', 'baris di container yg SAMA harus ke-highlight');
});
