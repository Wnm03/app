'use strict';
// tests/s694-laporan-kategori-click-tosource.test.js — Sesi S694 (permintaan
// user: "kategori di Laporan bisa diklik ke transaksi asal").
//
// Fix 1a — modules/finance/filter-laporan.js: showFilteredTx() dapat
// parameter opsional ke-5 `kat` — kalau diisi, transaksi scope 'laporan'
// difilter LAGI ke kategori itu, DI ATAS filter periode/tipe/dll yang sedang
// aktif (fTipe/fKat/fSub/fAcc/fMethod). Aditif murni: pemanggil lama (tanpa
// argumen ke-5, mis. akun.js/aset.js `showFilteredTx('account',...)`,
// modules-render.js dashboard `showFilteredTx('dashboard','income',...)`)
// 0 regresi karena `kat` default undefined -> guard `if(kat&&...)` skip.
//
// Fix 1b — modules/modules-render.js: tiap baris kategori di #lapKat
// (renderLaporan()) dibungkus data-action="showFilteredTx" + data-args
// escaped JSON berisi ['laporan','all','📁 <kategori>',null,'<kategori>'].
// Dites secara STRUKTURAL (regex atas source asli, pola sama
// tests/s326-click-action-pay-button.test.js) karena renderLaporan() sendiri
// punya terlalu banyak dependency berat (renderGrafik/renderLapAccList/
// renderCashflowForecast/AsetKeluarga/DanaKelolaanPresenter/dst) untuk
// dijalankan terisolasi lewat loadSource — di luar cakupan wajar 1 sesi.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, value: '', ...initial };
}

function makeCtx(D, fValues) {
  const filterEls = {
    fTipe: makeEl({ value: (fValues && fValues.tipe) || 'semua' }),
    fKat: makeEl({ value: (fValues && fValues.kat) || 'semua' }),
    fSub: makeEl({ value: (fValues && fValues.sub) || 'semua' }),
    fAcc: makeEl({ value: (fValues && fValues.acc) || 'semua' }),
    fMethod: makeEl({ value: (fValues && fValues.method) || 'semua' }),
  };
  const els = Object.assign(
    {
      filterTxTitle: makeEl(),
      filterTxSummary: makeEl(),
      filterTxOwnerSplit: null,
      filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
    },
    filterEls,
  );
  const fakeDoc = {
    getElementById: (id) => (id in els ? els[id] : null),
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const ctx = loadSource(
    ['modules/finance/filter-laporan.js'],
    {
      document: fakeDoc,
      D,
      sameId: (a, b) => String(a) === String(b),
      fmt: (n) => 'Rp' + n,
      escapeHtml: (s) => String(s),
      txHTML: (t) => `<div data-id="${t.id}"></div>`,
      openModal: () => {},
      getRange: () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31') }),
    },
    [],
  );
  return { ctx, els };
}

const D_BASE = {
  accounts: [{ id: 'acc1', name: 'BCA' }],
  transactions: [
    { id: 't1', accountId: 'acc1', type: 'expense', amount: 100000, date: '2026-08-05', category: 'Makan' },
    { id: 't2', accountId: 'acc1', type: 'expense', amount: 50000, date: '2026-08-06', category: 'Transport' },
    { id: 't3', accountId: 'acc1', type: 'income', amount: 200000, date: '2026-08-07', category: 'Makan' },
  ],
};

test('showFilteredTx(scope=laporan, kat diisi) — hanya transaksi kategori itu yang ikut (di atas filter Laporan aktif)', () => {
  const { ctx, els } = makeCtx(D_BASE);
  ctx.showFilteredTx('laporan', 'all', '📁 Makan', null, 'Makan');
  // t1 (expense Makan) + t3 (income Makan) ikut, t2 (Transport) tidak.
  assert.equal(els.filterTxSummary.textContent, '2 transaksi · Total Rp100000');
});

test('showFilteredTx(scope=laporan, kat kosong/undefined) — 0 regresi, semua kategori tetap tampil (pola lama)', () => {
  const { ctx, els } = makeCtx(D_BASE);
  ctx.showFilteredTx('laporan', 'all', 'Semua Kategori', null);
  assert.equal(els.filterTxSummary.textContent, '3 transaksi · Total Rp50000');
});

test('showFilteredTx(scope=laporan, kat + filter fTipe aktif) — kat DAN filter panel di-AND-kan, bukan saling menggantikan', () => {
  const { ctx, els } = makeCtx(D_BASE, { tipe: 'income' });
  ctx.showFilteredTx('laporan', 'all', '📁 Makan', null, 'Makan');
  // Dari 2 tx kategori Makan, hanya t3 yang type=income -> ikut filter tipe aktif juga.
  assert.equal(els.filterTxSummary.textContent, '1 transaksi · Total Rp200000');
});

test('showFilteredTx(scope!==laporan, mis. account) — parameter kat diabaikan (di luar cakupan fix, 0 dampak)', () => {
  const { ctx, els } = makeCtx(D_BASE);
  ctx.showFilteredTx('account', undefined, 'Riwayat', 'acc1', 'Makan');
  assert.equal(els.filterTxSummary.textContent, '3 transaksi · Total Rp50000', 'scope account tidak difilter kat, tetap semua tx akun tsb');
});

test('showFilteredTx() signature punya parameter ke-5 `kat` (cek struktural sumber asli)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'finance', 'filter-laporan.js'), 'utf8');
  assert.match(src, /function showFilteredTx\(scope, type, label, accId, kat\)/,
    'showFilteredTx harus punya parameter ke-5 kat');
  assert.match(src, /if\(kat&&t\.category!==kat\)return false;/,
    'scope laporan harus filter tambahan by kat kalau diisi');
});

test('#lapKat (renderLaporan(), modules/shared/modules-render-b.js) — tiap baris kategori dibungkus data-action="showFilteredTx" + data-args ke laporan/all/kat', () => {
  // AUDIT S697: SEBELUMNYA test ini membaca modules/modules-render.js --
  // file itu TERKONFIRMASI dead code (0 referensi di scripts/build.js,
  // tidak pernah ikut bundle -- lihat PATCH-README-cleanup-8-dead-files-
  // modules-render-legacy.md). Test lolos padahal fix S694 tidak pernah
  // aktif di app nyata (false positive). Ditunjuk ulang ke file yang
  // BENAR-BENAR live: modules/shared/modules-render-b.js (dimuat lewat
  // GROUP_A scripts/build.js). Fix-nya sendiri sudah dipindah ke sana di
  // sesi S697 (lihat modules/shared/modules-render-b.js).
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'modules-render-b.js'), 'utf8');
  const idx = src.indexOf("document.getElementById('lapKat').innerHTML=");
  assert.ok(idx >= 0, "blok render #lapKat tidak ditemukan");
  const block = src.slice(idx, idx + 1500);
  assert.match(block, /data-action="showFilteredTx"/,
    'baris kategori Laporan harus punya data-action="showFilteredTx"');
  assert.match(block, /data-args="\$\{escapeHtml\(JSON\.stringify\(\['laporan','all','📁 '\+k,null,k\]\)\)\}"/,
    'data-args harus JSON.stringify([\'laporan\',\'all\',\'📁 \'+k,null,k]) yang di-escapeHtml, pola sama data-args lain di file ini');
});
