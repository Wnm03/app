'use strict';
// tests/s647-togglekeufilter-class-detect.test.js — regresi BUG-009
// (TODO.md, "Filter Laporan — Sesi Audit filter-laporan.js"):
//   toggleKeuFilter() dulu deteksi status hidden panel lewat
//   panel.style.display==='none', padahal panel #keuFilterPanel
//   disembunyikan DEFAULT lewat class CSS 'u-dnone' (lihat index.html),
//   bukan inline style -- style.display kosong ('') di kondisi awal, bukan
//   'none'. Akibatnya tap PERTAMA salah baca kondisi "sudah kebuka" (show
//   dihitung false) & panel tetap tertutup -- baru tap KEDUA panel benar2
//   kebuka. Fix: deteksi lewat classList.contains('u-dnone') ||
//   getComputedStyle().display==='none'.
// Pakai fakeDom minimal (pola sama tests/worthit-numeric-guard-s403.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakePanel(initial) {
  const classes = new Set(initial.classes || []);
  return {
    style: { display: initial.display || '' },
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
    },
    _classes: classes,
  };
}

function makeCtx(panel, extra) {
  const els = Object.assign({ keuFilterPanel: panel, kfToggleBtn: null }, extra || {});
  const document = { getElementById: (id) => (id in els ? els[id] : null) };
  return loadSource(
    ['modules/finance/filter-laporan.js'],
    {
      document,
      getComputedStyle: (el) => ({ display: el.style.display || '' }),
      populateCatSelect: () => {},
      populateSubSelect: () => {},
      D: { accounts: [] },
    },
    [],
  );
}

test('toggleKeuFilter() — kondisi awal (hidden via class u-dnone, style.display kosong) langsung kebuka di TAP PERTAMA', () => {
  const panel = fakePanel({ classes: ['u-dnone'], display: '' });
  const ctx = makeCtx(panel);
  ctx.toggleKeuFilter();
  assert.equal(panel.style.display, 'block', 'tap pertama harus langsung membuka panel');
  assert.equal(panel.classList.contains('u-dnone'), false, 'class u-dnone harus dilepas saat dibuka');
});

test('toggleKeuFilter() — panel sudah terbuka (u-dnone sudah lepas, style.display=block) -> tap berikutnya menutup', () => {
  const panel = fakePanel({ classes: [], display: 'block' });
  const ctx = makeCtx(panel);
  ctx.toggleKeuFilter();
  assert.equal(panel.style.display, 'none');
});

test('toggleKeuFilter() — kondisi hidden via inline style.display=none (0 regresi jalur lama) -> tetap kebuka', () => {
  const panel = fakePanel({ classes: [], display: 'none' });
  const ctx = makeCtx(panel);
  ctx.toggleKeuFilter();
  assert.equal(panel.style.display, 'block');
});

test('toggleKeuFilter() — dua tap berturutan: buka lalu tutup (0 lagi butuh 3 tap utk siklus penuh)', () => {
  const panel = fakePanel({ classes: ['u-dnone'], display: '' });
  const ctx = makeCtx(panel);
  ctx.toggleKeuFilter();
  assert.equal(panel.style.display, 'block', 'tap 1: kebuka');
  ctx.toggleKeuFilter();
  assert.equal(panel.style.display, 'none', 'tap 2: tertutup lagi');
});

test('toggleKeuFilter() — elemen panel tidak ada -> tidak throw (guard null)', () => {
  const ctx = makeCtx(null);
  assert.doesNotThrow(() => ctx.toggleKeuFilter());
});
